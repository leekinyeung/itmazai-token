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
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	xhtml "golang.org/x/net/html"
)

func testHomePageAssets(t *testing.T) *homePageAssets {
	t.Helper()
	assets := newHomePageAssets(
		[]byte(`<div class="server-home-frame" data-server-fallback="home" data-server-home-variant="default" data-server-brand="TaoDock"><header><img src="/logo.png" data-server-logo="true"><a href="/" data-server-nav="home">Home</a><a href="/models" data-server-nav="pricing">Pricing</a><a href="__DOCS__" data-server-nav="docs" data-server-docs="true">Docs</a></header><main class="home-main"><section class="home-hero"><h1 data-fallback-i18n="One gateway, endless AI possibilities.">One gateway, endless AI possibilities.</h1><p data-fallback-i18n="Connect leading models through {{brand}}." data-fallback-brand-value="true">Connect leading models through TaoDock.</p><svg><image href="/logo.png" data-server-logo="true"></image></svg></section><section class="home-live"><code data-server-api-base="true">__API_BASE__</code><span data-server-api-models-url="true">__API_BASE__/models</span></section><section class="home-ecosystem"></section><section class="home-capabilities"></section><section class="home-setup"></section><section class="home-cta"><span data-fallback-brand="true">TaoDock</span></section></main><footer></footer></div>`),
		[]byte(`<div class="server-home-frame" data-server-fallback="home" data-server-home-variant="custom" data-server-brand="TaoDock"><main class="server-home-loading" aria-busy="true"><div data-server-home-bloom="true"></div><img src="/logo.png" data-server-logo="true"><p data-fallback-brand="true">TaoDock</p><p data-fallback-i18n="Loading...">Loading...</p></main></div>`),
		[]byte(`{"en":{"One gateway, endless AI possibilities.":"One gateway, endless AI possibilities.","Connect leading models through {{brand}}.":"Connect leading models through {{brand}}.","Loading...":"Loading...","TaoDock":"TaoDock"},"zh":{"One gateway, endless AI possibilities.":"一个网关，无限 AI 可能。","Connect leading models through {{brand}}.":"通过 {{brand}} 连接领先模型。","Loading...":"加载中...","TaoDock":"众妙之门"}}`),
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
	contentManifestJSON, err := os.ReadFile("../web/public/public-content-fallback.json")
	require.NoError(t, err)
	publicContent := newPublicContentManifest(contentManifestJSON)
	require.NotNil(t, publicContent)
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
		{"/", "Unified AI API Gateway | TaoDock", "https://taodock.com/"},
		{"/?utm_source=launch", "Unified AI API Gateway | TaoDock", "https://taodock.com/"},
		{"/models?search=claude", "AI Models & API Pricing | TaoDock", "https://taodock.com/models"},
		{"/models/", "AI Models & API Pricing | TaoDock", "https://taodock.com/models"},
		{"/models/?utm_source=launch", "AI Models & API Pricing | TaoDock", "https://taodock.com/models"},
		{"/integrations", "AI Client and SDK Integrations | TaoDock", "https://taodock.com/integrations"},
		{"/integrations/", "AI Client and SDK Integrations | TaoDock", "https://taodock.com/integrations"},
		{"/integrations/?utm_source=launch", "AI Client and SDK Integrations | TaoDock", "https://taodock.com/integrations"},
		{"/about", "About the Platform | TaoDock", "https://taodock.com/about"},
		{"/rankings", "Usage Rankings | TaoDock", "https://taodock.com/rankings"},
		{"/privacy-policy", "Privacy Policy | TaoDock", "https://taodock.com/privacy-policy"},
		{"/user-agreement", "User Agreement | TaoDock", "https://taodock.com/user-agreement"},
		{"/models/vendor%2fmodel", "vendor/model API Pricing and Capabilities | TaoDock", "https://taodock.com/models/vendor%2Fmodel"},
	} {
		t.Run(tc.path, func(t *testing.T) {
			response := httptest.NewRecorder()
			engine.ServeHTTP(response, httptest.NewRequest(http.MethodGet, tc.path, nil))
			require.Equal(t, http.StatusOK, response.Code)
			body := response.Body.String()
			encodedTitle := html.EscapeString(tc.title)
			assert.Contains(t, body, "<title>"+encodedTitle+"</title>")
			assert.Contains(t, body, `property="og:title" content="`+encodedTitle+`"`)
			assert.Contains(t, body, `name="twitter:title" content="`+encodedTitle+`"`)
			assert.Contains(t, body, `property="og:site_name" content="TaoDock"`)
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
			if strings.HasPrefix(tc.path, "/models") {
				assert.NotContains(t, body, `name="description" content="Connect apps and agents`)
			}
			if tc.path == "/" {
				homeDescription := "Connect leading AI models through one familiar API, from your first prototype to your next production release."
				assert.Contains(t, body, `name="description" content="`+homeDescription+`"`)
				assert.Contains(t, body, `property="og:description" content="`+homeDescription+`"`)
				assert.Contains(t, body, `name="twitter:description" content="`+homeDescription+`"`)
				assert.Contains(t, body, `data-server-home-variant="default"`)
				assert.Contains(t, body, `class="home-hero"`)
				assert.Contains(t, body, `class="home-live"`)
				assert.Contains(t, body, `class="home-ecosystem"`)
				assert.Contains(t, body, `class="home-capabilities"`)
				assert.Contains(t, body, `class="home-setup"`)
				assert.Contains(t, body, `class="home-cta"`)
				assert.Contains(t, body, `One gateway, endless AI possibilities.`)
				assert.Contains(t, body, `data-home-fallback-copy="true"`)
				assert.NotContains(t, body, `data-fallback-i18n="Loading..."`)
			}
			if normalizePagePath(tc.path) == "/integrations" {
				seoDescription := "Connect Cherry Studio, WorkBuddy, Open WebUI, AionUI, DeepChat and OpenAI SDK applications to TaoDock through one OpenAI-compatible API."
				assert.Contains(t, body, `name="description" content="`+seoDescription+`"`)
				assert.Contains(t, body, `property="og:description" content="`+seoDescription+`"`)
				assert.Contains(t, body, `name="twitter:description" content="`+seoDescription+`"`)
				assert.NotContains(t, body, `name="keywords"`)
				assert.Contains(t, body, `<h1>`+integrations.Copy.Title+`</h1>`)
				assert.Contains(t, body, integrations.Copy.Description)
				assert.Contains(t, body, `data-server-fallback="integrations"`)
				assert.Contains(t, body, `href="/models"`)
				for _, item := range integrations.Catalog {
					assert.Contains(t, body, `<h2>`+item.Name+`</h2>`)
					assert.Contains(t, body, integrations.Copy.Clients[item.ID])
					assert.Contains(t, body, `href="/integrations/`+item.ID+`"`)
					assert.Contains(t, body, `href="https://docs.taodock.com/en`+item.DocPath+`"`)
				}
			}
		})
	}

	t.Run("model names remain text", func(t *testing.T) {
		response := httptest.NewRecorder()
		engine.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/models/x%22%3E%3Cimg%20src=x%20onerror=alert(1)%3E", nil))
		body := response.Body.String()
		assert.Contains(t, body, html.EscapeString(`x"><img src=x onerror=alert(1)>`)+" API Pricing and Capabilities")
		assert.NotContains(t, body, `<img src=x onerror=alert(1)>`)
		assert.Equal(t, 1, strings.Count(body, `rel="canonical"`))
	})
	for _, path := range []string{"/keys", "/dashboard", "/sign-in", "/unknown", "/models/unknown/nested", "/models/" + strings.Repeat("a", 201)} {
		t.Run("fallback "+path, func(t *testing.T) {
			response := httptest.NewRecorder()
			engine.ServeHTTP(response, httptest.NewRequest(http.MethodGet, path, nil))
			assert.Equal(t, index, response.Body.Bytes())
		})
	}

	for _, tc := range []struct {
		path, title, body string
	}{
		{"/compare", "AI API Gateway Comparisons | TaoDock", "Comparison guides"},
		{"/compare/taodock-vs-openrouter", "TaoDock vs OpenRouter: Choosing a Unified AI API Gateway | TaoDock", "Decision matrix"},
		{"/integrations/openai-sdk", "Use the OpenAI SDK with TaoDock's Compatible API | TaoDock", "Python configuration"},
		{"/faq", "TaoDock AI API Frequently Asked Questions | TaoDock", "Accounts and access"},
	} {
		t.Run("content "+tc.path, func(t *testing.T) {
			fallback, structuredData, ok := publicContent.page(tc.path)
			require.True(t, ok)
			page := renderer.render(tc.path+"/", fallback, structuredData...)
			require.NotNil(t, page)
			body := string(page)
			assert.Contains(t, body, `<html lang="en">`)
			assert.Contains(t, body, `<title>`+html.EscapeString(tc.title)+`</title>`)
			assert.Contains(t, body, tc.body)
			assert.Contains(t, body, `data-server-fallback="public-content"`)
			assert.Contains(t, body, `rel="canonical" href="https://taodock.com`+tc.path+`"`)
			assert.Equal(t, 1, strings.Count(body, `rel="canonical"`))
			assert.Equal(t, len(structuredData), strings.Count(body, `type="application/ld+json"`))
			assert.Contains(t, body, `property="article:modified_time"`)
			document, err := xhtml.Parse(strings.NewReader(body))
			require.NoError(t, err)
			renderedStructuredData := 0
			for node := range document.Descendants() {
				if node.Type != xhtml.ElementNode || node.Data != "script" || attribute(node, "type") != "application/ld+json" {
					continue
				}
				renderedStructuredData++
				require.NotNil(t, node.FirstChild)
				var decoded any
				require.NoError(t, common.Unmarshal([]byte(node.FirstChild.Data), &decoded))
			}
			assert.Equal(t, len(structuredData), renderedStructuredData)
		})
	}
	_, _, found := publicContent.page("/compare/unknown")
	assert.False(t, found)
	assert.Nil(t, renderer.render("/compare/unknown", nil))
}

func TestHomePageFallbackInjectsConfigurationSafely(t *testing.T) {
	assets := testHomePageAssets(t)
	assert.Nil(t, newHomePageAssets(
		[]byte(`<main>invalid</main>`),
		assets.customTemplate,
		[]byte(`{"en":{"Loading...":"Loading..."}}`),
	))
	assert.Nil(t, newHomePageAssets(
		assets.defaultTemplate,
		[]byte(`<main>invalid</main>`),
		[]byte(`{"en":{"Loading...":"Loading..."}}`),
	))
	assert.Nil(t, newHomePageAssets(assets.defaultTemplate, assets.customTemplate, []byte(`{`)))

	settings := operation_setting.GetGeneralSetting()
	originalDocsLink := settings.DocsLink
	originalServerAddress := system_setting.ServerAddress

	common.OptionMapRWMutex.Lock()
	optionMapWasNil := common.OptionMap == nil
	if optionMapWasNil {
		common.OptionMap = make(map[string]string)
	}
	originalSystemName := common.SystemName
	originalLogo := common.Logo
	originalHomePageContent := common.OptionMap["HomePageContent"]
	originalHeaderNavModules := common.OptionMap["HeaderNavModules"]
	common.SystemName = `<Brand & Co>`
	common.Logo = `/custom-logo.png?mode=dark&size=2`
	common.OptionMap["HomePageContent"] = ""
	common.OptionMap["HeaderNavModules"] = `{"home":true,"pricing":false,"docs":true}`
	common.OptionMapRWMutex.Unlock()
	settings.DocsLink = `https://docs.example.test/start?from=home&lang=zh`
	system_setting.ServerAddress = `https://api.example.test/root/v1/`

	t.Cleanup(func() {
		settings.DocsLink = originalDocsLink
		system_setting.ServerAddress = originalServerAddress
		common.OptionMapRWMutex.Lock()
		common.SystemName = originalSystemName
		common.Logo = originalLogo
		common.OptionMap["HomePageContent"] = originalHomePageContent
		common.OptionMap["HeaderNavModules"] = originalHeaderNavModules
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
	assert.Contains(t, body, `href="/custom-logo.png?mode=dark&amp;size=2"`)
	assert.Contains(t, body, `data-server-home-variant="default"`)
	assert.Contains(t, body, `Connect leading models through &lt;Brand &amp; Co&gt;.`)
	assert.Contains(t, body, `href="https://docs.example.test/start?from=home&amp;lang=zh"`)
	assert.Contains(t, body, `>https://api.example.test/root/v1</code>`)
	assert.Contains(t, body, `>https://api.example.test/root/v1/models</span>`)
	assert.Contains(t, body, `data-server-nav="home"`)
	assert.Contains(t, body, `href="/"`)
	assert.NotContains(t, body, `href="/models"`)
	assert.Contains(t, body, `data-home-fallback-copy="true"`)

	common.OptionMapRWMutex.Lock()
	common.OptionMap["HomePageContent"] = "# Custom home"
	common.OptionMapRWMutex.Unlock()
	output.Reset()
	require.NoError(t, xhtml.Render(&output, homePageFallback(assets)))
	assert.Contains(t, output.String(), `data-server-home-variant="custom"`)
	assert.Contains(t, output.String(), `class="server-home-loading"`)
	assert.Contains(t, output.String(), `data-fallback-i18n="Loading..."`)
	assert.NotContains(t, output.String(), `class="home-main"`)

	output.Reset()
	require.NoError(t, xhtml.Render(&output, homePageFallback(nil)))
	assert.Contains(t, output.String(), `data-server-home-variant="custom"`)
	assert.Contains(t, output.String(), `data-server-home-bloom="true"`)
	assert.Equal(t, 3, strings.Count(output.String(), `class="server-home-orbit `))
	assert.Contains(t, output.String(), `&lt;Brand &amp; Co&gt;`)
	assert.Contains(t, output.String(), `data-fallback-i18n="Loading..."`)

	common.OptionMapRWMutex.Lock()
	common.OptionMap["HomePageContent"] = ""
	common.OptionMapRWMutex.Unlock()
	output.Reset()
	require.NoError(t, xhtml.Render(&output, homePageFallback(nil)))
	assert.Contains(t, output.String(), `data-server-home-variant="loading"`)
}

func TestHomePageFallbackRejectsUnsafePublicURLs(t *testing.T) {
	assert.Equal(t, "https://docs.taodock.com", safeHomeDocsLink("javascript:alert(1)"))
	assert.Equal(t, "https://docs.taodock.com", safeHomeDocsLink("//evil.example"))
	assert.Equal(t, "/docs", safeHomeDocsLink("/docs"))
	assert.Equal(t, "https://docs.example/path", safeHomeDocsLink("https://docs.example/path"))

	assert.Equal(t, "/v1", homeAPIBaseURL("javascript:alert(1)"))
	assert.Equal(t, "/v1", homeAPIBaseURL("https://user:secret@api.example"))
	assert.Equal(t, "https://api.example/v1", homeAPIBaseURL("https://api.example/v1/"))
}

func TestPublicPageMetadataLegacyFrontendFallback(t *testing.T) {
	for _, manifest := range []string{"", "{", `{"origin":"javascript:alert(1)","siteName":"Custom"}`} {
		renderer := newPublicPageMetadataRenderer([]byte("legacy frontend"), []byte(manifest))
		assert.Nil(t, renderer.render("/models", nil))
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
		"/keys", "/system-settings/security/rate-limit", "/admin/models/metadata", "/console/chat/123", "/login",
	} {
		assert.True(t, renderer.isNoIndexRoute(path), path)
	}
	for _, path := range []string{"/", "/models", "/integrations", "/about", "/not-a-route", "/dashboard/overview/extra"} {
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

func TestGeneratedPublicContentAssetsStayIndexableAndSafe(t *testing.T) {
	manifest, err := os.ReadFile("../web/public/public-content-fallback.json")
	require.NoError(t, err)
	require.NotNil(t, newPublicContentManifest(manifest))
	assert.Nil(t, newPublicContentManifest([]byte(`{"version":1,"pages":{"/compare":{"html":"<main data-server-fallback='public-content'><script>alert(1)</script></main>","structuredData":[]}}}`)))
	assert.Nil(t, newPublicContentManifest([]byte(`{"version":1,"pages":{"/compare":{"html":"<main data-server-fallback='public-content'><h1>Compare</h1></main>","structuredData":["{invalid"]}}}`)))
	assert.Nil(t, newPublicContentManifest([]byte(`{"version":1}`)))
	assert.Nil(t, newPublicContentManifest([]byte(`{"version":2}`)))
	assert.Nil(t, newPublicContentManifest([]byte(`{"pages":{}}`)))
	assert.Nil(t, newPublicContentManifest([]byte(`{"version":1,"pages":{}}`)))
	assert.Nil(t, newPublicContentManifest([]byte(`not json`)))
	assert.Nil(t, newPublicContentManifest([]byte(`{"version":1,"pages":{"/unknown":{"html":"invalid","structuredData":[]}}}`)))

	sitemap, err := os.ReadFile("../web/public/sitemap.xml")
	require.NoError(t, err)
	body := string(sitemap)
	for _, path := range []string{
		"/compare", "/faq",
		"/compare/taodock-vs-openrouter", "/compare/taodock-vs-litellm", "/compare/taodock-vs-portkey", "/compare/taodock-vs-requesty", "/compare/taodock-vs-siliconflow",
		"/integrations/cherry-studio", "/integrations/workbuddy", "/integrations/open-webui", "/integrations/aionui", "/integrations/deepchat", "/integrations/openai-sdk",
	} {
		assert.Contains(t, body, "<loc>https://taodock.com"+path+"</loc>")
	}
	assert.NotContains(t, body, "/dashboard")
	assert.NotContains(t, body, "/blog/")
	assert.NotContains(t, body, "/use-cases/")
	assert.Equal(t, 21, strings.Count(body, "<url>"))
}

func TestPublicModelFallbackUsesPublicBillingData(t *testing.T) {
	data := controller.PublicPricingData{
		GroupRatio: map[string]float64{"public": 0.8},
		Vendors:    []model.PricingVendor{{ID: 7, Name: "Example AI"}},
		Pricing: []model.Pricing{
			{
				ModelName: "token-model", EnableGroup: []string{"public"}, BillingMode: "tiered_expr",
				BillingExpr: `tier("standard", p * 2 + c * 10 + cr * 0.2)`, OwnerBy: "internal-channel",
				Description: "A model for public catalog tests.", VendorID: 7,
				SupportedEndpointTypes: []constant.EndpointType{constant.EndpointTypeOpenAI},
			},
			{
				ModelName: "image-model", EnableGroup: []string{"public"}, BillingMode: "tiered_expr",
				BillingExpr: `tier("image", fixed(0.12))`,
			},
		},
	}

	var output bytes.Buffer
	require.NoError(t, xhtml.Render(&output, modelsPageFallback(data)))
	body := output.String()
	assert.Contains(t, body, `<h1>AI Models &amp; API Pricing</h1>`)
	assert.Contains(t, body, `<h2>Example AI<span class="server-fallback__count">1 model</span></h2>`)
	assert.Contains(t, body, `<dt>Input / 1M</dt><dd>$1.6</dd>`)
	assert.Contains(t, body, `<dt>Output / 1M</dt><dd>$8</dd>`)
	assert.Contains(t, body, `<dt>Cache read</dt><dd>$0.16</dd>`)
	assert.Contains(t, body, `<dt>Per request</dt><dd>$0.096</dd>`)
	assert.Contains(t, body, `href="/models/token-model"`)
	assert.Contains(t, body, "A model for public catalog tests.")
	assert.Contains(t, body, "openai")
	assert.NotContains(t, body, "internal-channel")
	assert.NotContains(t, body, `tier(&#34;standard&#34;`)

	output.Reset()
	require.NoError(t, xhtml.Render(&output, modelsPageFallback(controller.PublicPricingData{})))
	assert.Contains(t, output.String(), "public pricing catalog is temporarily unavailable")
	assert.Contains(t, output.String(), "No missing price is treated as free")

	item, found := publicModelByName(data, "token-model")
	require.True(t, found)
	output.Reset()
	require.NoError(t, xhtml.Render(&output, publicModelPageFallback(data, item)))
	body = output.String()
	assert.Contains(t, body, `<h1>token-model API Pricing</h1>`)
	assert.Contains(t, body, "A model for public catalog tests.")
	assert.Contains(t, body, "$1.6 input / $8 output / $0.16 cache read per 1M tokens")
	assert.Contains(t, body, "Provider: Example AI")
	assert.NotContains(t, body, "internal-channel")
	assert.NotContains(t, body, `tier(&#34;standard&#34;`)
	_, found = publicModelByName(data, "missing-model")
	assert.False(t, found)
}

func TestPublicModelRedirectsAndSitemap(t *testing.T) {
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
}
