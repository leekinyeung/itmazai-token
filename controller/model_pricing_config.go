package controller

import (
	"errors"
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

func GetModelPricingConfig(c *gin.Context) {
	snapshot, err := model.GetModelPricingSnapshot(c.QueryArray("model"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, snapshot)
}

func PreviewModelPricingConversion(c *gin.Context) {
	var request struct {
		ModelName string              `json:"model_name"`
		Pricing   model.PricingValues `json:"pricing"`
	}
	if err := common.DecodeJson(c.Request.Body, &request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}
	preview, err := model.PreviewModelPricingConversion(request.ModelName, request.Pricing)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, preview)
}

func PreviewModelPricing(c *gin.Context) {
	var request struct {
		ModelName string              `json:"model_name"`
		Pricing   model.PricingValues `json:"pricing"`
	}
	if err := common.DecodeJson(c.Request.Body, &request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}
	preview, err := model.PreviewModelPricing(request.ModelName, request.Pricing)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, model.ModelPricingDescription{
		Effective:      preview,
		CacheWriteMode: model.ResolveCacheWriteMode(request.ModelName, request.Pricing),
		BillingDetails: model.ResolveLegacyBillingDetails(request.ModelName, preview, request.Pricing),
	})
}

func UpdateModelPricingConfig(c *gin.Context) {
	var request struct {
		Changes []model.ModelPricingChange `json:"changes"`
	}
	if err := common.DecodeJson(c.Request.Body, &request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}
	names := make([]string, 0, len(request.Changes))
	for _, change := range request.Changes {
		names = append(names, change.ModelName)
	}
	before, err := model.GetModelPricingSnapshot(names)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.UpdateModelPricing(request.Changes); err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, model.ErrModelPricingConflict) {
			status = http.StatusConflict
		}
		c.JSON(status, gin.H{"success": false, "message": err.Error()})
		return
	}
	after, err := model.GetModelPricingSnapshot(names)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	beforeDiscount := make(map[string]any, len(before.Entries))
	for _, entry := range before.Entries {
		beforeDiscount[entry.ModelName] = entry.Effective["ModelDiscount"]
	}
	afterDiscount := make(map[string]any, len(after.Entries))
	for _, entry := range after.Entries {
		afterDiscount[entry.ModelName] = entry.Effective["ModelDiscount"]
	}
	recordManageAudit(c, "model.pricing.update", map[string]any{
		"models":                names,
		"model_discount_before": beforeDiscount,
		"model_discount_after":  afterDiscount,
	})
	common.ApiSuccess(c, gin.H{"updated_models": names})
}
