package router

import (
	"strings"

	"github.com/QuantumNous/new-api/common"
	"golang.org/x/net/html"
	"golang.org/x/net/html/atom"
)

type publicContentManifestEntry struct {
	HTML           string   `json:"html"`
	StructuredData []string `json:"structuredData"`
}

type publicContentManifest struct {
	Version int                                   `json:"version"`
	Pages   map[string]publicContentManifestEntry `json:"pages"`
}

func newPublicContentManifest(data []byte) *publicContentManifest {
	var manifest publicContentManifest
	if common.Unmarshal(data, &manifest) != nil || manifest.Version != 1 || len(manifest.Pages) == 0 {
		return nil
	}
	for path, page := range manifest.Pages {
		if normalizePagePath(path) != path || !isPublicContentPath(path) || parsePublicContentFallback(page.HTML) == nil || len(page.StructuredData) == 0 {
			return nil
		}
		for _, value := range page.StructuredData {
			var decoded any
			if strings.Contains(strings.ToLower(value), "</script") || common.Unmarshal([]byte(value), &decoded) != nil {
				return nil
			}
		}
	}
	return &manifest
}

func parsePublicContentFallback(value string) *html.Node {
	context := &html.Node{Type: html.ElementNode, DataAtom: atom.Div, Data: "div"}
	nodes, err := html.ParseFragment(strings.NewReader(value), context)
	if err != nil {
		return nil
	}
	var root *html.Node
	for _, node := range nodes {
		if node.Type == html.TextNode && strings.TrimSpace(node.Data) == "" {
			continue
		}
		if node.Type != html.ElementNode || node.Data != "main" || attribute(node, "data-server-fallback") != "public-content" || root != nil {
			return nil
		}
		root = node
	}
	if root == nil || publicContentContainsUnsafeElement(root) || publicContentHeadingCount(root, "h1") != 1 {
		return nil
	}
	return root
}

func publicContentHeadingCount(root *html.Node, name string) int {
	count := 0
	for child := range root.Descendants() {
		if child.Type == html.ElementNode && child.Data == name {
			count++
		}
	}
	return count
}

func publicContentContainsUnsafeElement(root *html.Node) bool {
	for child := range root.Descendants() {
		if child.Type != html.ElementNode {
			continue
		}
		switch child.Data {
		case "base", "embed", "form", "iframe", "object", "script", "style":
			return true
		}
		if child.Data == "a" {
			href := attribute(child, "href")
			internal := strings.HasPrefix(href, "/") && !strings.HasPrefix(href, "//")
			if !internal && !strings.HasPrefix(href, "https://") {
				return true
			}
		}
	}
	return false
}

func (manifest *publicContentManifest) page(path string) (*html.Node, []string, bool) {
	if manifest == nil {
		return nil, nil, false
	}
	page, ok := manifest.Pages[normalizePagePath(path)]
	if !ok {
		return nil, nil, false
	}
	fallback := parsePublicContentFallback(page.HTML)
	if fallback == nil {
		return nil, nil, false
	}
	return fallback, page.StructuredData, true
}

func isPublicContentPath(path string) bool {
	path = normalizePagePath(path)
	return path == "/compare" || path == "/faq" ||
		strings.HasPrefix(path, "/compare/") ||
		strings.HasPrefix(path, "/integrations/") ||
		strings.HasPrefix(path, "/blog/") ||
		strings.HasPrefix(path, "/use-cases/")
}

func renderStructuredData(value string) *html.Node {
	return element("script", map[string]string{
		"type":                       "application/ld+json",
		"data-public-content-jsonld": "true",
	}, text(value))
}

func validStructuredData(value string) bool {
	var decoded any
	return !strings.Contains(strings.ToLower(value), "</script") && common.Unmarshal([]byte(value), &decoded) == nil
}
