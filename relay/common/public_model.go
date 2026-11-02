package common

import (
	"bytes"
	"encoding/json"
	"errors"
	"maps"
	"slices"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/gin-gonic/gin"
)

// BindPublicModel captures the validated client identity before any mapping
// or adaptor rewrite. Retries retain it and never infer it from an upstream
// response. The projection is host policy and is intentionally outside RelayKit.
func (info *RelayInfo) BindPublicModel(c *gin.Context) {
	if info.PublicModelName == "" {
		info.PublicModelName = info.OriginModelName
	}
	if c != nil {
		if c.Request != nil {
			info.publicModelLanguage = i18n.StatedLang(c)
		}
		c.Set(common.ModelIdentityProjectionKey, info)
	}
}

func (info *RelayInfo) RememberPrivateModel(name string) {
	if info == nil {
		return
	}
	info.BindPublicModel(nil)
	if name == "" || name == info.PublicModelName {
		return
	}
	if !slices.Contains(info.privateModelNames, name) {
		info.privateModelNames = append(info.privateModelNames, name)
	}
}

func (info *RelayInfo) PublicModelMessage(message string) string {
	if info == nil {
		return message
	}
	names := slices.Clone(info.privateModelNames)
	if info.ChannelMeta != nil && info.IsModelMapped {
		names = append(names, info.UpstreamModelName)
	}
	if info.ResponseModel != nil && (len(names) > 0 || info.ChannelMeta != nil && info.IsModelMapped) {
		names = append(names, info.ResponseModel.UpstreamModel, info.ResponseModel.ReturnedModel)
	}
	return common.RedactModelNames(message, info.PublicModelName, names...)
}

// ProjectResponseModel edits only documented protocol envelope paths. Parsing
// just those objects as RawMessage also removes duplicate metadata keys while
// leaving generated content, tool JSON and unknown extensions byte-for-byte.
func (info *RelayInfo) ProjectResponseModel(body []byte) ([]byte, error) {
	if info == nil || bytes.Equal(bytes.TrimSpace(body), []byte("[DONE]")) {
		return body, nil
	}
	mapped := len(info.privateModelNames) > 0 || info.ChannelMeta != nil && info.IsModelMapped
	if !mapped {
		return body, nil
	}
	if info.RelayFormat == types.RelayFormatOpenAIAudio && !bytes.HasPrefix(bytes.TrimSpace(body), []byte("{")) {
		return body, nil
	}
	// Native task renderers can return arrays or scalar business results. They
	// have no model envelope, so the host must not interpret their contents.
	if info.RelayFormat == types.RelayFormatTask && !bytes.HasPrefix(bytes.TrimSpace(body), []byte("{")) {
		return body, nil
	}
	if info.PublicModelName == "" && info.RelayFormat != types.RelayFormatTask {
		return nil, errors.New(i18n.Translate(info.publicModelLanguage, i18n.MsgRelayPublicModelUnavailable))
	}
	var fields map[string]json.RawMessage
	if err := common.Unmarshal(body, &fields); err != nil || fields == nil {
		return nil, errors.New(i18n.Translate(info.publicModelLanguage, i18n.MsgRelayInvalidResponseMetadata))
	}
	originalFields := maps.Clone(fields)
	var eventType string
	_ = common.Unmarshal(fields["type"], &eventType)
	var modelContainer string
	switch info.RelayFormat {
	case types.RelayFormatGemini:
		delete(fields, "modelVersion")
	case types.RelayFormatClaude:
		if eventType == "message_start" {
			modelContainer = "message"
		} else if eventType == "message" || eventType == "" {
			info.projectModelObject(fields)
		}
	case types.RelayFormatTask:
		info.projectModelObject(fields)
		if _, exists := fields["model_name"]; exists {
			if info.PublicModelName == "" {
				delete(fields, "model_name")
			} else {
				fields["model_name"], _ = common.Marshal(info.PublicModelName)
			}
		}
		for _, container := range []string{"data", "response"} {
			var nested map[string]json.RawMessage
			if common.Unmarshal(fields[container], &nested) != nil || nested == nil {
				continue
			}
			before := maps.Clone(nested)
			info.projectModelObject(nested)
			if _, exists := nested["model_name"]; exists {
				if info.PublicModelName == "" {
					delete(nested, "model_name")
				} else {
					nested["model_name"], _ = common.Marshal(info.PublicModelName)
				}
			}
			if !maps.EqualFunc(before, nested, func(a, b json.RawMessage) bool { return bytes.Equal(a, b) }) {
				fields[container], _ = common.Marshal(nested)
			}
		}
	case types.RelayFormatOpenAIRealtime:
		switch eventType {
		case "session.created", "session.updated":
			modelContainer = "session"
		case "response.created", "response.done":
			modelContainer = "response"
		}
	default:
		if strings.HasPrefix(eventType, "response.") {
			modelContainer = "response"
		} else {
			info.projectModelObject(fields)
		}
	}
	if raw := fields[modelContainer]; modelContainer != "" && len(raw) > 0 && string(raw) != "null" {
		var nested map[string]json.RawMessage
		if common.Unmarshal(raw, &nested) != nil || nested == nil {
			return nil, errors.New(i18n.Translate(info.publicModelLanguage, i18n.MsgRelayInvalidResponseMetadata))
		}
		before := maps.Clone(nested)
		info.projectModelObject(nested)
		if responseError, exists := nested["error"]; exists {
			nested["error"] = info.projectModelError(responseError)
		}
		if !maps.EqualFunc(before, nested, func(a, b json.RawMessage) bool { return bytes.Equal(a, b) }) {
			fields[modelContainer], _ = common.Marshal(nested)
		}
	}
	if raw, exists := fields["error"]; exists {
		fields["error"] = info.projectModelError(raw)
	}
	if eventType == "error" {
		for _, key := range []string{"message", "code", "param"} {
			if raw, exists := fields[key]; exists {
				fields[key] = info.projectModelError(raw)
			}
		}
	}
	if maps.EqualFunc(originalFields, fields, func(a, b json.RawMessage) bool { return bytes.Equal(a, b) }) {
		return body, nil
	}
	return common.Marshal(fields)
}

func (info *RelayInfo) projectModelObject(fields map[string]json.RawMessage) {
	if _, exists := fields["model"]; exists {
		if info.PublicModelName == "" {
			delete(fields, "model")
		} else {
			fields["model"], _ = common.Marshal(info.PublicModelName)
		}
	}
	for _, key := range []string{"upstream_model_name", "is_model_mapped", "response_model"} {
		delete(fields, key)
	}
}

// All strings inside a protocol's error object are system diagnostics; this
// never walks an output item, a tool argument, or caller-owned metadata.
func (info *RelayInfo) projectModelError(raw json.RawMessage) json.RawMessage {
	var text string
	if bytes.HasPrefix(bytes.TrimSpace(raw), []byte(`"`)) && common.Unmarshal(raw, &text) == nil {
		publicText := info.PublicModelMessage(text)
		if publicText == text {
			return raw
		}
		encoded, _ := common.Marshal(publicText)
		return encoded
	}
	var fields map[string]json.RawMessage
	if common.Unmarshal(raw, &fields) == nil && fields != nil {
		before := maps.Clone(fields)
		for key, value := range fields {
			fields[key] = info.projectModelError(value)
		}
		if maps.EqualFunc(before, fields, func(a, b json.RawMessage) bool { return bytes.Equal(a, b) }) {
			return raw
		}
		encoded, _ := common.Marshal(fields)
		return encoded
	}
	var items []json.RawMessage
	if common.Unmarshal(raw, &items) == nil && items != nil {
		before := slices.Clone(items)
		for i := range items {
			items[i] = info.projectModelError(items[i])
		}
		if slices.EqualFunc(before, items, func(a, b json.RawMessage) bool { return bytes.Equal(a, b) }) {
			return raw
		}
		encoded, _ := common.Marshal(items)
		return encoded
	}
	return raw
}
