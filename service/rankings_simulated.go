package service

import (
	"cmp"
	"hash/fnv"
	"maps"
	"math"
	"slices"
	"time"

	"github.com/QuantumNous/new-api/internal/marketsim"
	"github.com/QuantumNous/new-api/model"
)

// SimulatedRankingsSnapshot uses only the caller's visible catalog. Its token
// counts are presentation data and never enter usage storage or billing.
func SimulatedRankingsSnapshot(period string, catalog []model.Pricing, vendors []model.PricingVendor, now time.Time) (*RankingsResponse, error) {
	config, err := rankingConfig(period)
	if err != nil {
		return nil, err
	}
	meta := buildRankingModelMeta(catalog, vendors)
	delete(meta, "")
	names := slices.Sorted(maps.Keys(meta))
	currentTotals := make([]model.RankingQuotaTotal, len(names))
	previousTotals := make([]model.RankingQuotaTotal, len(names))
	weights := make([]float64, len(names))
	baseWeights := make([]float64, len(names))
	phases := make([]float64, len(names))
	profiles := make([]marketsim.Profile, len(names))
	canonicalProfiles := make(map[string]marketsim.Profile, len(names))
	aliasCounts := make(map[string]int, len(names))
	for i, name := range names {
		profile := marketsim.ResolveModel(name)
		profiles[i] = profile
		canonicalProfiles[profile.Canonical] = profile
		aliasCounts[profile.Canonical]++
		item := meta[name]
		if item.vendor == rankingUnknownVendor && profile.Vendor != "" {
			item.vendor, item.vendorIcon = profile.Vendor, profile.VendorIcon
		} else if item.vendorIcon == "" && item.vendor == profile.Vendor {
			item.vendorIcon = profile.VendorIcon
		}
		meta[name] = item
		currentTotals[i].ModelName = name
		previousTotals[i].ModelName = name
	}
	canonicalWeights := rankingPopularityWeights(canonicalProfiles)
	for i, profile := range profiles {
		baseWeights[i] = canonicalWeights[profile.Canonical] / float64(aliasCounts[profile.Canonical])
		hash := fnv.New64a()
		_, _ = hash.Write([]byte("rankings\x00" + profile.Canonical))
		phases[i] = float64(hash.Sum64()%6283) / 1000
	}

	// Every period integrates the same daily budgets and intraday curve. The
	// five-minute boundary keeps repeated requests stable without sharing a
	// catalog-dependent simulation cache between viewers.
	now = now.Truncate(5 * time.Minute)
	start, end := rankingTimeRange(config, now)
	previousStart, _ := previousRankingTimeRange(config, start)
	const daySeconds int64 = 24 * 3600
	buckets := make(map[int64][]int64)
	for dayStart := previousStart / daySeconds * daySeconds; dayStart < end && len(names) > 0; dayStart += daySeconds {
		day := float64(dayStart / daySeconds)
		weightSum := 0.0
		for i := range names {
			weights[i] = baseWeights[i] * (1 + 0.055*math.Sin(day/13+phases[i]) + 0.025*math.Sin(day/41+2*phases[i]))
			weightSum += weights[i]
		}
		dailyTotal := rankingDailyTokenTotal(dayStart)
		remaining := dailyTotal
		dailyTokens := make([]int64, len(names))
		for i := range names {
			dailyTokens[i] = int64(float64(dailyTotal) * weights[i] / weightSum)
			if i == len(names)-1 {
				dailyTokens[i] = remaining
			}
			remaining -= dailyTokens[i]
		}
		previousFrom, previousTo := max(dayStart, previousStart), min(dayStart+daySeconds, start)
		if previousFrom < previousTo {
			from := rankingIntradayFraction(previousFrom - dayStart)
			to := rankingIntradayFraction(previousTo - dayStart)
			for i, tokens := range dailyTokens {
				previousTotals[i].TotalTokens += int64(float64(tokens)*to) - int64(float64(tokens)*from)
			}
		}
		for from := max(dayStart, start); from < min(dayStart+daySeconds, end); {
			bucket := from / config.bucketSize * config.bucketSize
			to := min(dayStart+daySeconds, end, bucket+config.bucketSize)
			if buckets[bucket] == nil {
				buckets[bucket] = make([]int64, len(names))
			}
			fromFraction := rankingIntradayFraction(from - dayStart)
			toFraction := rankingIntradayFraction(to - dayStart)
			for i, tokens := range dailyTokens {
				count := int64(float64(tokens)*toFraction) - int64(float64(tokens)*fromFraction)
				currentTotals[i].TotalTokens += count
				buckets[bucket][i] += count
			}
			from = to
		}
	}
	currentBuckets := make([]model.RankingQuotaBucket, 0, len(buckets)*len(names))
	for _, bucket := range slices.Sorted(maps.Keys(buckets)) {
		for i, tokens := range buckets[bucket] {
			currentBuckets = append(currentBuckets, model.RankingQuotaBucket{ModelName: names[i], Bucket: bucket, Tokens: tokens})
		}
	}
	compareTotals := func(a, b model.RankingQuotaTotal) int {
		if order := cmp.Compare(b.TotalTokens, a.TotalTokens); order != 0 {
			return order
		}
		return cmp.Compare(a.ModelName, b.ModelName)
	}
	slices.SortFunc(currentTotals, compareTotals)
	slices.SortFunc(previousTotals, compareTotals)
	return buildRankingsResponse(currentTotals, currentBuckets, previousTotals, meta, config), nil
}

func rankingPopularityWeights(profiles map[string]marketsim.Profile) map[string]float64 {
	openRouterScores := make(map[string]float64, len(profiles))
	aiHubMixScores := make(map[string]float64, len(profiles))
	openRouterTotal, aiHubMixTotal := 0.0, 0.0
	for canonical, profile := range profiles {
		if profile.OpenRouterRank > 0 {
			score := 1 / math.Pow(float64(profile.OpenRouterRank), 0.85)
			openRouterScores[canonical] = score
			openRouterTotal += score
		}
		if profile.AIHubMixRank > 0 {
			score := 1 / math.Pow(float64(profile.AIHubMixRank), 0.85)
			aiHubMixScores[canonical] = score
			aiHubMixTotal += score
		}
	}
	weights := make(map[string]float64, len(profiles))
	familyTotals := make(map[string]float64)
	familyCounts := make(map[string]int)
	minimumListed := math.MaxFloat64
	for canonical, profile := range profiles {
		weight := 0.0
		if openRouterTotal > 0 {
			weight += 0.6 * openRouterScores[canonical] / openRouterTotal
		}
		if aiHubMixTotal > 0 {
			weight += 0.4 * aiHubMixScores[canonical] / aiHubMixTotal
		}
		if weight == 0 {
			continue
		}
		weights[canonical] = weight
		familyTotals[profile.Family] += weight
		familyCounts[profile.Family]++
		minimumListed = min(minimumListed, weight)
	}
	if minimumListed == math.MaxFloat64 {
		for canonical := range profiles {
			weights[canonical] = 1
		}
		return weights
	}
	for canonical, profile := range profiles {
		if weights[canonical] > 0 {
			continue
		}
		weight := minimumListed * 0.25
		if familyCounts[profile.Family] > 0 {
			familyAverage := familyTotals[profile.Family] / float64(familyCounts[profile.Family])
			weight = max(weight, familyAverage*0.12)
		}
		weights[canonical] = weight
	}
	return weights
}

func rankingDailyTokenTotal(dayStart int64) int64 {
	weekdayFactor := [...]float64{0.86, 1, 1.03, 1.05, 1.04, 0.98, 0.88}
	weekday := time.Unix(dayStart, 0).UTC().Weekday()
	day := float64(dayStart / (24 * 3600))
	longCycle := 1 + 0.055*math.Sin(day/37) + 0.035*math.Cos(day/91)
	return int64(math.Round(50_000_000 * weekdayFactor[weekday] * longCycle))
}

// rankingIntradayFraction is the cumulative daily usage curve (0..1).
// Taking differences of cumulative integer counts preserves exact totals when
// a day is split into hours, rolling-window boundaries or weekly buckets.
func rankingIntradayFraction(seconds int64) float64 {
	if seconds <= 0 {
		return 0
	}
	if seconds >= 24*3600 {
		return 1
	}
	fraction := float64(seconds) / (24 * 3600)
	return fraction + 0.3/(2*math.Pi)*(math.Sin(2*math.Pi*(fraction-1.0/3))-math.Sin(-2*math.Pi/3))
}
