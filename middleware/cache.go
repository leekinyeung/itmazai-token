package middleware

import (
	"path"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
)

var hashedFrontendAssetPattern = regexp.MustCompile(`\.[0-9a-fA-F]{8,}\.`)

func Cache() func(c *gin.Context) {
	return func(c *gin.Context) {
		requestPath := c.Request.URL.Path
		isHashedStaticAsset := strings.HasPrefix(requestPath, "/static/") &&
			hashedFrontendAssetPattern.MatchString(path.Base(requestPath))
		switch {
		case requestPath == "/":
			c.Header("Cache-Control", "no-cache")
		case isHashedStaticAsset:
			c.Header("Cache-Control", "public, max-age=31536000, immutable")
		default:
			c.Header("Cache-Control", "max-age=604800") // one week
		}
		c.Header("Cache-Version", "b688f2fb5be447c25e5aa3bd063087a83db32a288bf6a4f35f2d8db310e40b14")
		c.Next()
	}
}
