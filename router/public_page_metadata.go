package router

import (
	"bytes"
	"net/url"
	"strings"
	"unicode/utf8"

	"github.com/QuantumNous/new-api/common"
	"golang.org/x/net/html"
)

type publicPageMetadata struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

type publicPageMetadataRenderer struct {
	Origin   string                        `json:"origin"`
	SiteName string                        `json:"siteName"`
	Pages    map[string]publicPageMetadata `json:"pages"`
	index    []byte
	static   map[string][]byte
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
	renderer.static = make(map[string][]byte)
	for path, page := range renderer.Pages {
		if strings.Contains(path, ":") {
			continue
		}
		title := page.Title + " | " + renderer.SiteName
		if path == "/" {
			title = renderer.SiteName + " | " + page.Title
		}
		description := strings.ReplaceAll(page.Description, "{{systemName}}", renderer.SiteName)
		renderer.static[path] = renderPublicPageHTML(index, title, description, renderer.SiteName, renderer.Origin+path)
	}
	return &renderer
}

func (renderer *publicPageMetadataRenderer) render(escapedPath string) []byte {
	if renderer == nil {
		return nil
	}
	path := strings.TrimRight(escapedPath, "/")
	if path == "" {
		path = "/"
	}
	if page, ok := renderer.static[path]; ok {
		return page
	}
	encodedName, ok := strings.CutPrefix(path, "/pricing/")
	if !ok || encodedName == "" || strings.Contains(encodedName, "/") {
		return nil
	}
	modelName, err := url.PathUnescape(encodedName)
	if err != nil || strings.TrimSpace(modelName) == "" || utf8.RuneCountInString(modelName) > 200 {
		return nil
	}
	page, ok := renderer.Pages["/pricing/:modelId"]
	if !ok {
		return nil
	}
	values := strings.NewReplacer("{{systemName}}", renderer.SiteName, "{{modelName}}", modelName)
	title := values.Replace(page.Title) + " | " + renderer.SiteName
	return renderPublicPageHTML(renderer.index, title, values.Replace(page.Description), renderer.SiteName, renderer.Origin+path)
}

// Render through the HTML parser so model IDs and branding cannot become markup.
func renderPublicPageHTML(index []byte, title, description, siteName, canonical string) []byte {
	document, err := html.Parse(bytes.NewReader(index))
	if err != nil {
		return nil
	}
	var head *html.Node
	for node := document.FirstChild; node != nil; node = node.NextSibling {
		if node.Type != html.ElementNode || node.Data != "html" {
			continue
		}
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			if child.Type == html.ElementNode && child.Data == "head" {
				head = child
				break
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
		{"property", "og:url", canonical},
		{"name", "twitter:title", title},
		{"name", "twitter:description", description},
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
	head.AppendChild(&html.Node{Type: html.ElementNode, Data: "link", Attr: []html.Attribute{
		{Key: "rel", Val: "canonical"}, {Key: "href", Val: canonical},
	}})
	var output bytes.Buffer
	if html.Render(&output, document) != nil {
		return nil
	}
	return output.Bytes()
}
