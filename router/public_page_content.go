package router

import (
	"bytes"
	"fmt"
	"math"
	"net/url"
	"slices"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/pkg/billingexpr"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"golang.org/x/net/html"
	"golang.org/x/net/html/atom"
)

func element(name string, attributes map[string]string, children ...*html.Node) *html.Node {
	node := &html.Node{Type: html.ElementNode, Data: name}
	for key, value := range attributes {
		node.Attr = append(node.Attr, html.Attribute{Key: key, Val: value})
	}
	for _, child := range children {
		node.AppendChild(child)
	}
	return node
}

func text(value string) *html.Node {
	return &html.Node{Type: html.TextNode, Data: value}
}

func link(href, label string) *html.Node {
	return element("a", map[string]string{"href": href}, text(label))
}

type homePageAssets struct {
	defaultTemplate []byte
	customTemplate  []byte
	copy            []byte
}

func newHomePageAssets(defaultTemplate, customTemplate, copyJSON []byte) *homePageAssets {
	if parseHomePageTemplate(defaultTemplate) == nil || parseHomePageTemplate(customTemplate) == nil {
		return nil
	}
	var translations map[string]map[string]string
	if common.Unmarshal(copyJSON, &translations) != nil || len(translations) == 0 || len(translations["en"]) == 0 {
		return nil
	}
	return &homePageAssets{
		defaultTemplate: bytes.Clone(defaultTemplate),
		customTemplate:  bytes.Clone(customTemplate),
		copy:            bytes.Clone(copyJSON),
	}
}

func parseHomePageTemplate(template []byte) *html.Node {
	context := &html.Node{Type: html.ElementNode, DataAtom: atom.Div, Data: "div"}
	nodes, err := html.ParseFragment(bytes.NewReader(template), context)
	if err != nil {
		return nil
	}
	for _, node := range nodes {
		if node.Type == html.ElementNode && attribute(node, "data-server-fallback") == "home" {
			return node
		}
	}
	return nil
}

func attribute(node *html.Node, key string) string {
	for _, item := range node.Attr {
		if item.Key == key {
			return item.Val
		}
	}
	return ""
}

func setAttribute(node *html.Node, key, value string) {
	for index := range node.Attr {
		if node.Attr[index].Key == key {
			node.Attr[index].Val = value
			return
		}
	}
	node.Attr = append(node.Attr, html.Attribute{Key: key, Val: value})
}

func replaceNodeText(node *html.Node, value string) {
	for child := node.FirstChild; child != nil; {
		next := child.NextSibling
		node.RemoveChild(child)
		child = next
	}
	node.AppendChild(text(value))
}

func safeHomeDocsLink(value string) string {
	value = strings.TrimSpace(value)
	parsed, err := url.Parse(value)
	if err != nil || value == "" || parsed.User != nil {
		return "https://docs.taodock.com"
	}
	if parsed.Scheme == "" && strings.HasPrefix(value, "/") && !strings.HasPrefix(value, "//") {
		return value
	}
	if (parsed.Scheme == "http" || parsed.Scheme == "https") && parsed.Host != "" {
		return value
	}
	return "https://docs.taodock.com"
}

func homeAPIBaseURL(value string) string {
	value = strings.TrimSpace(value)
	parsed, err := url.Parse(value)
	if err != nil || parsed.User != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" || parsed.RawQuery != "" || parsed.Fragment != "" {
		return "/v1"
	}
	base := strings.TrimRight(value, "/")
	base = strings.TrimSuffix(base, "/v1")
	return base + "/v1"
}

func homePageConfiguration() (systemName, logo, docsLink, apiBaseURL string, custom bool) {
	common.OptionMapRWMutex.RLock()
	systemName = strings.TrimSpace(common.SystemName)
	logo = strings.TrimSpace(common.Logo)
	custom = strings.TrimSpace(common.OptionMap["HomePageContent"]) != ""
	common.OptionMapRWMutex.RUnlock()
	if systemName == "" {
		systemName = "TaoDock"
	}
	if logo == "" {
		logo = "/logo.png"
	}
	docsLink = safeHomeDocsLink(operation_setting.GetGeneralSetting().DocsLink)
	apiBaseURL = homeAPIBaseURL(system_setting.ServerAddress)
	return systemName, logo, docsLink, apiBaseURL, custom
}

func brandLoadingFallback(systemName, logo string, custom bool) *html.Node {
	variant := "loading"
	if custom {
		variant = "custom"
	}
	return element("div", map[string]string{
		"class":                    "server-home-frame",
		"data-server-fallback":     "home",
		"data-server-home-variant": variant,
		"data-server-brand":        systemName,
	},
		element("main", map[string]string{
			"class":     "server-home-loading",
			"aria-busy": "true",
		},
			element("div", map[string]string{"class": "server-home-mark"},
				element("div", map[string]string{
					"class":                  "server-home-bloom",
					"aria-hidden":            "true",
					"data-server-home-bloom": "true",
				},
					element("span", map[string]string{"class": "server-home-orbit server-home-orbit--blue"}),
					element("span", map[string]string{"class": "server-home-orbit server-home-orbit--violet"}),
					element("span", map[string]string{"class": "server-home-orbit server-home-orbit--pink"}),
				),
				element("div", map[string]string{"class": "server-home-logo-shell"},
					element("img", map[string]string{
						"src":              logo,
						"alt":              "",
						"width":            "72",
						"height":           "72",
						"class":            "server-home-logo",
						"data-server-logo": "true",
					}),
				),
			),
			element("p", map[string]string{
				"class":               "server-home-brand",
				"data-fallback-brand": "true",
			}, text(systemName)),
			element("p", map[string]string{
				"class":              "server-home-message",
				"role":               "status",
				"aria-live":          "polite",
				"data-fallback-i18n": "Loading...",
			}, text("Loading...")),
		),
	)
}

func homePageFallback(assets *homePageAssets) *html.Node {
	systemName, logo, docsLink, apiBaseURL, custom := homePageConfiguration()
	if assets == nil {
		return brandLoadingFallback(systemName, logo, custom)
	}
	template := assets.defaultTemplate
	if custom {
		template = assets.customTemplate
	}
	root := parseHomePageTemplate(template)
	if root == nil {
		return brandLoadingFallback(systemName, logo, custom)
	}
	setAttribute(root, "data-server-brand", systemName)

	var update func(*html.Node)
	update = func(node *html.Node) {
		for child := node.FirstChild; child != nil; {
			next := child.NextSibling
			if module := attribute(child, "data-server-nav"); module != "" && !middleware.HeaderNavModuleIsEnabled(module) {
				node.RemoveChild(child)
				child = next
				continue
			}
			if attribute(child, "data-fallback-brand") != "" {
				replaceNodeText(child, systemName)
			}
			if attribute(child, "data-fallback-brand-value") != "" {
				value := strings.ReplaceAll(attribute(child, "data-fallback-i18n"), "{{brand}}", systemName)
				replaceNodeText(child, value)
			}
			if attribute(child, "data-server-logo") != "" {
				if child.DataAtom == atom.Img {
					setAttribute(child, "src", logo)
				} else {
					setAttribute(child, "href", logo)
				}
			}
			if attribute(child, "data-server-docs") != "" {
				setAttribute(child, "href", docsLink)
			}
			if attribute(child, "data-server-api-base") != "" {
				replaceNodeText(child, apiBaseURL)
			}
			if attribute(child, "data-server-api-models-url") != "" {
				replaceNodeText(child, strings.TrimRight(apiBaseURL, "/")+"/models")
			}
			update(child)
			child = next
		}
	}
	update(root)
	root.AppendChild(element("script", map[string]string{
		"type":                    "application/json",
		"data-home-fallback-copy": "true",
	}, text(string(assets.copy))))
	return root
}

type integrationCatalogItem struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Icon    string `json:"icon"`
	DocPath string `json:"docPath"`
}

type integrationPageStep struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

type integrationPageCopy struct {
	Eyebrow     string                `json:"eyebrow"`
	Title       string                `json:"title"`
	Description string                `json:"description"`
	Clients     map[string]string     `json:"clients"`
	StepsTitle  string                `json:"stepsTitle"`
	Steps       []integrationPageStep `json:"steps"`
	PricingLink string                `json:"pricingLink"`
	DocsLink    string                `json:"docsLink"`
}

type integrationPageContent struct {
	Catalog []integrationCatalogItem
	Copy    integrationPageCopy
}

func newIntegrationPageContent(catalogJSON, copyJSON []byte) *integrationPageContent {
	var catalog []integrationCatalogItem
	var copy integrationPageCopy
	if common.Unmarshal(catalogJSON, &catalog) != nil || common.Unmarshal(copyJSON, &copy) != nil || len(catalog) == 0 {
		return nil
	}
	if copy.Eyebrow == "" || copy.Title == "" || copy.Description == "" || copy.StepsTitle == "" ||
		copy.PricingLink == "" || copy.DocsLink == "" || len(copy.Steps) == 0 {
		return nil
	}
	seen := make(map[string]bool, len(catalog))
	for _, item := range catalog {
		docURL, err := url.Parse(item.DocPath)
		if item.ID == "" || item.Name == "" || item.Icon == "" || item.DocPath == "" || seen[item.ID] ||
			err != nil || docURL.Scheme != "" || docURL.Host != "" || docURL.RawQuery != "" ||
			!strings.HasPrefix(docURL.Path, "/") || strings.HasPrefix(docURL.Path, "//") ||
			!strings.HasSuffix(docURL.Path, ".html") || strings.Contains(docURL.Path, "..") ||
			strings.ContainsAny(item.DocPath, " \t\r\n") || copy.Clients[item.ID] == "" {
			return nil
		}
		seen[item.ID] = true
	}
	for _, step := range copy.Steps {
		if step.Title == "" || step.Description == "" {
			return nil
		}
	}
	return &integrationPageContent{Catalog: catalog, Copy: copy}
}

func integrationPageFallback(content *integrationPageContent) *html.Node {
	if content == nil {
		return nil
	}
	main := element("main", map[string]string{
		"class":                "server-fallback server-fallback--integrations",
		"data-server-fallback": "integrations",
	},
		element("section", map[string]string{"class": "server-fallback__hero"},
			element("p", map[string]string{"class": "server-fallback__eyebrow"}, text(content.Copy.Eyebrow)),
			element("h1", nil, text(content.Copy.Title)),
			element("p", map[string]string{"class": "server-fallback__lead"}, text(content.Copy.Description)),
			element("nav", map[string]string{"aria-label": content.Copy.Eyebrow},
				link("/models", content.Copy.PricingLink),
				link("https://docs.taodock.com/en/guide/clients.html", content.Copy.DocsLink),
			),
		),
	)

	cards := element("div", map[string]string{"class": "server-fallback__card-list"})
	for _, item := range content.Catalog {
		cards.AppendChild(element("article", map[string]string{"class": "server-fallback__card"},
			element("h2", nil, text(item.Name)),
			element("p", nil, text(content.Copy.Clients[item.ID])),
			element("p", nil,
				link("/integrations/"+item.ID, "Integration guide: "+item.Name),
				text(" · "),
				link("https://docs.taodock.com/en"+item.DocPath, content.Copy.DocsLink),
			),
		))
	}
	main.AppendChild(element("section", nil,
		element("h2", nil, text(content.Copy.Eyebrow)),
		cards,
	))

	steps := element("ol", nil)
	for _, step := range content.Copy.Steps {
		steps.AppendChild(element("li", nil,
			element("h3", nil, text(step.Title)),
			element("p", nil, text(step.Description)),
		))
	}
	main.AppendChild(element("section", nil,
		element("h2", nil, text(content.Copy.StepsTitle)),
		steps,
	))
	return main
}

func modelsPageFallback(data controller.PublicPricingData) *html.Node {
	main := element("main", map[string]string{
		"class":                "server-fallback server-fallback--pricing",
		"data-server-fallback": "models",
	},
		element("section", map[string]string{"class": "server-fallback__hero"},
			element("p", map[string]string{"class": "server-fallback__eyebrow"}, text("TaoDock public catalog")),
			element("h1", nil, text("AI Models & API Pricing")),
			element("p", map[string]string{"class": "server-fallback__lead"}, text("The prices below come from the current catalog available to a signed-out visitor. Amounts are in USD and include the public display-group multiplier used by the anonymous catalog for each model.")),
			element("p", nil, text("Token prices are per 1 million tokens. Per-request, image and task prices use their stated unit. This response reads the current public catalog when requested, and the prices remain valid only while that configuration is active. Context tiers, request parameters, time windows, cache writes and account groups can change the final charge; the interactive catalog and the settlement record are authoritative for a request.")),
			element("nav", map[string]string{"aria-label": "Pricing resources"},
				link("https://docs.taodock.com/quick-start.html", "Quick start"),
				link("https://docs.taodock.com/guide/wallet.html", "Wallet and billing guide"),
				link("/sign-in?redirect=%2Fmodels", "Sign in for account-specific options"),
			),
		),
	)

	models := slices.Clone(data.Pricing)
	slices.SortFunc(models, func(left, right model.Pricing) int {
		if order := strings.Compare(strings.ToLower(left.ModelName), strings.ToLower(right.ModelName)); order != 0 {
			return order
		}
		return strings.Compare(left.ModelName, right.ModelName)
	})
	list := element("div", map[string]string{"class": "server-fallback__price-list"})
	for _, item := range models {
		children := []*html.Node{
			element("h2", nil, link("/models/"+escapePathSegment(item.ModelName), item.ModelName)),
		}
		if description := strings.TrimSpace(item.Description); description != "" {
			children = append(children, element("p", nil, text(description)))
		}
		if facts := publicModelFacts(item, data.Vendors); len(facts) > 0 {
			children = append(children, element("p", nil, text(strings.Join(facts, " · "))))
		}
		children = append(children, element("p", nil, text(publicPriceSummary(item, data.GroupRatio))))
		list.AppendChild(element("article", map[string]string{"class": "server-fallback__price"}, children...))
	}

	sectionChildren := []*html.Node{element("h2", nil, text("Public model prices"))}
	if len(models) == 0 {
		sectionChildren = append(sectionChildren,
			element("p", map[string]string{"role": "status"}, text("The public pricing catalog is temporarily unavailable. No missing price is treated as free; reload the interactive pricing page before sending a paid request.")),
		)
	} else {
		sectionChildren = append(sectionChildren, list)
	}
	main.AppendChild(element("section", nil, sectionChildren...))
	return main
}

func publicModelPageFallback(data controller.PublicPricingData, item model.Pricing) *html.Node {
	description := strings.TrimSpace(item.Description)
	if description == "" {
		description = "Compare the current public API pricing, supported endpoints and capabilities for " + item.ModelName + "."
	}
	main := element("main", map[string]string{
		"class":                "server-fallback server-fallback--pricing",
		"data-server-fallback": "model",
	},
		element("section", map[string]string{"class": "server-fallback__hero"},
			element("p", map[string]string{"class": "server-fallback__eyebrow"}, text("TaoDock model catalog")),
			element("h1", nil, text(item.ModelName+" API Pricing")),
			element("p", map[string]string{"class": "server-fallback__lead"}, text(description)),
			element("nav", map[string]string{"aria-label": "Model resources"},
				link("/models", "All models"),
				link("https://docs.taodock.com/quick-start.html", "Quick start"),
				link("/sign-in?redirect="+url.QueryEscape("/models/"+escapePathSegment(item.ModelName)), "Sign in for account-specific options"),
			),
		),
	)

	details := []*html.Node{
		element("h2", nil, text("Current public API price")),
		element("p", nil, text(publicPriceSummary(item, data.GroupRatio))),
	}
	if facts := publicModelFacts(item, data.Vendors); len(facts) > 0 {
		details = append(details,
			element("h2", nil, text("Model details")),
			element("p", nil, text(strings.Join(facts, " · "))),
		)
	}
	if tags := strings.TrimSpace(item.Tags); tags != "" {
		details = append(details,
			element("h2", nil, text("Capabilities and tags")),
			element("p", nil, text(tags)),
		)
	}
	main.AppendChild(element("section", nil, details...))
	return main
}

func publicModelFacts(item model.Pricing, vendors []model.PricingVendor) []string {
	facts := make([]string, 0, 2)
	for _, vendor := range vendors {
		if item.VendorID == vendor.ID && strings.TrimSpace(vendor.Name) != "" {
			facts = append(facts, "Provider: "+vendor.Name)
			break
		}
	}
	if len(item.SupportedEndpointTypes) > 0 {
		endpoints := make([]string, 0, len(item.SupportedEndpointTypes))
		for _, endpoint := range item.SupportedEndpointTypes {
			endpoints = append(endpoints, string(endpoint))
		}
		facts = append(facts, "Endpoints: "+strings.Join(endpoints, ", "))
	}
	return facts
}

func publicModelByName(data controller.PublicPricingData, name string) (model.Pricing, bool) {
	for _, item := range data.Pricing {
		if item.ModelName == name {
			return item, true
		}
	}
	return model.Pricing{}, false
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

func publicPriceSummary(item model.Pricing, groupRatios map[string]float64) string {
	groupRatio := publicModelGroupRatio(item, groupRatios)
	if item.BillingMode == "tiered_expr" && item.BillingExpr != "" {
		if len(item.BillingUsageSchema) > 0 {
			units := make([]string, 0, len(item.BillingUsageSchema))
			for _, definition := range item.BillingUsageSchema {
				if definition.Type == "number" && definition.Unit != "" {
					units = append(units, definition.Unit)
				}
			}
			slices.Sort(units)
			units = slices.Compact(units)
			if len(units) > 0 {
				return "Task usage pricing by " + strings.Join(units, ", ") + "; open the model details for its current usage tiers and conditions."
			}
			return "Task usage pricing; open the model details for its current usage tiers and conditions."
		}
		if summary, ok := tieredPriceSummary(item.BillingExpr, groupRatio); ok {
			return summary
		}
		return "Dynamic model pricing; open the model details for current tiers, request rules and units."
	}

	if item.QuotaType == 1 {
		return formatUSD(item.ModelPrice*groupRatio) + " per request."
	}
	input := item.ModelRatio * 2 * groupRatio
	output := input * item.CompletionRatio
	return formatUSD(input) + " input / " + formatUSD(output) + " output per 1M tokens."
}

func publicModelGroupRatio(item model.Pricing, groupRatios map[string]float64) float64 {
	best := math.Inf(1)
	for _, group := range item.EnableGroup {
		ratio, ok := groupRatios[group]
		if ok && !math.IsNaN(ratio) && !math.IsInf(ratio, 0) && ratio >= 0 {
			best = min(best, ratio)
		}
	}
	if math.IsInf(best, 1) {
		return 1
	}
	return best
}

func tieredPriceSummary(expression string, groupRatio float64) (string, bool) {
	base, trace, err := billingexpr.RunExpr(expression, billingexpr.TokenParams{})
	if err != nil || math.IsNaN(base) || math.IsInf(base, 0) || base < 0 {
		return "", false
	}
	if trace.BillingUnit == billingexpr.BillingUnitRequest {
		return formatUSD(base/1_000_000*groupRatio) + " per request; request and time conditions may apply.", true
	}

	type priceProbe struct {
		label  string
		params billingexpr.TokenParams
	}
	probes := []priceProbe{
		{label: "input", params: billingexpr.TokenParams{P: 1, Len: 1}},
		{label: "output", params: billingexpr.TokenParams{C: 1}},
		{label: "cache read", params: billingexpr.TokenParams{CR: 1, Len: 1}},
		{label: "cache write", params: billingexpr.TokenParams{CC: 1, Len: 1}},
		{label: "cache write (1h)", params: billingexpr.TokenParams{CC1h: 1, Len: 1}},
		{label: "cache write (12h)", params: billingexpr.TokenParams{CC12h: 1, Len: 1}},
		{label: "image input", params: billingexpr.TokenParams{Img: 1, Len: 1}},
		{label: "cached image input", params: billingexpr.TokenParams{ImgCR: 1, Len: 1}},
		{label: "image output", params: billingexpr.TokenParams{ImgO: 1}},
		{label: "audio input", params: billingexpr.TokenParams{AI: 1, Len: 1}},
		{label: "audio output", params: billingexpr.TokenParams{AO: 1}},
	}
	prices := make([]string, 0, len(probes))
	for _, probe := range probes {
		one, oneTrace, err := billingexpr.RunExpr(expression, probe.params)
		if err != nil || oneTrace.BillingUnit != billingexpr.BillingUnitToken {
			continue
		}
		twoParams := probe.params
		twoParams.P *= 2
		twoParams.C *= 2
		twoParams.Len *= 2
		twoParams.CR *= 2
		twoParams.CC *= 2
		twoParams.CC1h *= 2
		twoParams.CC12h *= 2
		twoParams.Img *= 2
		twoParams.ImgCR *= 2
		twoParams.ImgO *= 2
		twoParams.AI *= 2
		twoParams.AO *= 2
		two, twoTrace, err := billingexpr.RunExpr(expression, twoParams)
		unitPrice := one - base
		if err != nil || twoTrace.BillingUnit != billingexpr.BillingUnitToken || unitPrice < 0 ||
			math.IsNaN(unitPrice) || math.IsInf(unitPrice, 0) || math.Abs((two-base)-2*unitPrice) > 1e-9 {
			continue
		}
		if unitPrice == 0 && one == base && two == base {
			continue
		}
		prices = append(prices, formatUSD(unitPrice*groupRatio)+" "+probe.label)
	}
	if len(prices) == 0 {
		return "", false
	}
	return strings.Join(prices, " / ") + " per 1M tokens; context, request or time tiers may apply.", true
}

func formatUSD(value float64) string {
	if value == 0 {
		return "$0"
	}
	absolute := math.Abs(value)
	if absolute < 0.000001 {
		return "<$0.000001"
	}
	digits := 6
	if absolute >= 1 {
		digits = 4
	}
	formatted := strconv.FormatFloat(value, 'f', digits, 64)
	formatted = strings.TrimRight(strings.TrimRight(formatted, "0"), ".")
	return "$" + formatted
}

func notFoundFallback() *html.Node {
	return element("main", map[string]string{
		"class":                "server-fallback server-fallback--error",
		"data-server-fallback": "not-found",
	},
		element("h1", nil, text("Page not found")),
		element("p", nil, text("The requested TaoDock page does not exist or has moved.")),
		element("nav", map[string]string{"aria-label": "Return to a public page"},
			link("/", "Go to the homepage"),
			link("/models", "View model pricing"),
			link("https://docs.taodock.com/", "Open the documentation"),
		),
	)
}
