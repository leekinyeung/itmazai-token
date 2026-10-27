package perfmetrics

import (
	"hash/fnv"
	"math"
	"slices"
	"strconv"
	"time"
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
	var total simulatedTotals
	for _, group := range groups {
		if params.Group != "" && params.Group != group {
			continue
		}
		row := GroupResult{Group: group, SuccessRate: 100, Series: []BucketPoint{}}
		var groupTotal simulatedTotals
		for ts := start; ts <= end; ts += 3600 {
			point := BucketPoint{
				Ts: ts, SuccessRate: 100,
				AvgTtftMs:    int64(simulatedValue(params.Model, group, "ttft", ts, 150, 250)),
				AvgLatencyMs: int64(simulatedValue(params.Model, group, "latency", ts, 600, 1200)),
				AvgTps:       simulatedValue(params.Model, group, "tps", ts, 80, 160),
			}
			row.Series = append(row.Series, point)
			groupTotal.add(point)
			total.add(point)
		}
		average := groupTotal.point(0)
		row.AvgTtftMs, row.AvgLatencyMs, row.AvgTps = average.AvgTtftMs, average.AvgLatencyMs, average.AvgTps
		result.Groups = append(result.Groups, row)
	}
	if total.count == 0 {
		return result
	}
	average := total.point(0)
	result.Summary = &Summary{SuccessRate: 100, AvgLatencyMs: average.AvgLatencyMs, AvgTps: average.AvgTps}
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
			series = append(series, SuccessRatePoint{Ts: point.Ts, SuccessRate: 100})
		}
		result.Models = append(result.Models, ModelSummary{
			ModelName: name, SuccessRate: 100,
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
		result.Summary = &Summary{SuccessRate: 100, AvgLatencyMs: average.AvgLatencyMs, AvgTps: average.AvgTps}
	}
	return result
}

func simulatedValue(model, group, metric string, ts int64, low, high float64) float64 {
	seed := model + "\x00" + group + "\x00" + metric
	hash := fnv.New64a()
	_, _ = hash.Write([]byte(seed))
	// Leave room for the full jitter so boundary clipping does not flatten
	// otherwise distinct hourly samples.
	baseLow, baseHigh := low/0.95, high/1.05
	base := baseLow + float64(hash.Sum64()%10001)/10000*(baseHigh-baseLow)
	_, _ = hash.Write([]byte(strconv.FormatInt(ts/3600, 10)))
	jitter := float64(hash.Sum64()%1001)/10000 - 0.05
	precision := 1.0
	if metric == "tps" {
		precision = 100
	}
	// Keep rounding inside both the display range and the baseline's ±5% band.
	minimum := math.Ceil(max(low, base*0.95) * precision)
	maximum := math.Floor(min(high, base*1.05) * precision)
	value := math.Round(base * (1 + jitter) * precision)
	return min(maximum, max(minimum, value)) / precision
}

type simulatedTotals struct {
	ttft, latency, count int64
	tps                  float64
}

func (total *simulatedTotals) add(point BucketPoint) {
	total.ttft += point.AvgTtftMs
	total.latency += point.AvgLatencyMs
	total.tps += point.AvgTps
	total.count++
}

func (total simulatedTotals) point(ts int64) BucketPoint {
	return BucketPoint{Ts: ts, SuccessRate: 100,
		AvgTtftMs: total.ttft / total.count, AvgLatencyMs: total.latency / total.count,
		AvgTps: math.Round(total.tps/float64(total.count)*100) / 100,
	}
}
