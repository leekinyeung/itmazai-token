package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
)

type headerNavAccess struct {
	Enabled     bool
	RequireAuth bool
}

func getHeaderNavAccess(module string) headerNavAccess {
	fallback := headerNavAccess{
		Enabled:     true,
		RequireAuth: false,
	}

	common.OptionMapRWMutex.RLock()
	raw := common.OptionMap["HeaderNavModules"]
	common.OptionMapRWMutex.RUnlock()

	if strings.TrimSpace(raw) == "" {
		return fallback
	}

	var parsed map[string]any
	if err := common.Unmarshal([]byte(raw), &parsed); err != nil {
		return fallback
	}

	return parseHeaderNavAccess(parsed[module], fallback)
}

func parseHeaderNavAccess(raw any, fallback headerNavAccess) headerNavAccess {
	switch value := raw.(type) {
	case bool:
		return headerNavAccess{
			Enabled:     value,
			RequireAuth: fallback.RequireAuth,
		}
	case string:
		return headerNavAccess{
			Enabled:     parseHeaderNavBool(value, fallback.Enabled),
			RequireAuth: fallback.RequireAuth,
		}
	case float64:
		return headerNavAccess{
			Enabled:     parseHeaderNavBool(value, fallback.Enabled),
			RequireAuth: fallback.RequireAuth,
		}
	case map[string]any:
		access := fallback
		if enabled, ok := value["enabled"]; ok {
			access.Enabled = parseHeaderNavBool(enabled, fallback.Enabled)
		}
		if requireAuth, ok := value["requireAuth"]; ok {
			access.RequireAuth = parseHeaderNavBool(requireAuth, fallback.RequireAuth)
		}
		return access
	default:
		return fallback
	}
}

func parseHeaderNavBool(value any, fallback bool) bool {
	switch v := value.(type) {
	case bool:
		return v
	case string:
		switch strings.ToLower(strings.TrimSpace(v)) {
		case "true", "1":
			return true
		case "false", "0":
			return false
		default:
			return fallback
		}
	case float64:
		if v == 1 {
			return true
		}
		if v == 0 {
			return false
		}
		return fallback
	case int:
		if v == 1 {
			return true
		}
		if v == 0 {
			return false
		}
		return fallback
	default:
		return fallback
	}
}

// HeaderNavModuleIsPublic reports whether a signed-out visitor may access the
// module. Server-rendered pages use the same decision as the API middleware so
// private pricing is never copied into public HTML.
func HeaderNavModuleIsPublic(module string) bool {
	access := getHeaderNavAccess(module)
	return access.Enabled && !access.RequireAuth
}

// HeaderNavModuleIsEnabled reports whether the module should be present in
// public navigation. Authentication requirements affect click behavior, not
// whether the navigation item is visible.
func HeaderNavModuleIsEnabled(module string) bool {
	return getHeaderNavAccess(module).Enabled
}

func HeaderNavModuleAuth(module string) gin.HandlerFunc {
	return func(c *gin.Context) {
		access := getHeaderNavAccess(module)
		if !access.Enabled {
			// Keep root pricing management available without reopening the public model square.
			if module == "pricing" && c.GetHeader("Authorization") != "" {
				RootAuth()(c)
				return
			}
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"message": fmt.Sprintf("%s is disabled", module),
			})
			c.Abort()
			return
		}

		if access.RequireAuth {
			UserAuth()(c)
			return
		}

		TryUserAuth()(c)
	}
}

func HeaderNavModulePublicOrUserAuth(module string) gin.HandlerFunc {
	return func(c *gin.Context) {
		access := getHeaderNavAccess(module)
		if !access.Enabled || access.RequireAuth {
			UserAuth()(c)
			return
		}

		TryUserAuth()(c)
	}
}
