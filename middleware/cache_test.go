package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestCacheSetsFrontendCachePolicy(t *testing.T) {
	gin.SetMode(gin.TestMode)
	tests := []struct {
		name     string
		method   string
		target   string
		expected string
	}{
		{name: "root HTML", method: http.MethodGet, target: "/", expected: "no-cache"},
		{name: "hashed JavaScript", method: http.MethodGet, target: "/static/js/index.eda6f3511c.js", expected: "public, max-age=31536000, immutable"},
		{name: "hashed CSS with query", method: http.MethodGet, target: "/static/css/index.ABCDEF12.css?v=1", expected: "public, max-age=31536000, immutable"},
		{name: "hashed HEAD request", method: http.MethodHead, target: "/static/js/index.0123456789abcdef.js", expected: "public, max-age=31536000, immutable"},
		{name: "short fake hash", method: http.MethodGet, target: "/static/js/index.abc123.js", expected: "max-age=604800"},
		{name: "non hexadecimal fake hash", method: http.MethodGet, target: "/static/js/index.zzzzzzzz.js", expected: "max-age=604800"},
		{name: "non hash static image", method: http.MethodGet, target: "/static/logo.png", expected: "max-age=604800"},
		{name: "public image outside static", method: http.MethodGet, target: "/logo.png", expected: "max-age=604800"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			router := gin.New()
			router.Use(Cache())
			router.Any("/*path", func(c *gin.Context) {
				c.Status(http.StatusNoContent)
			})

			request := httptest.NewRequest(test.method, test.target, nil)
			response := httptest.NewRecorder()
			router.ServeHTTP(response, request)

			assert.Equal(t, http.StatusNoContent, response.Code)
			assert.Equal(t, test.expected, response.Header().Get("Cache-Control"))
			assert.NotEmpty(t, response.Header().Get("Cache-Version"))
		})
	}
}
