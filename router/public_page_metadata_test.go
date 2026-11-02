package router

import (
	"html"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPublicPageMetadataBeforeJavaScript(t *testing.T) {
	index, err := os.ReadFile("../web/index.html")
	require.NoError(t, err)
	manifest, err := os.ReadFile("../web/public/page-metadata.json")
	require.NoError(t, err)
	renderer := newPublicPageMetadataRenderer(index, manifest)
	require.NotNil(t, renderer)
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	engine.NoRoute(func(c *gin.Context) {
		page := renderer.render(c.Request.URL.EscapedPath())
		if page == nil {
			page = index
		}
		c.Data(http.StatusOK, "text/html; charset=utf-8", page)
	})
	for _, tc := range []struct{ path, title, canonical string }{
		{"/", "众妙之门 TaoDock | Unified AI API for Apps and Agents", "https://taodock.com/"},
		{"/pricing?search=claude", "AI Model API Pricing | 众妙之门 TaoDock", "https://taodock.com/pricing"},
		{"/pricing/", "AI Model API Pricing | 众妙之门 TaoDock", "https://taodock.com/pricing"},
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
			assert.Contains(t, body, `id="root"`)
			assert.Contains(t, body, "localStorage.getItem")
			assert.NotContains(t, body, "{{systemName}}")
			assert.NotContains(t, body, "{{modelName}}")
			if strings.HasPrefix(tc.path, "/pricing") {
				assert.NotContains(t, body, `name="description" content="Connect apps and agents`)
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

func TestPublicPageMetadataLegacyFrontendFallback(t *testing.T) {
	for _, manifest := range []string{"", "{", `{"origin":"javascript:alert(1)","siteName":"Custom"}`} {
		renderer := newPublicPageMetadataRenderer([]byte("legacy frontend"), []byte(manifest))
		assert.Nil(t, renderer.render("/pricing"))
	}
}
