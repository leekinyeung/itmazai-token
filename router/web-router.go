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
	"golang.org/x/net/html"
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
	var homeAssets *homePageAssets
	if fallback, err := assets.BuildFS.ReadFile("web/dist/home-fallback.html"); err == nil {
		if customFallback, customErr := assets.BuildFS.ReadFile("web/dist/home-custom-fallback.html"); customErr == nil {
			if copy, copyErr := assets.BuildFS.ReadFile("web/dist/home-fallback-copy.json"); copyErr == nil {
				homeAssets = newHomePageAssets(fallback, customFallback, copy)
			}
		}
	}
	var integrations *integrationPageContent
	if catalog, err := assets.BuildFS.ReadFile("web/dist/integration-catalog.json"); err == nil {
		if copy, copyErr := assets.BuildFS.ReadFile("web/dist/integration-copy.en.json"); copyErr == nil {
			integrations = newIntegrationPageContent(catalog, copy)
		}
	}

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
			publicPage := false
			if pageMetadata != nil {
				_, _, _, publicPage = pageMetadata.publicPage(escapedPath)
			}
			if path == "/integrations" && integrations == nil {
				publicPage = false
			}
			pricingRestricted := publicPage && isPricingPagePath(path) && !middleware.HeaderNavModuleIsPublic("pricing")
			rankingsRestricted := publicPage && path == "/rankings" && !middleware.HeaderNavModuleIsPublic("rankings")
			if pricingRestricted {
				publicPage = false
			}
			if rankingsRestricted {
				publicPage = false
			}

			if publicPage {
				var fallback *html.Node
				switch path {
				case "/":
					fallback = homePageFallback(homeAssets)
				case "/pricing":
					fallback = pricingPageFallback(controller.GetAnonymousPricingData())
				case "/integrations":
					fallback = integrationPageFallback(integrations)
				}
				c.Header("Cache-Control", "no-cache")
				c.Data(http.StatusOK, "text/html; charset=utf-8", pageMetadata.render(escapedPath, fallback))
				return
			}

			validNoIndexRoute := pageMetadata != nil && pageMetadata.isNoIndexRoute(escapedPath)
			if pricingRestricted {
				validNoIndexRoute = true
			}
			if rankingsRestricted {
				validNoIndexRoute = true
			}
			if validNoIndexRoute {
				c.Header("Cache-Control", "private, no-store")
				c.Header("X-Robots-Tag", "noindex, nofollow")
				siteName := "TaoDock"
				if pageMetadata != nil {
					siteName = pageMetadata.SiteName
				}
				page := renderPageHTML(assets.IndexPage, "Account and console | "+siteName, "Sign in to use the TaoDock account and console features.", siteName, "", true, nil)
				c.Data(http.StatusOK, "text/html; charset=utf-8", page)
				return
			}

			c.Header("Cache-Control", "no-store")
			c.Header("X-Robots-Tag", "noindex, nofollow")
			siteName := "TaoDock"
			if pageMetadata != nil {
				siteName = pageMetadata.SiteName
			}
			page := renderPageHTML(assets.IndexPage, "Page not found | "+siteName, "The requested TaoDock page does not exist.", siteName, "", true, notFoundFallback())
			c.Data(http.StatusNotFound, "text/html; charset=utf-8", page)
		},
	)
}

func isPricingPagePath(path string) bool {
	return path == "/pricing" || strings.HasPrefix(path, "/pricing/")
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
