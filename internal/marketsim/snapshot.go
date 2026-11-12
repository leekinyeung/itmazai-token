package marketsim

import (
	_ "embed"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
)

type MatchKind string

const (
	MatchExact   MatchKind = "exact"
	MatchFamily  MatchKind = "family"
	MatchDefault MatchKind = "default"
)

type Profile struct {
	Canonical                  string
	Family                     string
	Vendor                     string
	VendorIcon                 string
	TtftMs                     int64
	ThroughputTPS              float64
	RepresentativeOutputTokens int
	MaxIncidentHours           int
	OpenRouterRank             int
	AIHubMixRank               int
	Match                      MatchKind
}

type source struct {
	ID     string            `json:"id"`
	Name   string            `json:"name"`
	URL    string            `json:"url"`
	Fields map[string]string `json:"fields"`
}

type family struct {
	ID                         string   `json:"id"`
	Matches                    []string `json:"matches"`
	TtftMs                     int64    `json:"ttft_ms"`
	ThroughputTPS              float64  `json:"throughput_tps"`
	RepresentativeOutputTokens int      `json:"representative_output_tokens"`
	MaxIncidentHours           int      `json:"max_incident_hours"`
}

type vendor struct {
	Prefixes []string `json:"prefixes"`
	Name     string   `json:"name"`
	Icon     string   `json:"icon"`
}

type modelProfile struct {
	Canonical         string   `json:"canonical"`
	Aliases           []string `json:"aliases"`
	Family            string   `json:"family"`
	Vendor            string   `json:"vendor"`
	VendorIcon        string   `json:"vendor_icon"`
	TtftMs            int64    `json:"ttft_ms"`
	ThroughputTPS     float64  `json:"throughput_tps"`
	PerformanceSource string   `json:"performance_source"`
	OpenRouterRank    int      `json:"openrouter_rank"`
	AIHubMixRank      int      `json:"aihubmix_rank"`
}

type snapshot struct {
	Version       int            `json:"version"`
	CapturedAt    string         `json:"captured_at"`
	DefaultFamily string         `json:"default_family"`
	Sources       []source       `json:"sources"`
	Families      []family       `json:"families"`
	Vendors       []vendor       `json:"vendors"`
	Models        []modelProfile `json:"models"`
}

type catalog struct {
	snapshot snapshot
	families map[string]family
	aliases  map[string]modelProfile
}

//go:embed snapshot.json
var snapshotJSON []byte

var loadCatalog = sync.OnceValues(func() (*catalog, error) {
	var data snapshot
	if err := common.Unmarshal(snapshotJSON, &data); err != nil {
		return nil, fmt.Errorf("decode market simulation snapshot: %w", err)
	}
	if data.Version != 1 {
		return nil, fmt.Errorf("unsupported market simulation snapshot version %d", data.Version)
	}
	if _, err := time.Parse(time.RFC3339, data.CapturedAt); err != nil {
		return nil, fmt.Errorf("invalid market simulation capture time: %w", err)
	}
	sourceIDs := make(map[string]struct{}, len(data.Sources))
	for _, item := range data.Sources {
		if item.ID == "" || item.Name == "" || item.URL == "" {
			return nil, fmt.Errorf("market simulation source metadata is incomplete")
		}
		sourceIDs[item.ID] = struct{}{}
	}
	families := make(map[string]family, len(data.Families))
	for _, item := range data.Families {
		if item.ID == "" || item.TtftMs <= 0 || item.ThroughputTPS <= 0 || item.RepresentativeOutputTokens <= 0 || item.MaxIncidentHours < 0 || item.MaxIncidentHours > 2 {
			return nil, fmt.Errorf("invalid market simulation family %q", item.ID)
		}
		families[item.ID] = item
	}
	if _, ok := families[data.DefaultFamily]; !ok {
		return nil, fmt.Errorf("unknown default market simulation family %q", data.DefaultFamily)
	}
	aliases := make(map[string]modelProfile)
	for _, item := range data.Models {
		canonical := normalize(item.Canonical)
		if canonical == "" {
			return nil, fmt.Errorf("market simulation model has no canonical name")
		}
		if item.Family != "" {
			if _, ok := families[item.Family]; !ok {
				return nil, fmt.Errorf("model %q uses unknown family %q", item.Canonical, item.Family)
			}
		}
		if item.TtftMs < 0 || item.ThroughputTPS < 0 || item.OpenRouterRank < 0 || item.AIHubMixRank < 0 {
			return nil, fmt.Errorf("model %q contains a negative market metric", item.Canonical)
		}
		if (item.TtftMs > 0 || item.ThroughputTPS > 0) && (item.TtftMs == 0 || item.ThroughputTPS == 0) {
			return nil, fmt.Errorf("model %q has an incomplete performance anchor", item.Canonical)
		}
		if item.PerformanceSource != "" {
			if _, ok := sourceIDs[item.PerformanceSource]; !ok {
				return nil, fmt.Errorf("model %q uses unknown performance source %q", item.Canonical, item.PerformanceSource)
			}
		}
		item.Canonical = canonical
		for _, alias := range append([]string{canonical}, item.Aliases...) {
			key := normalize(alias)
			if key == "" {
				continue
			}
			if existing, ok := aliases[key]; ok && existing.Canonical != canonical {
				return nil, fmt.Errorf("market simulation alias %q maps to multiple models", alias)
			}
			aliases[key] = item
		}
	}
	return &catalog{snapshot: data, families: families, aliases: aliases}, nil
})

func ValidateSnapshot() error {
	_, err := loadCatalog()
	return err
}

func ResolveModel(name string) Profile {
	data, err := loadCatalog()
	if err != nil {
		panic(err)
	}
	normalized := normalize(name)
	item, exact := data.aliases[normalized]
	familyID := item.Family
	if familyID == "" {
		familyID = matchingFamily(data.snapshot.Families, normalized)
	}
	match := MatchExact
	if !exact {
		match = MatchFamily
		item.Canonical = normalized
	}
	if familyID == "" {
		familyID = data.snapshot.DefaultFamily
		match = MatchDefault
	}
	familyProfile := data.families[familyID]
	profile := Profile{
		Canonical:                  item.Canonical,
		Family:                     familyID,
		TtftMs:                     familyProfile.TtftMs,
		ThroughputTPS:              familyProfile.ThroughputTPS,
		RepresentativeOutputTokens: familyProfile.RepresentativeOutputTokens,
		MaxIncidentHours:           familyProfile.MaxIncidentHours,
		OpenRouterRank:             item.OpenRouterRank,
		AIHubMixRank:               item.AIHubMixRank,
		Match:                      match,
	}
	if item.TtftMs > 0 {
		profile.TtftMs = item.TtftMs
		profile.ThroughputTPS = item.ThroughputTPS
	}
	profile.Vendor, profile.VendorIcon = item.Vendor, item.VendorIcon
	if profile.Vendor == "" {
		for _, candidate := range data.snapshot.Vendors {
			for _, prefix := range candidate.Prefixes {
				if strings.HasPrefix(normalized, normalize(prefix)) {
					profile.Vendor, profile.VendorIcon = candidate.Name, candidate.Icon
					return profile
				}
			}
		}
	}
	return profile
}

func matchingFamily(families []family, model string) string {
	for _, candidate := range families {
		for _, match := range candidate.Matches {
			if strings.Contains(model, normalize(match)) {
				return candidate.ID
			}
		}
	}
	return ""
}

func normalize(value string) string {
	value = strings.TrimSpace(strings.ToLower(value))
	if slash := strings.LastIndexByte(value, '/'); slash >= 0 {
		value = value[slash+1:]
	}
	value = strings.NewReplacer("_", "-", ".", "-").Replace(value)
	for strings.Contains(value, "--") {
		value = strings.ReplaceAll(value, "--", "-")
	}
	return strings.Trim(value, "-")
}
