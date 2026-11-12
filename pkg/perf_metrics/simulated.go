package perfmetrics

import (
	"hash/fnv"
	"math"
	"slices"
	"strconv"
	"time"

	"github.com/QuantumNous/new-api/internal/marketsim"
)

// SimulatedQuery builds a presentation-only view without reading performance
// storage. The caller supplies the model's currently visible groups.
func SimulatedQuery(params QueryParams, now time.Time) QueryResult {
	start, end := queryWindow(now, params.Hours)
	result := QueryResult{
		ModelName: params.Model, SeriesSchema: seriesSchema,
		WindowStart: start, WindowEnd: end,
		Series: []BucketPoint{}, Groups: []GroupResult{},
	}
	groups := slices.Sorted(slices.Values(params.AllowedGroups))
	groups = slices.Compact(groups)
	profile := marketsim.ResolveModel(params.Model)
	var total simulatedTotals
	for _, group := range groups {
		if params.Group != "" && params.Group != group {
			continue
		}
		row := GroupResult{Group: group, Series: []BucketPoint{}}
		var groupTotal simulatedTotals
		for ts := start; ts <= end; ts += 3600 {
			point := simulatedPoint(profile, params.Model, group, ts)
			row.Series = append(row.Series, point)
			groupTotal.add(point)
			total.add(point)
		}
		average := groupTotal.point(0)
		row.AvgTtftMs, row.AvgLatencyMs = average.AvgTtftMs, average.AvgLatencyMs
		row.SuccessRate, row.AvgTps = average.SuccessRate, average.AvgTps
		result.Groups = append(result.Groups, row)
	}
	if total.count == 0 {
		return result
	}
	average := total.point(0)
	result.Summary = &Summary{SuccessRate: average.SuccessRate, AvgLatencyMs: average.AvgLatencyMs, AvgTps: average.AvgTps}
	for i := range result.Groups[0].Series {
		var hour simulatedTotals
		for _, group := range result.Groups {
			hour.add(group.Series[i])
		}
		result.Series = append(result.Series, hour.point(start+int64(i)*3600))
	}
	return result
}

// SimulatedSummary shares the exact same samples as the model detail view.
// Catalog order is stable and independent of real traffic or failures.
func SimulatedSummary(models map[string][]string, hours int, recentModels []string, now time.Time) SummaryAllResult {
	start, end := queryWindow(now, hours)
	result := SummaryAllResult{WindowStart: start, WindowEnd: end, Models: []ModelSummary{}}
	var total simulatedTotals
	names := make([]string, 0, len(models))
	for name := range models {
		names = append(names, name)
	}
	slices.Sort(names)
	for _, name := range names {
		metrics := SimulatedQuery(QueryParams{Model: name, Hours: hours, AllowedGroups: models[name]}, now)
		if metrics.Summary == nil {
			continue
		}
		series := make([]SuccessRatePoint, 0, min(len(metrics.Series), recentSuccessSampleLimit))
		for _, point := range metrics.Series[max(0, len(metrics.Series)-recentSuccessSampleLimit):] {
			series = append(series, SuccessRatePoint{Ts: point.Ts, SuccessRate: point.SuccessRate})
		}
		result.Models = append(result.Models, ModelSummary{
			ModelName: name, SuccessRate: metrics.Summary.SuccessRate,
			AvgLatencyMs: metrics.Summary.AvgLatencyMs, AvgTps: metrics.Summary.AvgTps,
			RecentSuccessSeries: series,
		})
		if slices.Contains(recentModels, name) {
			if result.RecentSuccessSeries == nil {
				result.RecentSuccessSeries = map[string][]SuccessRatePoint{}
			}
			result.RecentSuccessSeries[name] = series
		}
		for _, group := range metrics.Groups {
			for _, point := range group.Series {
				total.add(point)
			}
		}
	}
	if total.count > 0 {
		average := total.point(0)
		result.Summary = &Summary{SuccessRate: average.SuccessRate, AvgLatencyMs: average.AvgLatencyMs, AvgTps: average.AvgTps}
	}
	return result
}

func simulatedPoint(profile marketsim.Profile, model, group string, ts int64) BucketPoint {
	groupFactor := 0.94 + stableUnit(profile.Canonical, group, "group")*0.12
	localHour := time.Unix(ts, 0).UTC().Add(8 * time.Hour).Hour()
	peakLoad := 0.5 + 0.5*math.Sin(2*math.Pi*(float64(localHour)-8)/24)
	latencyLoad := 0.92 + 0.18*peakLoad
	throughputLoad := 1.08 - 0.16*peakLoad
	hour := strconv.FormatInt(ts/3600, 10)
	ttftJitter := 0.96 + stableUnit(profile.Canonical, group, "ttft", hour)*0.08
	tpsJitter := 0.96 + stableUnit(profile.Canonical, group, "tps", hour)*0.08
	ttft := int64(math.Round(float64(profile.TtftMs) * groupFactor * latencyLoad * ttftJitter))
	tps := profile.ThroughputTPS * (2 - groupFactor) * throughputLoad * tpsJitter
	tps = max(1, math.Round(tps*100)/100)
	latency := ttft + int64(math.Round(float64(profile.RepresentativeOutputTokens)/tps*1000))
	return BucketPoint{
		Ts:           ts,
		AvgTtftMs:    max(1, ttft),
		AvgLatencyMs: max(1, latency),
		SuccessRate:  simulatedSuccessRate(profile, model, ts),
		AvgTps:       tps,
	}
}

func simulatedSuccessRate(profile marketsim.Profile, model string, ts int64) float64 {
	if profile.MaxIncidentHours == 0 {
		return 100
	}
	const daySeconds int64 = 24 * 3600
	localTs := ts + 8*3600
	day := localTs / daySeconds
	dayKey := strconv.FormatInt(day, 10)
	incidentCount := int(stableHash(profile.Canonical, model, "incident-count", dayKey) % uint64(profile.MaxIncidentHours+1))
	if incidentCount == 0 {
		return 100
	}
	hour := int(localTs % daySeconds / 3600)
	first := int(stableHash(profile.Canonical, "incident-hour", dayKey) % 24)
	incident := hour == first
	if incidentCount == 2 {
		second := (first + 7 + int(stableHash(profile.Canonical, "incident-hour-2", dayKey)%11)) % 24
		incident = incident || hour == second
	}
	if !incident {
		return 100
	}
	severity := 96.8 + stableUnit(profile.Canonical, "incident-severity", dayKey, strconv.Itoa(hour))*2.5
	return math.Round(severity*100) / 100
}

func stableUnit(parts ...string) float64 {
	return float64(stableHash(parts...)%10001) / 10000
}

func stableHash(parts ...string) uint64 {
	hash := fnv.New64a()
	for _, part := range parts {
		_, _ = hash.Write([]byte(part))
		_, _ = hash.Write([]byte{0})
	}
	return hash.Sum64()
}

type simulatedTotals struct {
	ttft, latency, count int64
	tps, success         float64
}

func (total *simulatedTotals) add(point BucketPoint) {
	total.ttft += point.AvgTtftMs
	total.latency += point.AvgLatencyMs
	total.tps += point.AvgTps
	total.success += point.SuccessRate
	total.count++
}

func (total simulatedTotals) point(ts int64) BucketPoint {
	return BucketPoint{Ts: ts, SuccessRate: math.Round(total.success/float64(total.count)*100) / 100,
		AvgTtftMs: total.ttft / total.count, AvgLatencyMs: total.latency / total.count,
		AvgTps: math.Round(total.tps/float64(total.count)*100) / 100,
	}
}
