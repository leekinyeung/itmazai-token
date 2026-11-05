package router

import (
	"bytes"
	"fmt"
	"net/url"
	"strings"
	"unicode/utf8"

	"github.com/QuantumNous/new-api/common"
	"golang.org/x/net/html"
)

type publicPageMetadata struct {
	Title          string   `json:"title"`
	Description    string   `json:"description"`
	Language       string   `json:"language"`
	OGType         string   `json:"ogType"`
	PublishedAt    string   `json:"publishedAt"`
	UpdatedAt      string   `json:"updatedAt"`
	StructuredData []string `json:"structuredData"`
}

type publicPageMetadataRenderer struct {
	Origin        string                        `json:"origin"`
	SiteName      string                        `json:"siteName"`
	NoIndexRoutes []string                      `json:"noIndexRoutes"`
	Pages         map[string]publicPageMetadata `json:"pages"`
	index         []byte
}

func newPublicPageMetadataRenderer(index, manifest []byte) *publicPageMetadataRenderer {
	var renderer publicPageMetadataRenderer
	if common.Unmarshal(manifest, &renderer) != nil || renderer.SiteName == "" {
		return nil
	}
	origin, err := url.Parse(renderer.Origin)
	if err != nil || origin.Scheme != "https" || origin.Host == "" || origin.User != nil || origin.RawQuery != "" || origin.Fragment != "" || (origin.Path != "" && origin.Path != "/") {
		return nil
	}
	renderer.Origin = strings.TrimRight(renderer.Origin, "/")
	renderer.index = index
	return &renderer
}

func normalizePagePath(escapedPath string) string {
	path := strings.TrimRight(escapedPath, "/")
	if path == "" {
		return "/"
	}
	return path
}

func (renderer *publicPageMetadataRenderer) publicPage(escapedPath string) (publicPageMetadata, string, string, string, bool) {
	if renderer == nil {
		return publicPageMetadata{}, "", "", "", false
	}
	path := normalizePagePath(escapedPath)
	if page, ok := renderer.Pages[path]; ok && !strings.Contains(path, ":") {
		title := page.Title + " | " + renderer.SiteName
		if path == "/" {
			title = page.Title
		}
		description := strings.ReplaceAll(page.Description, "{{systemName}}", renderer.SiteName)
		return page, title, description, renderer.Origin + path, true
	}

	modelName, ok := publicModelNameFromPath(path)
	if !ok {
		return publicPageMetadata{}, "", "", "", false
	}
	page, ok := renderer.Pages["/models/:modelId"]
	if !ok {
		return publicPageMetadata{}, "", "", "", false
	}
	values := strings.NewReplacer("{{systemName}}", renderer.SiteName, "{{modelName}}", modelName)
	title := values.Replace(page.Title) + " | " + renderer.SiteName
	canonical := renderer.Origin + "/models/" + escapePathSegment(modelName)
	return page, title, values.Replace(page.Description), canonical, true
}

func publicModelNameFromPath(path string) (string, bool) {
	encodedName, ok := strings.CutPrefix(normalizePagePath(path), "/models/")
	if !ok || encodedName == "" || strings.Contains(encodedName, "/") {
		return "", false
	}
	modelName, err := url.PathUnescape(encodedName)
	if err != nil || strings.TrimSpace(modelName) == "" || utf8.RuneCountInString(modelName) > 200 {
		return "", false
	}
	return modelName, true
}

func escapePathSegment(value string) string {
	var builder strings.Builder
	for i := range len(value) {
		character := value[i]
		if (character >= 'a' && character <= 'z') || (character >= 'A' && character <= 'Z') ||
			(character >= '0' && character <= '9') || strings.ContainsRune("-._~", rune(character)) {
			builder.WriteByte(character)
			continue
		}
		builder.WriteString(fmt.Sprintf("%%%02X", character))
	}
	return builder.String()
}

func (renderer *publicPageMetadataRenderer) render(escapedPath string) []byte {
	page, title, description, canonical, ok := renderer.publicPage(escapedPath)
	if !ok {
		return nil
	}
	return renderPageHTMLWithOptions(renderer.index, title, description, renderer.SiteName, canonical, false, publicPageRenderOptions{
		Language:       page.Language,
		OGType:         page.OGType,
		PublishedAt:    page.PublishedAt,
		UpdatedAt:      page.UpdatedAt,
		StructuredData: page.StructuredData,
	})
}

func (renderer *publicPageMetadataRenderer) isNoIndexRoute(escapedPath string) bool {
	if renderer == nil {
		return false
	}
	path := normalizePagePath(escapedPath)
	for _, pattern := range renderer.NoIndexRoutes {
		if routePatternMatches(pattern, path) {
			return true
		}
	}
	return false
}

func routePatternMatches(pattern, path string) bool {
	patternParts := strings.Split(strings.Trim(pattern, "/"), "/")
	pathParts := strings.Split(strings.Trim(path, "/"), "/")
	if pattern == "/" || path == "/" {
		return pattern == path
	}
	for index, patternPart := range patternParts {
		if strings.HasPrefix(patternPart, "*") {
			return index < len(pathParts)
		}
		if index >= len(pathParts) || (patternPart != pathParts[index] && !strings.HasPrefix(patternPart, ":")) {
			return false
		}
	}
	return len(patternParts) == len(pathParts)
}

func renderPageHTML(index []byte, title, description, siteName, canonical string, noIndex bool) []byte {
	return renderPageHTMLWithOptions(index, title, description, siteName, canonical, noIndex, publicPageRenderOptions{})
}

type publicPageRenderOptions struct {
	Language       string
	OGType         string
	PublishedAt    string
	UpdatedAt      string
	StructuredData []string
}

func renderPageHTMLWithOptions(index []byte, title, description, siteName, canonical string, noIndex bool, options publicPageRenderOptions) []byte {
	document, err := html.Parse(bytes.NewReader(index))
	if err != nil {
		return nil
	}
	var head *html.Node
	for node := document.FirstChild; node != nil; node = node.NextSibling {
		if node.Type != html.ElementNode || node.Data != "html" {
			continue
		}
		if options.Language != "" {
			languageSet := false
			for index := range node.Attr {
				if node.Attr[index].Key == "lang" {
					node.Attr[index].Val = options.Language
					languageSet = true
					break
				}
			}
			if !languageSet {
				node.Attr = append(node.Attr, html.Attribute{Key: "lang", Val: options.Language})
			}
		}
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			if child.Type == html.ElementNode && child.Data == "head" {
				head = child
			}
		}
	}
	if head == nil {
		return nil
	}
	fields := []struct{ kind, key, value string }{
		{"name", "title", title},
		{"name", "description", description},
		{"property", "og:title", title},
		{"property", "og:description", description},
		{"property", "og:site_name", siteName},
		{"name", "twitter:title", title},
		{"name", "twitter:description", description},
	}
	if canonical != "" {
		fields = append(fields, struct{ kind, key, value string }{"property", "og:url", canonical})
	}
	if options.OGType != "" {
		fields = append(fields, struct{ kind, key, value string }{"property", "og:type", options.OGType})
	}
	if options.PublishedAt != "" {
		fields = append(fields, struct{ kind, key, value string }{"property", "article:published_time", options.PublishedAt})
	}
	if options.UpdatedAt != "" {
		fields = append(fields, struct{ kind, key, value string }{"property", "article:modified_time", options.UpdatedAt})
	}
	seen := make(map[string]bool)
	hasTitle := false
	for node := head.FirstChild; node != nil; {
		next := node.NextSibling
		attributes := make(map[string]string)
		for _, attribute := range node.Attr {
			attributes[attribute.Key] = attribute.Val
		}
		if node.Type == html.ElementNode && node.Data == "title" {
			for node.FirstChild != nil {
				node.RemoveChild(node.FirstChild)
			}
			node.AppendChild(&html.Node{Type: html.TextNode, Data: title})
			hasTitle = true
		}
		if node.Type == html.ElementNode && node.Data == "link" && attributes["rel"] == "canonical" {
			head.RemoveChild(node)
		}
		if node.Type == html.ElementNode && node.Data == "meta" {
			if attributes["name"] == "robots" {
				head.RemoveChild(node)
				node = next
				continue
			}
			if attributes["property"] == "og:url" && canonical == "" {
				head.RemoveChild(node)
				node = next
				continue
			}
			for _, field := range fields {
				if attributes[field.kind] != field.key {
					continue
				}
				seen[field.kind+":"+field.key] = true
				found := false
				for i := range node.Attr {
					if node.Attr[i].Key == "content" {
						node.Attr[i].Val = field.value
						found = true
					}
				}
				if !found {
					node.Attr = append(node.Attr, html.Attribute{Key: "content", Val: field.value})
				}
			}
		}
		node = next
	}
	if !hasTitle {
		node := &html.Node{Type: html.ElementNode, Data: "title"}
		node.AppendChild(&html.Node{Type: html.TextNode, Data: title})
		head.AppendChild(node)
	}
	for _, field := range fields {
		if !seen[field.kind+":"+field.key] {
			head.AppendChild(&html.Node{Type: html.ElementNode, Data: "meta", Attr: []html.Attribute{
				{Key: field.kind, Val: field.key}, {Key: "content", Val: field.value},
			}})
		}
	}
	if canonical != "" {
		head.AppendChild(&html.Node{Type: html.ElementNode, Data: "link", Attr: []html.Attribute{
			{Key: "rel", Val: "canonical"}, {Key: "href", Val: canonical},
		}})
	}
	if noIndex {
		head.AppendChild(&html.Node{Type: html.ElementNode, Data: "meta", Attr: []html.Attribute{
			{Key: "name", Val: "robots"}, {Key: "content", Val: "noindex, nofollow"},
		}})
	}
	for _, value := range options.StructuredData {
		if validStructuredData(value) {
			head.AppendChild(renderStructuredData(value))
		}
	}
	var output bytes.Buffer
	if html.Render(&output, document) != nil {
		return nil
	}
	return output.Bytes()
}

func renderStructuredData(value string) *html.Node {
	node := &html.Node{Type: html.ElementNode, Data: "script", Attr: []html.Attribute{
		{Key: "type", Val: "application/ld+json"},
		{Key: "data-public-content-jsonld", Val: "true"},
	}}
	node.AppendChild(&html.Node{Type: html.TextNode, Data: value})
	return node
}

func validStructuredData(value string) bool {
	var decoded any
	return !strings.Contains(strings.ToLower(value), "</script") && common.Unmarshal([]byte(value), &decoded) == nil
}
