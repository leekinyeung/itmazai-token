package controller

import (
	"maps"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/ratio_setting"

	"github.com/gin-gonic/gin"
)

type PublicPricingData struct {
	Pricing      []model.Pricing
	GroupRatio   map[string]float64
	UsableGroups map[string]string
}

func filterPricingByUsableGroups(pricing []model.Pricing, usableGroup map[string]string) []model.Pricing {
	if len(pricing) == 0 {
		return pricing
	}
	if len(usableGroup) == 0 {
		return []model.Pricing{}
	}

	filtered := make([]model.Pricing, 0, len(pricing))
	for _, item := range pricing {
		if common.StringsContains(item.EnableGroup, "all") {
			filtered = append(filtered, item)
			continue
		}
		for _, group := range item.EnableGroup {
			if _, ok := usableGroup[group]; ok {
				filtered = append(filtered, item)
				break
			}
		}
	}
	return filtered
}

func pricingDataForGroup(group string) PublicPricingData {
	groupRatio := make(map[string]float64)
	maps.Copy(groupRatio, ratio_setting.GetGroupRatioCopy())
	if group != "" {
		for candidate := range groupRatio {
			if ratio, ok := ratio_setting.GetGroupGroupRatio(group, candidate); ok {
				groupRatio[candidate] = ratio
			}
		}
	}

	usableGroups := service.GetUserUsableGroups(group)
	pricing := filterPricingByUsableGroups(model.GetPricing(), usableGroups)
	for candidate := range groupRatio {
		if _, ok := usableGroups[candidate]; !ok {
			delete(groupRatio, candidate)
		}
	}

	return PublicPricingData{
		Pricing:      pricing,
		GroupRatio:   groupRatio,
		UsableGroups: usableGroups,
	}
}

// GetAnonymousPricingData returns the same public catalog and group ratios as
// GET /api/pricing for a signed-out visitor. It deliberately has no user or
// request context so server-rendered public HTML cannot enter a shared cache
// with account-specific pricing.
func GetAnonymousPricingData() PublicPricingData {
	return pricingDataForGroup("")
}

func GetPricing(c *gin.Context) {
	userId, exists := c.Get("id")
	var group string
	if exists {
		user, err := model.GetUserCache(userId.(int))
		if err == nil {
			group = user.Group
		}
	}
	pricingData := pricingDataForGroup(group)

	c.JSON(200, gin.H{
		"success":            true,
		"data":               pricingData.Pricing,
		"vendors":            model.GetVendors(),
		"group_ratio":        pricingData.GroupRatio,
		"usable_group":       pricingData.UsableGroups,
		"supported_endpoint": model.GetSupportedEndpointMap(),
		"auto_groups":        service.GetUserAutoGroup(group),
		"pricing_version":    "a42d372ccf0b5dd13ecf71203521f9d2",
	})
}

func ResetModelRatio(c *gin.Context) {
	defaultStr := ratio_setting.DefaultModelRatio2JSONString()
	err := model.UpdateOption("ModelRatio", defaultStr)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	err = ratio_setting.UpdateModelRatioByJSONString(defaultStr)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccessT(c, "Model ratios reset", nil)
}
