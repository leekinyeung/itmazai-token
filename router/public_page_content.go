package router

import (
	"fmt"
	"math"
	"slices"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/pkg/billingexpr"
	"golang.org/x/net/html"
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

func homePageFallback() *html.Node {
	return element("main", map[string]string{
		"class":                "server-fallback",
		"data-server-fallback": "home",
	},
		element("section", map[string]string{"class": "server-fallback__hero"},
			element("p", map[string]string{"class": "server-fallback__eyebrow"}, text("众妙之门 · TaoDock")),
			element("h1", nil, text("One unified AI API for apps and agents")),
			element("p", map[string]string{"class": "server-fallback__lead"}, text("TaoDock connects developers, teams and AI agents to text, image, audio and video models through one compatible API gateway.")),
			element("p", nil, text("Use OpenAI-compatible and provider-specific endpoints, issue API keys, route requests across available providers, inspect usage logs and manage billing from one console.")),
			element("nav", map[string]string{"aria-label": "Get started"},
				link("/pricing", "View public model pricing"),
				link("https://docs.taodock.com/quick-start.html", "Read the quick start"),
				link("/sign-in?redirect=%2Fkeys", "Sign in and create an API key"),
			),
		),
		element("section", nil,
			element("h2", nil, text("Built for practical AI integration")),
			element("ul", nil,
				element("li", nil, text("Developers integrating chat, reasoning, embeddings and multimodal generation.")),
				element("li", nil, text("Teams that need provider routing, access controls, usage records and predictable settlement.")),
				element("li", nil, text("AI clients and agents that need a stable API endpoint across multiple model families.")),
			),
		),
		element("section", nil,
			element("h2", nil, text("Choose a model, follow a guide, then connect")),
			element("p", nil, text("Compare the anonymous public catalog before signing in. Prices may differ by model, usage type, context tier, time or account group; the pricing page states the applicable terms.")),
			element("p", nil,
				link("https://docs.taodock.com/guide/clients.html", "Browse supported client tutorials"),
				text(" · "),
				link("https://docs.taodock.com/api/overview.html", "Read the API overview"),
			),
		),
	)
}

func pricingPageFallback(data controller.PublicPricingData) *html.Node {
	main := element("main", map[string]string{
		"class":                "server-fallback server-fallback--pricing",
		"data-server-fallback": "pricing",
	},
		element("section", map[string]string{"class": "server-fallback__hero"},
			element("p", map[string]string{"class": "server-fallback__eyebrow"}, text("TaoDock public catalog")),
			element("h1", nil, text("AI model API pricing")),
			element("p", map[string]string{"class": "server-fallback__lead"}, text("The prices below come from the current catalog available to a signed-out visitor. Amounts are in USD and include the public display-group multiplier used by the anonymous catalog for each model.")),
			element("p", nil, text("Token prices are per 1 million tokens. Per-request, image and task prices use their stated unit. This response reads the current public catalog when requested, and the prices remain valid only while that configuration is active. Context tiers, request parameters, time windows, cache writes and account groups can change the final charge; the interactive catalog and the settlement record are authoritative for a request.")),
			element("nav", map[string]string{"aria-label": "Pricing resources"},
				link("https://docs.taodock.com/quick-start.html", "Quick start"),
				link("https://docs.taodock.com/guide/wallet.html", "Wallet and billing guide"),
				link("/sign-in?redirect=%2Fpricing", "Sign in for account-specific options"),
			),
		),
	)

	models := slices.Clone(data.Pricing)
	slices.SortFunc(models, func(left, right model.Pricing) int {
		return strings.Compare(strings.ToLower(left.ModelName), strings.ToLower(right.ModelName))
	})
	list := element("div", map[string]string{"class": "server-fallback__price-list"})
	for _, item := range models {
		list.AppendChild(element("article", map[string]string{"class": "server-fallback__price"},
			element("h2", nil, link("/pricing/"+escapePathSegment(item.ModelName), item.ModelName)),
			element("p", nil, text(publicPriceSummary(item, data.GroupRatio))),
		))
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
			link("/pricing", "View model pricing"),
			link("https://docs.taodock.com/", "Open the documentation"),
		),
	)
}
