package router

import (
	"encoding/xml"
	"slices"
	"strings"

	"github.com/QuantumNous/new-api/controller"
)

type publicModelSitemapURL struct {
	Location string `xml:"loc"`
}

type publicModelSitemapURLSet struct {
	XMLName xml.Name                `xml:"urlset"`
	XMLNS   string                  `xml:"xmlns,attr"`
	URLs    []publicModelSitemapURL `xml:"url"`
}

func renderPublicModelSitemap(origin string, data controller.PublicPricingData) ([]byte, error) {
	names := make([]string, 0, len(data.Pricing))
	seen := make(map[string]struct{}, len(data.Pricing))
	for _, item := range data.Pricing {
		name := item.ModelName
		if strings.TrimSpace(name) == "" {
			continue
		}
		if _, exists := seen[name]; exists {
			continue
		}
		seen[name] = struct{}{}
		names = append(names, name)
	}
	slices.SortFunc(names, func(left, right string) int {
		if order := strings.Compare(strings.ToLower(left), strings.ToLower(right)); order != 0 {
			return order
		}
		return strings.Compare(left, right)
	})

	urls := make([]publicModelSitemapURL, 0, len(names))
	for _, name := range names {
		urls = append(urls, publicModelSitemapURL{
			Location: strings.TrimRight(origin, "/") + "/models/" + escapePathSegment(name),
		})
	}
	body, err := xml.MarshalIndent(publicModelSitemapURLSet{
		XMLNS: "http://www.sitemaps.org/schemas/sitemap/0.9",
		URLs:  urls,
	}, "", "  ")
	if err != nil {
		return nil, err
	}
	return append([]byte(xml.Header), body...), nil
}
