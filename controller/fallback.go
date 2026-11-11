package controller

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

func GetFallbackConfig(c *gin.Context) {
	snapshot, err := service.CurrentFallbackSnapshot()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": snapshot})
}

func UpdateFallbackConfig(c *gin.Context) {
	var request struct {
		SchemaVersion int                            `json:"schema_version"`
		BaseRevision  int64                          `json:"base_revision"`
		Document      service.FallbackConfigDocument `json:"document"`
	}
	if err := c.ShouldBindJSON(&request); err != nil {
		common.ApiErrorStatus(c, http.StatusBadRequest, err)
		return
	}
	if request.SchemaVersion != service.FallbackSchemaVersion {
		common.ApiErrorStatus(c, http.StatusBadRequest, fmt.Errorf("fallback configuration schema version %d is required", service.FallbackSchemaVersion))
		return
	}
	snapshot, err := service.SaveFallbackConfig(request.BaseRevision, request.Document, c.GetInt("id"))
	if err != nil {
		if errors.Is(err, service.ErrFallbackConfigConflict) {
			common.ApiErrorStatus(c, http.StatusConflict, err)
			return
		}
		common.ApiErrorStatus(c, http.StatusBadRequest, err)
		return
	}
	recordManageAudit(c, "fallback.config.update", map[string]any{"revision": snapshot.Revision})
	c.JSON(http.StatusOK, gin.H{"success": true, "data": snapshot})
}

func GetFallbackChannelModels(c *gin.Context) {
	channelID, err := strconv.Atoi(c.Param("id"))
	if err != nil || channelID <= 0 {
		common.ApiErrorStatus(c, http.StatusBadRequest, errors.New("invalid fallback channel ID"))
		return
	}
	options, err := service.FallbackChannelModelOptions(channelID)
	if err != nil {
		common.ApiErrorStatus(c, http.StatusBadRequest, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": options})
}

func GetFallbackChannels(c *gin.Context) {
	options, err := service.FallbackChannelOptions()
	if err != nil {
		common.ApiErrorStatus(c, http.StatusBadRequest, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": options})
}
