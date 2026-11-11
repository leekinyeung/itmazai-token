package router

import (
	"net/http"

	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/QuantumNous/new-api/service/authz"
	"github.com/gin-gonic/gin"
)

func registerFallbackRouter(apiRouter *gin.RouterGroup) {
	fallbackRoute := apiRouter.Group("/fallback")
	fallbackRoute.Use(middleware.DisableCache(), middleware.AdminAuth())

	for _, route := range fallbackPermissionRoutes {
		handlePermissionRoute(fallbackRoute, route.method, route.path, route.permission, route.handler)
	}
}

var fallbackPermissionRoutes = []permissionRoute{
	{method: http.MethodGet, path: "/config", permission: authz.FallbackPolicyRead, handler: controller.GetFallbackConfig},
	{method: http.MethodPut, path: "/config", permission: authz.FallbackPolicyWrite, handler: controller.UpdateFallbackConfig},
	{method: http.MethodGet, path: "/channels", permission: authz.FallbackPolicyRead, handler: controller.GetFallbackChannels},
	{method: http.MethodGet, path: "/channels/:id/models", permission: authz.FallbackPolicyRead, handler: controller.GetFallbackChannelModels},
}
