package router

import (
	"embed"
	"net/http"
	pathpkg "path"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
)

// WebAssets holds the embedded dashboard frontend assets.
type WebAssets struct {
	BuildFS   embed.FS
	IndexPage []byte
}

func SetWebRouter(router *gin.Engine, assets WebAssets, pluginDispatcher gin.HandlerFunc) {
	frontendFS := common.EmbedFolder(assets.BuildFS, "web/dist")
	compress := gzip.Gzip(gzip.DefaultCompression)
	var pageMetadata *publicPageMetadataRenderer
	if manifest, err := assets.BuildFS.ReadFile("web/dist/page-metadata.json"); err == nil {
		pageMetadata = newPublicPageMetadataRenderer(assets.IndexPage, manifest)
	}
	router.GET(
		"/sitemap-models.xml",
		middleware.RouteTag("web"),
		compress,
		middleware.AccessTokenAudit(),
		middleware.GlobalWebRateLimit(frontendFS),
		func(c *gin.Context) {
			if pageMetadata == nil || !middleware.HeaderNavModuleIsPublic("pricing") {
				c.Header("Cache-Control", "private, no-store")
				c.Header("X-Robots-Tag", "noindex, nofollow")
				controller.RelayNotFound(c)
				return
			}
			body, err := renderPublicModelSitemap(pageMetadata.Origin, controller.GetAnonymousPricingData())
			if err != nil {
				c.Header("Cache-Control", "no-store")
				c.Status(http.StatusInternalServerError)
				return
			}
			c.Header("Cache-Control", "public, max-age=300")
			c.Data(http.StatusOK, "application/xml; charset=utf-8", body)
		},
	)

	router.NoRoute(
		pluginDispatcher,
		middleware.RouteTag("web"),
		func(c *gin.Context) {
			// ServeFrontendFiles sends build files already compressed.
			if !frontendFS.Exists("/", c.Request.URL.Path) {
				compress(c)
			}
		},
		middleware.AccessTokenAudit(),
		middleware.GlobalWebRateLimit(frontendFS),
		middleware.Cache(),
		middleware.ServeFrontendFiles(frontendFS),
		func(c *gin.Context) {
			requestPath := c.Request.URL.Path
			if (c.Request.Method != http.MethodGet && c.Request.Method != http.MethodHead) || isAPIOrAssetPath(requestPath) {
				controller.RelayNotFound(c)
				return
			}

			escapedPath := c.Request.URL.EscapedPath()
			path := normalizePagePath(escapedPath)
			if target, ok := permanentPageRedirect(path, c.Request.URL.RawQuery); ok {
				c.Redirect(http.StatusMovedPermanently, target)
				return
			}
			publicPage := false
			if pageMetadata != nil {
				_, _, _, _, publicPage = pageMetadata.publicPage(escapedPath)
			}
			if publicPage && strings.HasPrefix(path, "/models/") {
				modelName, ok := publicModelNameFromPath(path)
				if !ok {
					publicPage = false
				} else {
					publicPage = publicModelExists(controller.GetAnonymousPricingData(), modelName)
				}
			}
			modelsRestricted := publicPage && isModelsPagePath(path) && !middleware.HeaderNavModuleIsPublic("pricing")
			rankingsRestricted := publicPage && path == "/rankings" && !middleware.HeaderNavModuleIsPublic("rankings")
			blogRestricted := publicPage && isBlogPagePath(path) && !middleware.HeaderNavModuleIsPublic("blog")
			if modelsRestricted {
				publicPage = false
			}
			if rankingsRestricted {
				publicPage = false
			}
			if blogRestricted {
				publicPage = false
			}

			if publicPage {
				c.Header("Cache-Control", "no-cache")
				c.Data(http.StatusOK, "text/html; charset=utf-8", pageMetadata.render(escapedPath))
				return
			}

			validNoIndexRoute := pageMetadata != nil && pageMetadata.isNoIndexRoute(escapedPath)
			if modelsRestricted {
				validNoIndexRoute = true
			}
			if rankingsRestricted {
				validNoIndexRoute = true
			}
			if blogRestricted {
				validNoIndexRoute = true
			}
			if validNoIndexRoute {
				c.Header("Cache-Control", "private, no-store")
				c.Header("X-Robots-Tag", "noindex, nofollow")
				siteName := "Taodock"
				if pageMetadata != nil {
					siteName = pageMetadata.SiteName
				}
				page := renderPageHTML(assets.IndexPage, "Account and console | "+siteName, "Sign in to use the Taodock account and console features.", siteName, "", true)
				c.Data(http.StatusOK, "text/html; charset=utf-8", page)
				return
			}

			c.Header("Cache-Control", "no-store")
			c.Header("X-Robots-Tag", "noindex, nofollow")
			siteName := "Taodock"
			if pageMetadata != nil {
				siteName = pageMetadata.SiteName
			}
			page := renderPageHTML(assets.IndexPage, "Page not found | "+siteName, "The requested Taodock page does not exist.", siteName, "", true)
			c.Data(http.StatusNotFound, "text/html; charset=utf-8", page)
		},
	)
}

func permanentPageRedirect(path, rawQuery string) (string, bool) {
	var target string
	if path == "/pricing" {
		target = "/models"
	}
	if suffix, ok := strings.CutPrefix(path, "/pricing/"); target == "" && ok && suffix != "" {
		if modelName, valid := publicModelNameFromPath("/models/" + suffix); valid {
			target = "/models/" + escapePathSegment(modelName)
		}
	}
	if target == "" {
		switch path {
		case "/models/metadata":
			target = "/admin/models/metadata"
		case "/models/vendors":
			target = "/admin/models/vendors"
		case "/models/deployments":
			target = "/admin/models/deployments"
		}
	}
	if target == "" {
		return "", false
	}
	if rawQuery != "" {
		target += "?" + rawQuery
	}
	return target, true
}

func isModelsPagePath(path string) bool {
	return path == "/models" || strings.HasPrefix(path, "/models/")
}

func isBlogPagePath(path string) bool {
	return path == "/blog" || strings.HasPrefix(path, "/blog/")
}

func publicModelExists(data controller.PublicPricingData, name string) bool {
	for _, item := range data.Pricing {
		if item.ModelName == name {
			return true
		}
	}
	return false
}

func isAPIOrAssetPath(requestPath string) bool {
	for _, prefix := range []string{"/api", "/v1", "/v1beta", "/pg", "/mj", "/assets", "/static", "/dashboard/billing"} {
		if requestPath == prefix || strings.HasPrefix(requestPath, prefix+"/") {
			return true
		}
	}
	parts := strings.Split(strings.Trim(requestPath, "/"), "/")
	if len(parts) > 1 && parts[1] == "mj" {
		return true
	}
	switch strings.ToLower(pathpkg.Ext(requestPath)) {
	case ".avif", ".css", ".gif", ".ico", ".jpeg", ".jpg", ".js", ".json", ".map", ".mjs", ".mp3", ".mp4", ".ogg", ".otf", ".pdf", ".png", ".svg", ".txt", ".wasm", ".webmanifest", ".webm", ".webp", ".woff", ".woff2", ".xml":
		return true
	default:
		return false
	}
}
