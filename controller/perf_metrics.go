package controller

import (
	"net/http"
	"slices"
	"strconv"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	perfmetrics "github.com/QuantumNous/new-api/pkg/perf_metrics"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/ratio_setting"

	"github.com/gin-gonic/gin"
	"github.com/samber/lo"
)

func GetPerfMetricsSummary(c *gin.Context) {
	hours := 24
	if rawHours := c.Query("hours"); rawHours != "" {
		if parsed, err := strconv.Atoi(rawHours); err == nil {
			hours = parsed
		}
	}

	recentModels := c.QueryArray("recent_model")
	if len(recentModels) > perfmetrics.MaxRecentModels {
		common.ApiErrorStatus(c, http.StatusBadRequest, common.NewMessage("Invalid parameters"))
		return
	}
	if c.GetInt("role") < common.RoleAdminUser {
		result := perfmetrics.SimulatedSummary(visiblePerformanceModels(c), hours, recentModels, time.Now())
		c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
		return
	}
	activeGroups := append(lo.Keys(ratio_setting.GetGroupRatioCopy()), "auto")
	result, err := perfmetrics.QuerySummaryAll(hours, activeGroups, recentModels...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

func GetPerfMetrics(c *gin.Context) {
	modelName := c.Query("model")
	if modelName == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "model is required",
		})
		return
	}

	hours := 24
	if rawHours := c.Query("hours"); rawHours != "" {
		if parsed, err := strconv.Atoi(rawHours); err == nil {
			hours = parsed
		}
	}

	params := perfmetrics.QueryParams{
		Model:         modelName,
		Group:         c.Query("group"),
		Hours:         hours,
		AllowedGroups: append(lo.Keys(ratio_setting.GetGroupRatioCopy()), "auto"),
	}
	if c.GetInt("role") < common.RoleAdminUser {
		params.AllowedGroups = visiblePerformanceModels(c)[modelName]
		result := perfmetrics.SimulatedQuery(params, time.Now())
		c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
		return
	}
	result, err := perfmetrics.Query(params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// Use the model square's catalog and group policy, never traffic-derived model
// names or group membership, to build the public performance view.
func visiblePerformanceModels(c *gin.Context) map[string][]string {
	usable := service.GetUserUsableGroups(c.GetString("group"))
	active := ratio_setting.GetGroupRatioCopy()
	models := map[string][]string{}
	for _, item := range filterPricingByUsableGroups(model.GetPricing(), usable) {
		groups := item.EnableGroup
		if slices.Contains(groups, "all") {
			groups = lo.Keys(usable)
		}
		for _, group := range groups {
			if _, ok := usable[group]; !ok {
				continue
			}
			if _, ok := active[group]; !ok && group != "auto" {
				continue
			}
			models[item.ModelName] = append(models[item.ModelName], group)
		}
	}
	return models
}
