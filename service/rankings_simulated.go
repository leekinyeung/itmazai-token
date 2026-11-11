package service

import (
	"cmp"
	"hash/fnv"
	"maps"
	"math"
	"slices"
	"time"

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
	for i, name := range names {
		hash := fnv.New64a()
		_, _ = hash.Write([]byte("rankings\x00" + name))
		seed := hash.Sum64()
		baseWeights[i] = 0.25 + 8*math.Pow(float64(seed%10000)/10000, 3)
		phases[i] = float64(seed%6283) / 1000
		currentTotals[i].ModelName = name
		previousTotals[i].ModelName = name
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
			weights[i] = baseWeights[i] * (1 + 0.38*math.Sin(day/5+phases[i]) + 0.22*math.Sin(day/19+2*phases[i]))
			weightSum += weights[i]
		}
		// Bounded to 1.44–2.56 billion tokens per complete UTC day, with
		// gradual growth and independent weekly/monthly fluctuations.
		dailyTotal := int64(2_000_000_000 * (1 + 0.12*math.Sin(day/17) + 0.08*math.Cos(day/53) + 0.08*math.Tanh((day-20454)/365)))
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
