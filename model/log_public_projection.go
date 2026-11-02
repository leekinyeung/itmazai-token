package model

import (
	"encoding/base64"
	"encoding/json"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/tidwall/gjson"
)

// publicLogOtherJSON is a schema projection, not a blacklist: historical or
// future diagnostic containers cannot accidentally become public. RawMessage
// preserves the precision of accounting quantities and historical identifiers.
func publicLogOtherJSON(values map[string]json.RawMessage) string {
	projected := make(map[string]json.RawMessage)
	for key, raw := range values {
		switch key {
		case "public_id", "model_ratio", "model_price", "group_ratio", "completion_ratio", "user_group_ratio",
			"frt", "cache_tokens", "image_cache_tokens", "cache_ratio", "cache_write_tokens",
			"cache_creation_tokens", "cache_creation_tokens_5m", "cache_creation_tokens_1h", "cache_creation_tokens_12h",
			"cache_creation_ratio", "cache_creation_ratio_5m", "cache_creation_ratio_1h", "cache_creation_ratio_12h",
			"audio_input", "audio_output", "text_input", "text_output", "audio_ratio", "audio_completion_ratio",
			"audio_input_token_count", "audio_input_price", "fixed_price", "image_count", "image_ratio", "image_output",
			"input_tokens_total", "fee_quota", "pre_consumed_quota", "actual_quota", "status_code",
			"web_search_call_count", "web_search_price", "file_search_call_count", "file_search_price",
			"image_generation_call_price", "image_generation_call_count", "subscription_id", "subscription_plan_id",
			"subscription_pre_consumed", "subscription_post_delta", "subscription_consumed", "subscription_remain",
			"subscription_total", "subscription_used", "wallet_quota_deducted":
			if gjson.ParseBytes(raw).Type == gjson.Number {
				projected[key] = raw
			}
		case "ws", "audio", "claude", "image", "web_search", "file_search", "image_generation_call",
			"audio_input_seperate_price", "is_system_prompt_overwritten", "is_task", "task_sync", "result_discarded", "violation_fee":
			v := gjson.ParseBytes(raw)
			if v.Type == gjson.True || v.Type == gjson.False {
				projected[key] = raw
			}
		case "request_path", "reasoning_effort", "billing_mode", "billing_source", "billing_preference", "billing_unit",
			"subscription_plan_title", "task_id", "reason", "usage_semantic", "group", "matched_tier",
			"expr_b64", "error_type", "error_code", "violation_fee_code", "violation_fee_marker", "login_method", "user_agent":
			if gjson.ParseBytes(raw).Type == gjson.String {
				projected[key] = raw
			}
		case "billing_tokens", "usage_facts":
			var facts map[string]json.RawMessage
			if common.Unmarshal(raw, &facts) != nil || facts == nil {
				continue
			}
			for name, fact := range facts {
				v := gjson.ParseBytes(fact)
				if sensitiveModelMetadataKey(name) || (v.Type != gjson.Number && v.Type != gjson.String && v.Type != gjson.True && v.Type != gjson.False) {
					delete(facts, name)
				}
			}
			projected[key], _ = common.Marshal(facts)
		case "stream_status":
			var status map[string]json.RawMessage
			if common.Unmarshal(raw, &status) != nil {
				continue
			}
			public := make(map[string]json.RawMessage)
			for _, name := range []string{"status", "end_reason", "error_count", "response_status"} {
				v := gjson.ParseBytes(status[name])
				if v.Type == gjson.String || v.Type == gjson.Number {
					public[name] = status[name]
				}
			}
			projected[key], _ = common.Marshal(public)
		case "content_parts", "op", "tool_surcharges", "request_conversion", "request_rules":
			// These are host-owned structures. Remove privileged metadata even
			// from historical copies nested inside their extension fields.
			projected[key] = stripLogModelMetadata(raw)
		}
	}
	// A copied alias can also occur in a value, audit text, or encoded pricing
	// source. Drop that optional field rather than rewriting pricing or text.
	for _, name := range logPrivateModelNames(values) {
		for key, raw := range projected {
			text := string(raw)
			if key == "expr_b64" {
				decoded, _ := base64.StdEncoding.DecodeString(gjson.ParseBytes(raw).String())
				text = string(decoded)
			}
			encoded, _ := common.Marshal(name)
			if strings.Contains(text, name) || strings.Contains(text, strings.Trim(string(encoded), `"`)) {
				delete(projected, key)
			}
		}
	}
	result, err := common.Marshal(projected)
	if err != nil {
		return "{}"
	}
	return string(result)
}

func sensitiveModelMetadataKey(key string) bool {
	key = strings.ToLower(strings.ReplaceAll(strings.ReplaceAll(key, "_", ""), "-", ""))
	switch key {
	case "model", "modelname", "upstreammodel", "upstreammodelname", "actualmodel", "actualmodelname",
		"returnedmodel", "originmodelname", "ismodelmapped", "responsemodel", "admininfo", "rootinfo", "auditinfo", "po":
		return true
	}
	return false
}

// This recursive removal is confined to log metadata, never protocol response
// bodies, generated content, or tool arguments.
func stripLogModelMetadata(raw json.RawMessage) json.RawMessage {
	value := gjson.ParseBytes(raw)
	if value.IsObject() {
		var fields map[string]json.RawMessage
		if common.Unmarshal(raw, &fields) != nil {
			return json.RawMessage(`null`)
		}
		for key, item := range fields {
			if sensitiveModelMetadataKey(key) {
				delete(fields, key)
			} else {
				fields[key] = stripLogModelMetadata(item)
			}
		}
		encoded, _ := common.Marshal(fields)
		return encoded
	}
	if value.IsArray() {
		var items []json.RawMessage
		if common.Unmarshal(raw, &items) != nil {
			return json.RawMessage(`null`)
		}
		for i := range items {
			items[i] = stripLogModelMetadata(items[i])
		}
		encoded, _ := common.Marshal(items)
		return encoded
	}
	return raw
}

func logPrivateModelNames(values map[string]json.RawMessage) []string {
	var names []string
	var adminFields map[string]json.RawMessage
	_ = common.Unmarshal(values[logOtherAdminInfoKey], &adminFields)
	for _, scope := range []map[string]json.RawMessage{values, adminFields} {
		for _, key := range []string{"upstream_model_name", "response_model"} {
			value := gjson.ParseBytes(scope[key])
			if key == "upstream_model_name" && value.Type == gjson.String && value.Str != "" {
				names = append(names, value.Str)
			}
			if key == "response_model" {
				for _, field := range []string{"upstream_model", "returned_model"} {
					if name := value.Get(field).Str; name != "" && name != value.Get("requested_model").Str {
						names = append(names, name)
					}
				}
			}
		}
	}
	return names
}

func publicUserLog(log *Log) *Log {
	if log == nil {
		return nil
	}
	result := *log
	result.ChannelName = ""
	result.Other = formatLogOtherJSON(log.Other, logOtherVisibilityUser)
	var metadata map[string]json.RawMessage
	raw := log.Other
	if strings.HasPrefix(strings.TrimSpace(raw), `"`) {
		var decoded string
		if common.UnmarshalJsonStr(raw, &decoded) == nil {
			raw = decoded
		}
	}
	if common.UnmarshalJsonStr(raw, &metadata) == nil {
		result.Content = common.RedactModelNames(result.Content, log.ModelName, logPrivateModelNames(metadata)...)
	} else if log.Type == LogTypeConsume || log.Type == LogTypeRefund {
		result.Content = ""
	}
	if log.Type == LogTypeError {
		// Historical error prose can contain a route alias even when its
		// metadata is corrupt. Stable type/code/status and request_id retain
		// diagnostic value without exposing unstructured upstream text.
		values := gjson.Parse(result.Other)
		result.Content = values.Get("error_code").Str
		if status := values.Get("status_code"); status.Exists() {
			result.Content += " (" + status.Raw + ")"
		}
		var fields map[string]json.RawMessage
		if common.UnmarshalJsonStr(result.Other, &fields) == nil {
			delete(fields, logOtherContentPartsKey)
			encoded, _ := common.Marshal(fields)
			result.Other = string(encoded)
		}
	}
	return &result
}
