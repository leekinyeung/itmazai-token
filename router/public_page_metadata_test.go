package router

import (
	"html"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	xhtml "golang.org/x/net/html"
)

func TestPublicPageMetadataBeforeJavaScript(t *testing.T) {
	index, err := os.ReadFile("../web/index.html")
	require.NoError(t, err)
	manifest, err := os.ReadFile("../web/public/page-metadata.json")
	require.NoError(t, err)
	renderer := newPublicPageMetadataRenderer(index, manifest)
	require.NotNil(t, renderer)

	for _, tc := range []struct {
		path      string
		title     string
		canonical string
	}{
		{path: "/", title: "Unified AI API Gateway | TaoDock", canonical: "https://taodock.com/"},
		{path: "/?utm_source=launch", title: "Unified AI API Gateway | TaoDock", canonical: "https://taodock.com/"},
		{path: "/models?search=claude", title: "AI Models & API Pricing | TaoDock", canonical: "https://taodock.com/models"},
		{path: "/models/", title: "AI Models & API Pricing | TaoDock", canonical: "https://taodock.com/models"},
		{path: "/integrations", title: "AI Client and SDK Integrations | TaoDock", canonical: "https://taodock.com/integrations"},
		{path: "/about", title: "About the Platform | TaoDock", canonical: "https://taodock.com/about"},
		{path: "/rankings", title: "Usage Rankings | TaoDock", canonical: "https://taodock.com/rankings"},
		{path: "/privacy-policy", title: "Privacy Policy | TaoDock", canonical: "https://taodock.com/privacy-policy"},
		{path: "/user-agreement", title: "User Agreement | TaoDock", canonical: "https://taodock.com/user-agreement"},
		{path: "/models/vendor%2fmodel", title: "vendor/model API Pricing and Capabilities | TaoDock", canonical: "https://taodock.com/models/vendor%2Fmodel"},
		{path: "/compare", title: "AI API Gateway Comparisons | TaoDock", canonical: "https://taodock.com/compare"},
		{path: "/blog", title: "TaoDock Blog | TaoDock", canonical: "https://taodock.com/blog"},
		{path: "/blog/how-to-choose-ai-gateway", title: "How to Choose an AI Gateway in 2026: A Practical Checklist | TaoDock", canonical: "https://taodock.com/blog/how-to-choose-ai-gateway"},
		{path: "/compare/taodock-vs-openrouter", title: "TaoDock vs OpenRouter: Choosing a Unified AI API Gateway | TaoDock", canonical: "https://taodock.com/compare/taodock-vs-openrouter"},
		{path: "/integrations/openai-sdk", title: "Use the OpenAI SDK with TaoDock's Compatible API | TaoDock", canonical: "https://taodock.com/integrations/openai-sdk"},
		{path: "/faq", title: "TaoDock AI API Frequently Asked Questions | TaoDock", canonical: "https://taodock.com/faq"},
	} {
		t.Run(tc.path, func(t *testing.T) {
			requestPath, _, _ := strings.Cut(tc.path, "?")
			body := string(renderer.render(requestPath))
			require.NotEmpty(t, body)
			encodedTitle := html.EscapeString(tc.title)
			assert.Contains(t, body, "<title>"+encodedTitle+"</title>")
			assert.Contains(t, body, `property="og:title" content="`+encodedTitle+`"`)
			assert.Contains(t, body, `name="twitter:title" content="`+encodedTitle+`"`)
			assert.Contains(t, body, `property="og:site_name" content="TaoDock"`)
			assert.Contains(t, body, `rel="canonical" href="`+tc.canonical+`"`)
			assert.Equal(t, 1, strings.Count(body, `rel="canonical"`))
			assert.Contains(t, body, `property="og:url" content="`+tc.canonical+`"`)
			assert.Equal(t, 1, strings.Count(body, `property="og:url"`))
			assert.NotContains(t, body, `name="robots" content="noindex`)
			assert.NotContains(t, body, `data-server-fallback`)
			assert.NotContains(t, body, `data-client-root`)

			document, parseErr := xhtml.Parse(strings.NewReader(body))
			require.NoError(t, parseErr)
			rootFound := false
			for node := range document.Descendants() {
				if node.Type != xhtml.ElementNode || node.Data != "div" {
					continue
				}
				for _, attribute := range node.Attr {
					if attribute.Key == "id" && attribute.Val == "root" {
						rootFound = true
						assert.Nil(t, node.FirstChild)
					}
				}
			}
			assert.True(t, rootFound)
		})
	}

	for _, path := range []string{"/compare", "/blog", "/blog/how-to-choose-ai-gateway", "/compare/taodock-vs-openrouter", "/integrations/openai-sdk", "/faq"} {
		t.Run("structured data "+path, func(t *testing.T) {
			page, _, _, _, ok := renderer.publicPage(path)
			require.True(t, ok)
			require.NotEmpty(t, page.StructuredData)
			body := string(renderer.render(path))
			assert.Equal(t, len(page.StructuredData), strings.Count(body, `type="application/ld+json"`))

			document, parseErr := xhtml.Parse(strings.NewReader(body))
			require.NoError(t, parseErr)
			rendered := 0
			for node := range document.Descendants() {
				if node.Type != xhtml.ElementNode || node.Data != "script" {
					continue
				}
				typeValue := ""
				for _, attribute := range node.Attr {
					if attribute.Key == "type" {
						typeValue = attribute.Val
					}
				}
				if typeValue != "application/ld+json" {
					continue
				}
				rendered++
				require.NotNil(t, node.FirstChild)
				var decoded any
				require.NoError(t, common.Unmarshal([]byte(node.FirstChild.Data), &decoded))
			}
			assert.Equal(t, len(page.StructuredData), rendered)
		})
	}

	assert.Nil(t, renderer.render("/compare/unknown"))
	assert.Nil(t, renderer.render("/models/unknown/nested"))
}

func TestPublicPageMetadataFiltersUnsafeStructuredData(t *testing.T) {
	index, err := os.ReadFile("../web/index.html")
	require.NoError(t, err)
	renderer := &publicPageMetadataRenderer{
		Origin:   "https://taodock.com",
		SiteName: "TaoDock",
		Pages: map[string]publicPageMetadata{
			"/safe": {
				Title:       "Safe page",
				Description: "Safe description",
				StructuredData: []string{
					`{"@context":"https://schema.org","@type":"WebPage"}`,
					`{"name":"</script><script>alert(1)</script>"}`,
					`{invalid`,
				},
			},
		},
		index: index,
	}

	body := string(renderer.render("/safe"))
	assert.Equal(t, 1, strings.Count(body, `type="application/ld+json"`))
	assert.NotContains(t, body, "alert(1)")
	assert.NotContains(t, body, `data-server-fallback`)

	for _, manifest := range []string{"", "{", `{"origin":"javascript:alert(1)","siteName":"Custom"}`} {
		assert.Nil(t, newPublicPageMetadataRenderer([]byte("frontend"), []byte(manifest)))
	}
}

func TestPublicPageMetadataInjectsArticleImage(t *testing.T) {
	index, err := os.ReadFile("../web/index.html")
	require.NoError(t, err)
	renderer := &publicPageMetadataRenderer{
		Origin:   "https://taodock.com",
		SiteName: "TaoDock",
		Pages: map[string]publicPageMetadata{
			"/blog/with-image": {
				Title:       "Post with image",
				Description: "A post that carries its own cover image.",
				Image:       "https://taodock.com/images/blog/with-image.webp",
			},
			"/blog/without-image": {
				Title:       "Post without image",
				Description: "A post that falls back to the default social card.",
			},
		},
		index: index,
	}

	withImage := string(renderer.render("/blog/with-image"))
	require.NotEmpty(t, withImage)
	assert.Equal(t, 1, strings.Count(withImage, `property="og:image" content="https://taodock.com/images/blog/with-image.webp"`))
	assert.Equal(t, 1, strings.Count(withImage, `name="twitter:image" content="https://taodock.com/images/blog/with-image.webp"`))
	assert.NotContains(t, withImage, "og:image:width")
	assert.NotContains(t, withImage, "og:image:height")
	assert.NotContains(t, withImage, "og:image:type")
	assert.NotContains(t, withImage, "social-card.png")

	withoutImage := string(renderer.render("/blog/without-image"))
	require.NotEmpty(t, withoutImage)
	assert.Contains(t, withoutImage, `property="og:image" content="https://taodock.com/social-card.png"`)
	assert.Contains(t, withoutImage, `name="twitter:image" content="https://taodock.com/social-card.png"`)
	assert.Contains(t, withoutImage, `property="og:image:width" content="1200"`)
}

func TestPublicPageRouteClassification(t *testing.T) {
	index, err := os.ReadFile("../web/index.html")
	require.NoError(t, err)
	manifest, err := os.ReadFile("../web/public/page-metadata.json")
	require.NoError(t, err)
	renderer := newPublicPageMetadataRenderer(index, manifest)
	require.NotNil(t, renderer)

	for _, path := range []string{
		"/sign-in", "/register", "/forgot-password", "/oauth/github", "/dashboard/overview",
		"/keys", "/system-settings/security/rate-limit", "/admin/models/metadata", "/console/chat/123", "/login",
	} {
		assert.True(t, renderer.isNoIndexRoute(path), path)
	}
	for _, path := range []string{"/", "/models", "/integrations", "/about", "/not-a-route", "/dashboard/overview/extra"} {
		assert.False(t, renderer.isNoIndexRoute(path), path)
	}

	page := string(renderPageHTML(index, "Account and console | TaoDock", "Account page", "TaoDock", "", true))
	assert.Contains(t, page, `name="robots" content="noindex, nofollow"`)
	assert.NotContains(t, page, `rel="canonical"`)
	assert.NotContains(t, page, `property="og:url"`)
	assert.NotContains(t, page, `data-server-fallback`)
	assert.NotContains(t, page, `<main`)
}

func TestGeneratedPublicContentAssetsStayIndexableAndSafe(t *testing.T) {
	manifest, err := os.ReadFile("../web/public/page-metadata.json")
	require.NoError(t, err)
	renderer := newPublicPageMetadataRenderer([]byte("<html><head></head><body><div id=\"root\"></div></body></html>"), manifest)
	require.NotNil(t, renderer)

	// Indexable public content paths: hubs plus every published content page.
	// The sitemap URL count below derives from this list, so new content only
	// needs a new entry here.
	indexableContentPaths := []string{
		"/compare", "/blog", "/faq",
		"/blog/how-to-choose-ai-gateway",
		"/compare/taodock-vs-openrouter", "/compare/taodock-vs-litellm", "/compare/taodock-vs-portkey", "/compare/taodock-vs-requesty", "/compare/taodock-vs-siliconflow",
		"/integrations/cherry-studio", "/integrations/workbuddy", "/integrations/open-webui", "/integrations/aionui", "/integrations/deepchat", "/integrations/openai-sdk",
	}
	for _, path := range indexableContentPaths {
		page, ok := renderer.Pages[path]
		require.True(t, ok, path)
		require.NotEmpty(t, page.StructuredData, path)
		for _, value := range page.StructuredData {
			assert.True(t, validStructuredData(value), path)
		}
	}

	_, err = os.Stat("../web/public/public-content-fallback.json")
	assert.ErrorIs(t, err, os.ErrNotExist)

	sitemap, err := os.ReadFile("../web/public/sitemap.xml")
	require.NoError(t, err)
	body := string(sitemap)
	for _, path := range indexableContentPaths {
		assert.Contains(t, body, "<loc>https://taodock.com"+path+"</loc>")
	}
	assert.NotContains(t, body, "/dashboard")
	assert.NotContains(t, body, "/use-cases/")
	// 8 base pages (baseLastModified) plus every indexable content path.
	assert.Equal(t, 8+len(indexableContentPaths), strings.Count(body, "<url>"))

	feed, err := os.ReadFile("../web/public/feed.xml")
	require.NoError(t, err)
	feedBody := string(feed)
	assert.Contains(t, feedBody, `<rss version="2.0"`)
	assert.Contains(t, feedBody, `<atom:link href="https://taodock.com/feed.xml" rel="self"`)
	assert.Contains(t, feedBody, "<link>https://taodock.com/blog</link>")
}

func TestPublicModelRedirectsAvailabilityAndSitemap(t *testing.T) {
	for _, tc := range []struct {
		path     string
		query    string
		expected string
	}{
		{path: "/pricing", query: "search=claude", expected: "/models?search=claude"},
		{path: "/pricing/vendor%2fmodel", query: "tokenUnit=M", expected: "/models/vendor%2Fmodel?tokenUnit=M"},
		{path: "/models/metadata", expected: "/admin/models/metadata"},
		{path: "/models/vendors", expected: "/admin/models/vendors"},
		{path: "/models/deployments", expected: "/admin/models/deployments"},
	} {
		t.Run(tc.path, func(t *testing.T) {
			target, ok := permanentPageRedirect(tc.path, tc.query)
			require.True(t, ok)
			assert.Equal(t, tc.expected, target)
		})
	}
	_, ok := permanentPageRedirect("/models/gpt-5", "")
	assert.False(t, ok)

	pricing := controller.PublicPricingData{Pricing: []model.Pricing{{ModelName: "vendor/model"}}}
	assert.True(t, publicModelExists(pricing, "vendor/model"))
	assert.False(t, publicModelExists(pricing, "missing-model"))

	sitemap, err := renderPublicModelSitemap("https://taodock.com/", controller.PublicPricingData{
		Pricing: []model.Pricing{
			{ModelName: "vendor/model"},
			{ModelName: "Alpha model"},
			{ModelName: "vendor/model"},
			{ModelName: " "},
		},
	})
	require.NoError(t, err)
	body := string(sitemap)
	assert.True(t, strings.HasPrefix(body, `<?xml version="1.0" encoding="UTF-8"?>`))
	assert.Contains(t, body, `<loc>https://taodock.com/models/Alpha%20model</loc>`)
	assert.Contains(t, body, `<loc>https://taodock.com/models/vendor%2Fmodel</loc>`)
	assert.Equal(t, 2, strings.Count(body, "<url>"))
	assert.Less(t, strings.Index(body, "Alpha%20model"), strings.Index(body, "vendor%2Fmodel"))
}

func TestPublicModelHTTPRedirectsAndPrivateSitemap(t *testing.T) {
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	SetWebRouter(engine, WebAssets{IndexPage: []byte("<!doctype html><html><head></head><body><div id=\"root\"></div></body></html>")}, func(c *gin.Context) {
		c.Next()
	})

	for _, method := range []string{http.MethodGet, http.MethodHead} {
		for _, tc := range []struct {
			path     string
			expected string
		}{
			{path: "/pricing?search=gpt-5", expected: "/models?search=gpt-5"},
			{path: "/pricing/vendor%2fmodel?tokenUnit=M", expected: "/models/vendor%2Fmodel?tokenUnit=M"},
		} {
			response := httptest.NewRecorder()
			engine.ServeHTTP(response, httptest.NewRequest(method, tc.path, nil))
			assert.Equal(t, http.StatusMovedPermanently, response.Code)
			assert.Equal(t, tc.expected, response.Header().Get("Location"))
		}
	}

	response := httptest.NewRecorder()
	engine.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/sitemap-models.xml", nil))
	assert.Equal(t, http.StatusNotFound, response.Code)
	assert.Contains(t, response.Header().Get("Cache-Control"), "private")
	assert.Contains(t, response.Header().Get("Cache-Control"), "no-store")
	assert.Equal(t, "noindex, nofollow", response.Header().Get("X-Robots-Tag"))

	response = httptest.NewRecorder()
	engine.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/unknown", nil))
	assert.Equal(t, http.StatusNotFound, response.Code)
	assert.Equal(t, "noindex, nofollow", response.Header().Get("X-Robots-Tag"))
	assert.NotContains(t, response.Body.String(), `data-server-fallback`)
	assert.NotContains(t, response.Body.String(), `<main`)
}
