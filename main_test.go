package main

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestInjectGoogleAnalyticsDefersThirdPartyScript(t *testing.T) {
	originalIndexPage := indexPage
	t.Cleanup(func() {
		indexPage = originalIndexPage
	})
	t.Setenv("GOOGLE_ANALYTICS_ID", `G-TEST'</script><script>alert(1)</script>`)
	indexPage = []byte("<head><!--Google Analytics-->\n</head>")

	InjectGoogleAnalytics()

	page := string(indexPage)
	assert.NotContains(t, page, `<script async src="https://www.googletagmanager.com`)
	assert.Contains(t, page, `window.setTimeout(load,8000)`)
	assert.Contains(t, page, `['pointerdown','keydown','touchstart']`)
	assert.Equal(t, 1, strings.Count(page, "</script>"))
	assert.Contains(t, page, `G-TEST\'\u003C/script\u003E\u003Cscript\u003Ealert(1)\u003C/script\u003E`)
}
