package controller

import (
	"net/http"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

func GetRankings(c *gin.Context) {
	period := c.DefaultQuery("period", "week")
	var result *service.RankingsResponse
	var err error
	if c.GetInt("role") >= common.RoleAdminUser {
		result, err = service.GetRankingsSnapshot(period)
	} else {
		group := common.GetContextKeyString(c, constant.ContextKeyUserGroup)
		if group == "" {
			group = "default"
		}
		catalog := pricingDataForGroup(group)
		result, err = service.SimulatedRankingsSnapshot(period, catalog.Pricing, catalog.Vendors, time.Now())
	}
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
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
