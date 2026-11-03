package router

import (
	"bytes"
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

func testHomePageAssets(t *testing.T) *homePageAssets {
	t.Helper()
	assets := newHomePageAssets(
		[]byte(`<div class="server-home-frame" data-server-fallback="home" data-server-home-variant="loading" data-server-brand="TaoDock"><main class="server-home-loading" aria-busy="true"><img src="/logo.png" alt="" width="56" height="56" class="server-home-logo" data-server-logo="true"><p class="server-home-brand" data-fallback-brand="true">TaoDock</p><p class="server-home-message" role="status" aria-live="polite" data-fallback-i18n="Loading...">Loading...</p></main></div>`),
		[]byte(`{"en":{"Loading...":"Loading...","TaoDock":"TaoDock"},"zh":{"Loading...":"加载中...","TaoDock":"众妙之门"}}`),
	)
	require.NotNil(t, assets)
	return assets
}

func TestPublicPageMetadataBeforeJavaScript(t *testing.T) {
	index, err := os.ReadFile("../web/index.html")
	require.NoError(t, err)
	manifest, err := os.ReadFile("../web/public/page-metadata.json")
	require.NoError(t, err)
	renderer := newPublicPageMetadataRenderer(index, manifest)
	require.NotNil(t, renderer)
	catalog, err := os.ReadFile("../web/public/integration-catalog.json")
	require.NoError(t, err)
	copy, err := os.ReadFile("../web/public/integration-copy.en.json")
	require.NoError(t, err)
	integrations := newIntegrationPageContent(catalog, copy)
	require.NotNil(t, integrations)
	homeAssets := testHomePageAssets(t)
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	engine.NoRoute(func(c *gin.Context) {
		var fallback *xhtml.Node
		switch normalizePagePath(c.Request.URL.EscapedPath()) {
		case "/":
			fallback = homePageFallback(homeAssets)
		case "/integrations":
			fallback = integrationPageFallback(integrations)
		}
		page := renderer.render(c.Request.URL.EscapedPath(), fallback)
		if page == nil {
			page = index
		}
		c.Header("Cache-Control", "no-cache")
		c.Data(http.StatusOK, "text/html; charset=utf-8", page)
	})
	for _, tc := range []struct{ path, title, canonical string }{
		{"/", "TaoDock - Unified AI API Gateway for Multi-Model Chat and Image Generation", "https://taodock.com/"},
		{"/?utm_source=launch", "TaoDock - Unified AI API Gateway for Multi-Model Chat and Image Generation", "https://taodock.com/"},
		{"/pricing?search=claude", "AI Model API Pricing | 众妙之门 TaoDock", "https://taodock.com/pricing"},
		{"/pricing/", "AI Model API Pricing | 众妙之门 TaoDock", "https://taodock.com/pricing"},
		{"/pricing/?utm_source=launch", "AI Model API Pricing | 众妙之门 TaoDock", "https://taodock.com/pricing"},
		{"/integrations", "AI Client and SDK Integrations | 众妙之门 TaoDock", "https://taodock.com/integrations"},
		{"/integrations/", "AI Client and SDK Integrations | 众妙之门 TaoDock", "https://taodock.com/integrations"},
		{"/integrations/?utm_source=launch", "AI Client and SDK Integrations | 众妙之门 TaoDock", "https://taodock.com/integrations"},
		{"/about", "About the Platform | 众妙之门 TaoDock", "https://taodock.com/about"},
		{"/rankings", "Usage Rankings | 众妙之门 TaoDock", "https://taodock.com/rankings"},
		{"/privacy-policy", "Privacy Policy | 众妙之门 TaoDock", "https://taodock.com/privacy-policy"},
		{"/user-agreement", "User Agreement | 众妙之门 TaoDock", "https://taodock.com/user-agreement"},
		{"/pricing/vendor%2Fmodel", "vendor/model API Pricing and Capabilities | 众妙之门 TaoDock", "https://taodock.com/pricing/vendor%2Fmodel"},
	} {
		t.Run(tc.path, func(t *testing.T) {
			response := httptest.NewRecorder()
			engine.ServeHTTP(response, httptest.NewRequest(http.MethodGet, tc.path, nil))
			require.Equal(t, http.StatusOK, response.Code)
			body := response.Body.String()
			assert.Contains(t, body, "<title>"+tc.title+"</title>")
			assert.Contains(t, body, `property="og:title" content="`+tc.title+`"`)
			assert.Contains(t, body, `name="twitter:title" content="`+tc.title+`"`)
			assert.Contains(t, body, `rel="canonical" href="`+tc.canonical+`"`)
			assert.Equal(t, 1, strings.Count(body, `rel="canonical"`))
			assert.Contains(t, body, `property="og:url" content="`+tc.canonical+`"`)
			assert.Equal(t, 1, strings.Count(body, `property="og:url"`))
			assert.Equal(t, "no-cache", response.Header().Get("Cache-Control"))
			assert.Empty(t, response.Header().Get("X-Robots-Tag"))
			assert.NotContains(t, body, `name="robots" content="noindex`)
			assert.Contains(t, body, `id="root"`)
			assert.Contains(t, body, "localStorage.getItem")
			assert.NotContains(t, body, "{{systemName}}")
			assert.NotContains(t, body, "{{modelName}}")
			if strings.HasPrefix(tc.path, "/pricing") {
				assert.NotContains(t, body, `name="description" content="Connect apps and agents`)
			}
			if tc.path == "/" {
				assert.Contains(t, body, `data-server-home-variant="loading"`)
				assert.Contains(t, body, `class="server-home-logo"`)
				assert.Contains(t, body, `data-fallback-brand="true"`)
				assert.Contains(t, body, `data-fallback-i18n="Loading..."`)
				assert.Contains(t, body, `data-home-fallback-copy="true"`)
				assert.NotContains(t, body, `data-server-nav=`)
				assert.NotContains(t, body, `data-server-docs=`)
				assert.NotContains(t, body, `One gateway, endless AI possibilities.`)
			}
			if normalizePagePath(tc.path) == "/integrations" {
				seoDescription := "Connect Cherry Studio, WorkBuddy, Open WebUI, AionUI, DeepChat and OpenAI SDK applications to 众妙之门 TaoDock through one OpenAI-compatible API."
				assert.Contains(t, body, `name="description" content="`+seoDescription+`"`)
				assert.Contains(t, body, `property="og:description" content="`+seoDescription+`"`)
				assert.Contains(t, body, `name="twitter:description" content="`+seoDescription+`"`)
				assert.NotContains(t, body, `name="keywords"`)
				assert.Contains(t, body, `<h1>`+integrations.Copy.Title+`</h1>`)
				assert.Contains(t, body, integrations.Copy.Description)
				assert.Contains(t, body, `data-server-fallback="integrations"`)
				assert.Contains(t, body, `href="/pricing"`)
				for _, item := range integrations.Catalog {
					assert.Contains(t, body, `<h2>`+item.Name+`</h2>`)
					assert.Contains(t, body, integrations.Copy.Clients[item.ID])
					assert.Contains(t, body, `href="https://docs.taodock.com/en`+item.DocPath+`"`)
				}
			}
		})
	}

	t.Run("model names remain text", func(t *testing.T) {
		response := httptest.NewRecorder()
		engine.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/pricing/x%22%3E%3Cimg%20src=x%20onerror=alert(1)%3E", nil))
		body := response.Body.String()
		assert.Contains(t, body, html.EscapeString(`x"><img src=x onerror=alert(1)>`)+" API Pricing and Capabilities")
		assert.NotContains(t, body, `<img src=x onerror=alert(1)>`)
		assert.Equal(t, 1, strings.Count(body, `rel="canonical"`))
	})
	for _, path := range []string{"/keys", "/dashboard", "/sign-in", "/unknown", "/pricing/unknown/nested", "/pricing/" + strings.Repeat("a", 201)} {
		t.Run("fallback "+path, func(t *testing.T) {
			response := httptest.NewRecorder()
			engine.ServeHTTP(response, httptest.NewRequest(http.MethodGet, path, nil))
			assert.Equal(t, index, response.Body.Bytes())
		})
	}
}

func TestHomePageFallbackInjectsConfigurationSafely(t *testing.T) {
	assets := testHomePageAssets(t)
	assert.Nil(t, newHomePageAssets([]byte(`<main>invalid</main>`), []byte(`{"en":{"Loading...":"Loading..."}}`)))
	assert.Nil(t, newHomePageAssets(assets.template, []byte(`{`)))

	common.OptionMapRWMutex.Lock()
	optionMapWasNil := common.OptionMap == nil
	if optionMapWasNil {
		common.OptionMap = make(map[string]string)
	}
	originalSystemName := common.SystemName
	originalLogo := common.Logo
	originalHomePageContent := common.OptionMap["HomePageContent"]
	common.SystemName = `<Brand & Co>`
	common.Logo = `/custom-logo.png?mode=dark&size=2`
	common.OptionMap["HomePageContent"] = ""
	common.OptionMapRWMutex.Unlock()

	t.Cleanup(func() {
		common.OptionMapRWMutex.Lock()
		common.SystemName = originalSystemName
		common.Logo = originalLogo
		common.OptionMap["HomePageContent"] = originalHomePageContent
		if optionMapWasNil {
			common.OptionMap = nil
		}
		common.OptionMapRWMutex.Unlock()
	})

	var output bytes.Buffer
	require.NoError(t, xhtml.Render(&output, homePageFallback(assets)))
	body := output.String()
	assert.Contains(t, body, `data-server-brand="&lt;Brand &amp; Co&gt;"`)
	assert.Contains(t, body, `&lt;Brand &amp; Co&gt;`)
	assert.NotContains(t, body, `<Brand & Co>`)
	assert.Contains(t, body, `src="/custom-logo.png?mode=dark&amp;size=2"`)
	assert.Contains(t, body, `data-server-home-variant="loading"`)
	assert.NotContains(t, body, `<a`)
	assert.NotContains(t, body, `<nav`)
	assert.NotContains(t, body, `<svg`)
	assert.Contains(t, body, `data-home-fallback-copy="true"`)

	common.OptionMapRWMutex.Lock()
	common.OptionMap["HomePageContent"] = "# Custom home"
	common.OptionMapRWMutex.Unlock()
	output.Reset()
	require.NoError(t, xhtml.Render(&output, homePageFallback(assets)))
	assert.Contains(t, output.String(), `data-server-home-variant="loading"`)
	assert.Contains(t, output.String(), `class="server-home-loading"`)

	output.Reset()
	require.NoError(t, xhtml.Render(&output, homePageFallback(nil)))
	assert.Contains(t, output.String(), `data-server-home-variant="loading"`)
	assert.Contains(t, output.String(), `&lt;Brand &amp; Co&gt;`)
	assert.Contains(t, output.String(), `data-fallback-i18n="Loading..."`)
}

func TestPublicPageMetadataLegacyFrontendFallback(t *testing.T) {
	for _, manifest := range []string{"", "{", `{"origin":"javascript:alert(1)","siteName":"Custom"}`} {
		renderer := newPublicPageMetadataRenderer([]byte("legacy frontend"), []byte(manifest))
		assert.Nil(t, renderer.render("/pricing", nil))
	}
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
		"/keys", "/system-settings/security/rate-limit", "/console/chat/123", "/login",
	} {
		assert.True(t, renderer.isNoIndexRoute(path), path)
	}
	for _, path := range []string{"/", "/pricing", "/integrations", "/about", "/not-a-route", "/dashboard/overview/extra"} {
		assert.False(t, renderer.isNoIndexRoute(path), path)
	}

	page := renderPageHTML(index, "Account and console | TaoDock", "Account page", "TaoDock", "", true, nil)
	assert.Contains(t, string(page), `name="robots" content="noindex, nofollow"`)
	assert.NotContains(t, string(page), `rel="canonical"`)
	assert.NotContains(t, string(page), `property="og:url"`)

	notFound := renderPageHTML(index, "Page not found | TaoDock", "Missing", "TaoDock", "", true, notFoundFallback())
	assert.Contains(t, string(notFound), `<h1>Page not found</h1>`)
	assert.Contains(t, string(notFound), `href="/"`)
}

func TestIntegrationPageContentRejectsIncompleteAssets(t *testing.T) {
	validCopy, err := os.ReadFile("../web/public/integration-copy.en.json")
	require.NoError(t, err)
	validCatalog, err := os.ReadFile("../web/public/integration-catalog.json")
	require.NoError(t, err)
	require.NotNil(t, newIntegrationPageContent(validCatalog, validCopy))

	for _, tc := range []struct {
		name    string
		catalog string
		copy    string
	}{
		{name: "invalid catalog", catalog: `{`, copy: string(validCopy)},
		{name: "missing description", catalog: string(validCatalog), copy: `{"title":"Integrations"}`},
		{name: "unsafe docs path", catalog: `[{"id":"client","name":"Client","icon":"client","docPath":"//example.com"}]`, copy: `{"eyebrow":"Clients","title":"Integrations","description":"Description","clients":{"client":"Client description"},"stepsTitle":"Steps","steps":[{"title":"One","description":"Do it"}],"pricingLink":"Pricing","docsLink":"Guide"}`},
	} {
		t.Run(tc.name, func(t *testing.T) {
			assert.Nil(t, newIntegrationPageContent([]byte(tc.catalog), []byte(tc.copy)))
		})
	}
}

func TestPublicPricingFallbackUsesPublicBillingData(t *testing.T) {
	data := controller.PublicPricingData{
		GroupRatio: map[string]float64{"public": 0.8},
		Pricing: []model.Pricing{
			{
				ModelName: "token-model", EnableGroup: []string{"public"}, BillingMode: "tiered_expr",
				BillingExpr: `tier("standard", p * 2 + c * 10 + cr * 0.2)`, OwnerBy: "internal-channel",
			},
			{
				ModelName: "image-model", EnableGroup: []string{"public"}, BillingMode: "tiered_expr",
				BillingExpr: `tier("image", fixed(0.12))`,
			},
		},
	}

	var output bytes.Buffer
	require.NoError(t, xhtml.Render(&output, pricingPageFallback(data)))
	body := output.String()
	assert.Contains(t, body, `<h1>AI model API pricing</h1>`)
	assert.Contains(t, body, "$1.6 input / $8 output / $0.16 cache read per 1M tokens")
	assert.Contains(t, body, "$0.096 per request")
	assert.Contains(t, body, `href="/pricing/token-model"`)
	assert.NotContains(t, body, "internal-channel")
	assert.NotContains(t, body, `tier(&#34;standard&#34;`)

	output.Reset()
	require.NoError(t, xhtml.Render(&output, pricingPageFallback(controller.PublicPricingData{})))
	assert.Contains(t, output.String(), "public pricing catalog is temporarily unavailable")
	assert.Contains(t, output.String(), "No missing price is treated as free")
}
