package service

import (
	"maps"
	"slices"
	"strings"
	"sync"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/pkg/billingexpr"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/relaykit/types"
	hosttypes "github.com/QuantumNous/new-api/types"
	"github.com/gin-gonic/gin"
	"github.com/tidwall/gjson"
)

const fallbackExecutionContextKey = "fallback_execution_state"

type FallbackTargetSkip struct {
	Target FallbackTarget `json:"target"`
	Reason string         `json:"reason"`
}

// FallbackExecutionState records the ordered target snapshot for one optional
// upstream attempt appended to the existing conversation retry loop.
type FallbackExecutionState struct {
	Revision             int64                `json:"revision"`
	CallType             string               `json:"call_type"`
	PublicModel          string               `json:"public_model"`
	Targets              []FallbackTarget     `json:"targets"`
	CandidateTargets     []FallbackTarget     `json:"candidate_targets"`
	TargetSkips          []FallbackTargetSkip `json:"target_skips,omitempty"`
	RequiredCapabilities []string             `json:"required_capabilities"`
	SelectedModel        string               `json:"selected_model,omitempty"`
	ChannelID            int                  `json:"channel_id,omitempty"`
	UpstreamModel        string               `json:"upstream_model,omitempty"`
	Triggered            bool                 `json:"triggered"`
	Succeeded            bool                 `json:"succeeded"`
	Termination          string               `json:"termination,omitempty"`

	frozenPrice                 hosttypes.PriceData
	frozenRatios                map[string]float64
	frozenOriginModelName       string
	frozenUpstreamModelName     string
	frozenPublicModelName       string
	frozenBillingModelName      string
	frozenUsingGroup            string
	frozenTieredBilling         *billingexpr.BillingSnapshot
	frozenBillingInput          *billingexpr.RequestInput
	frozenBillingImageCount     *int
	frozenImageRequestCount     int
	frozenImageQuotaBeforeGroup float64
	billingFrozen               bool
	mu                          sync.Mutex
}

func PrepareFallbackExecution(c *gin.Context, info *relaycommon.RelayInfo) error {
	if c == nil || info == nil || info.IsChannelTest || c.Request == nil || GetChannelConstraints(c).SuppressesRetry() {
		return nil
	}
	callType := fallbackCallType(info)
	if callType == "" {
		return nil
	}
	snapshot, err := CurrentFallbackSnapshot()
	if err != nil {
		common.SysError(common.LogText("load fallback configuration failed: %s", err.Error()))
		return nil
	}
	if !snapshot.Document.Settings.Enabled || len(snapshot.Document.Targets) == 0 {
		return nil
	}
	storage, err := common.GetBodyStorage(c)
	if err != nil {
		return err
	}
	if !fallbackConversationReplaySafe(info, storage) {
		return nil
	}
	requiredCapabilities := fallbackRequestCapabilities(c)
	if info.IsStream && !slices.Contains(requiredCapabilities, model.ModelCapabilityStreaming) {
		requiredCapabilities = append(requiredCapabilities, model.ModelCapabilityStreaming)
		slices.Sort(requiredCapabilities)
	}
	seenModels := make(map[string]struct{}, len(snapshot.Document.Targets))
	modelNames := make([]string, 0, len(snapshot.Document.Targets))
	for _, target := range snapshot.Document.Targets {
		if _, exists := seenModels[target.Model]; !exists {
			seenModels[target.Model] = struct{}{}
			modelNames = append(modelNames, target.Model)
		}
	}
	metadata, err := model.ResolveModelCapabilityMetadata(modelNames)
	if err != nil {
		return err
	}
	candidates := make([]FallbackTarget, 0, len(snapshot.Document.Targets))
	skips := make([]FallbackTargetSkip, 0)
	channels := make(map[int]*model.Channel, len(snapshot.Document.Targets))
	unavailableChannels := make(map[int]struct{})
	for _, target := range snapshot.Document.Targets {
		item := metadata[target.Model]
		skipReason := ""
		switch {
		case item.Status != model.ModelCapabilityMetadataComplete:
			skipReason = "capability_metadata_" + item.Status
		case slices.ContainsFunc(requiredCapabilities, func(required string) bool {
			return !slices.Contains(item.Capabilities, required)
		}):
			skipReason = "capability_mismatch"
		default:
			channel := channels[target.ChannelID]
			_, unavailable := unavailableChannels[target.ChannelID]
			if channel == nil && !unavailable {
				var loadErr error
				channel, loadErr = model.CacheGetChannel(target.ChannelID)
				if loadErr != nil || channel == nil {
					unavailableChannels[target.ChannelID] = struct{}{}
				} else {
					channels[target.ChannelID] = channel
				}
			}
			switch {
			case channel == nil:
				skipReason = "channel_unavailable"
			case channel.Status != common.ChannelStatusEnabled:
				skipReason = "channel_disabled"
			case !fallbackChannelHasModel(channel, target.Model):
				skipReason = "model_not_configured"
			case !fallbackConversationChannelSupports(channel, target.Model):
				skipReason = "protocol_unsupported"
			}
		}
		if skipReason != "" {
			skips = append(skips, FallbackTargetSkip{Target: target, Reason: skipReason})
			continue
		}
		candidates = append(candidates, target)
	}
	if len(candidates) == 0 {
		return nil
	}
	publicModel := info.PublicModelName
	if publicModel == "" {
		publicModel = info.OriginModelName
	}
	c.Set(fallbackExecutionContextKey, &FallbackExecutionState{
		Revision: snapshot.Revision, CallType: callType, PublicModel: publicModel,
		Targets: slices.Clone(snapshot.Document.Targets), CandidateTargets: candidates,
		TargetSkips: skips, RequiredCapabilities: requiredCapabilities,
	})
	return nil
}

func FallbackTargetsForRequest(c *gin.Context) []FallbackTarget {
	state := fallbackState(c)
	if state == nil {
		return nil
	}
	state.mu.Lock()
	defer state.mu.Unlock()
	return slices.Clone(state.CandidateTargets)
}

func IsFallbackAttempt(c *gin.Context) bool {
	state := fallbackState(c)
	if state == nil {
		return false
	}
	state.mu.Lock()
	defer state.mu.Unlock()
	return state.Triggered
}

func RecordFallbackTargetSkip(c *gin.Context, target FallbackTarget, reason string) {
	state := fallbackState(c)
	if state == nil || reason == "" {
		return
	}
	state.mu.Lock()
	defer state.mu.Unlock()
	state.TargetSkips = append(state.TargetSkips, FallbackTargetSkip{Target: target, Reason: reason})
}

// CanAttemptFallback enforces the same response-safety boundary already used
// by the relay: the extra attempt is only possible before anything was sent to
// the client and while the client request is still alive.
func CanAttemptFallback(c *gin.Context, info *relaycommon.RelayInfo, apiErr *types.NewAPIError) bool {
	state := fallbackState(c)
	if state == nil || c == nil || info == nil || apiErr == nil || c.Request == nil {
		return false
	}
	if c.Request.Context().Err() != nil || c.Writer.Written() || info.HasSendResponse() {
		state.setTermination("response_committed_or_cancelled")
		return false
	}
	return true
}

func ShouldAttemptFallbackAfterRetry(decision PolicyDecision, retryIndex, retryLimit int) bool {
	return decision.Reason == "attempt_budget_exhausted" ||
		decision.Action == "retry" && retryIndex >= retryLimit
}

func BeginFallbackAttempt(c *gin.Context, target FallbackTarget, channel *model.Channel) bool {
	state := fallbackState(c)
	if state == nil || channel == nil || target.ChannelID <= 0 || target.Model == "" {
		return false
	}
	state.mu.Lock()
	defer state.mu.Unlock()
	if state.Triggered || !slices.Contains(state.CandidateTargets, target) || channel.Id != target.ChannelID ||
		channel.Status != common.ChannelStatusEnabled || !fallbackChannelHasModel(channel, target.Model) ||
		!fallbackConversationChannelSupports(channel, target.Model) {
		return false
	}
	state.Triggered = true
	state.SelectedModel = target.Model
	state.ChannelID = channel.Id
	state.Termination = ""
	return true
}

func RecordFallbackResult(c *gin.Context, info *relaycommon.RelayInfo, apiErr *types.NewAPIError) {
	state := fallbackState(c)
	if state == nil {
		return
	}
	state.mu.Lock()
	defer state.mu.Unlock()
	if info != nil && info.ChannelMeta != nil {
		state.ChannelID = info.ChannelId
		state.UpstreamModel = info.UpstreamModelName
	}
	if apiErr == nil {
		state.Succeeded = true
		state.Termination = "fallback_succeeded"
		return
	}
	state.Termination = "fallback_failed"
}

func FreezeFallbackBilling(c *gin.Context, info *relaycommon.RelayInfo) {
	state := fallbackState(c)
	if state == nil || info == nil {
		return
	}
	state.mu.Lock()
	defer state.mu.Unlock()
	state.frozenPrice = info.PriceData
	state.frozenRatios = info.PriceData.OtherRatios()
	state.frozenOriginModelName = info.OriginModelName
	state.frozenUpstreamModelName = info.OriginModelName
	if info.ChannelMeta != nil {
		state.frozenUpstreamModelName = info.UpstreamModelName
	}
	state.frozenPublicModelName = info.PublicModelName
	state.frozenBillingModelName = info.BillingModelName
	state.frozenUsingGroup = info.UsingGroup
	state.frozenTieredBilling = cloneFallbackBillingSnapshot(info.TieredBillingSnapshot)
	state.frozenBillingInput = cloneFallbackBillingRequestInput(info.BillingRequestInput)
	if info.BillingImageCount != nil {
		state.frozenBillingImageCount = common.GetPointer(*info.BillingImageCount)
	}
	state.frozenImageRequestCount = info.ImageRequestCount
	state.frozenImageQuotaBeforeGroup = info.ImageQuotaBeforeGroup
	state.billingFrozen = true
}

func RestoreFallbackBilling(c *gin.Context, info *relaycommon.RelayInfo) {
	state := fallbackState(c)
	if state == nil || info == nil {
		return
	}
	state.mu.Lock()
	defer state.mu.Unlock()
	if !state.billingFrozen {
		return
	}
	info.PriceData = state.frozenPrice
	info.PriceData.ReplaceOtherRatios(state.frozenRatios)
	info.OriginModelName = state.frozenOriginModelName
	if info.ChannelMeta != nil {
		info.UpstreamModelName = state.frozenUpstreamModelName
	}
	info.PublicModelName = state.frozenPublicModelName
	info.BillingModelName = state.frozenBillingModelName
	info.UsingGroup = state.frozenUsingGroup
	common.SetContextKey(c, constant.ContextKeyUsingGroup, state.frozenUsingGroup)
	common.SetContextKey(c, constant.ContextKeyOriginalModel, state.frozenOriginModelName)
	info.TieredBillingSnapshot = cloneFallbackBillingSnapshot(state.frozenTieredBilling)
	info.BillingRequestInput = cloneFallbackBillingRequestInput(state.frozenBillingInput)
	if state.frozenBillingImageCount == nil {
		info.BillingImageCount = nil
	} else {
		info.BillingImageCount = common.GetPointer(*state.frozenBillingImageCount)
	}
	info.ImageRequestCount = state.frozenImageRequestCount
	info.ImageQuotaBeforeGroup = state.frozenImageQuotaBeforeGroup
	if info.Request != nil {
		info.Request.SetModelName(state.frozenOriginModelName)
	}
}

// ApplyFallbackExecutionIdentity changes routing identity only. PriceData,
// BillingModelName and the pre-consume/settlement lifecycle stay frozen to the
// original public model.
func ApplyFallbackExecutionIdentity(c *gin.Context, info *relaycommon.RelayInfo, fallbackModel string) {
	if info == nil || fallbackModel == "" {
		return
	}
	RestoreFallbackBilling(c, info)
	info.OriginModelName = fallbackModel
	if info.ChannelMeta != nil {
		info.UpstreamModelName = fallbackModel
	}
	if info.Request != nil {
		info.Request.SetModelName(fallbackModel)
	}
}

func cloneFallbackBillingSnapshot(snapshot *billingexpr.BillingSnapshot) *billingexpr.BillingSnapshot {
	if snapshot == nil {
		return nil
	}
	clone := *snapshot
	clone.UsageFacts = maps.Clone(snapshot.UsageFacts)
	if snapshot.EstimatedImageCount != nil {
		clone.EstimatedImageCount = common.GetPointer(*snapshot.EstimatedImageCount)
	}
	if snapshot.EstimatedFixedPrice != nil {
		clone.EstimatedFixedPrice = common.GetPointer(*snapshot.EstimatedFixedPrice)
	}
	return &clone
}

func cloneFallbackBillingRequestInput(input *billingexpr.RequestInput) *billingexpr.RequestInput {
	if input == nil {
		return nil
	}
	clone := *input
	clone.Headers = maps.Clone(input.Headers)
	clone.Body = slices.Clone(input.Body)
	clone.Usage = maps.Clone(input.Usage)
	if input.ImageCount != nil {
		clone.ImageCount = common.GetPointer(*input.ImageCount)
	}
	return &clone
}

func FinalizeFallbackExecution(c *gin.Context) {
	state := fallbackState(c)
	if state == nil {
		return
	}
	state.mu.Lock()
	triggered := state.Triggered
	succeeded := state.Succeeded
	state.mu.Unlock()

	if triggered {
		model.RecordAuditLog(c, model.AuditLog{
			UserId: 0, Username: "system", ActorRole: 0,
			Category: model.AuditCategoryOperation, Action: "fallback.execution",
			Content: "Executed conversation fallback retry", Status: c.Writer.Status(), Success: succeeded,
			Other: model.AuditOther{RootInfo: model.AuditFields{"fallback": FallbackAuditSnapshot(c)}},
		})
	}
}

func FallbackAuditSnapshot(c *gin.Context) any {
	state := fallbackState(c)
	if state == nil {
		return nil
	}
	state.mu.Lock()
	defer state.mu.Unlock()
	return struct {
		Revision             int64                `json:"revision"`
		CallType             string               `json:"call_type"`
		PublicModel          string               `json:"public_model"`
		Targets              []FallbackTarget     `json:"targets"`
		CandidateTargets     []FallbackTarget     `json:"candidate_targets"`
		TargetSkips          []FallbackTargetSkip `json:"target_skips,omitempty"`
		RequiredCapabilities []string             `json:"required_capabilities"`
		SelectedModel        string               `json:"selected_model,omitempty"`
		ChannelID            int                  `json:"channel_id,omitempty"`
		UpstreamModel        string               `json:"upstream_model,omitempty"`
		Triggered            bool                 `json:"triggered"`
		Succeeded            bool                 `json:"succeeded"`
		Termination          string               `json:"termination,omitempty"`
	}{
		Revision: state.Revision, CallType: state.CallType, PublicModel: state.PublicModel,
		Targets: slices.Clone(state.Targets), CandidateTargets: slices.Clone(state.CandidateTargets),
		TargetSkips: slices.Clone(state.TargetSkips), RequiredCapabilities: slices.Clone(state.RequiredCapabilities),
		SelectedModel: state.SelectedModel, ChannelID: state.ChannelID, UpstreamModel: state.UpstreamModel,
		Triggered: state.Triggered, Succeeded: state.Succeeded, Termination: state.Termination,
	}
}

func fallbackState(c *gin.Context) *FallbackExecutionState {
	if c == nil {
		return nil
	}
	value, exists := c.Get(fallbackExecutionContextKey)
	if !exists {
		return nil
	}
	state, _ := value.(*FallbackExecutionState)
	return state
}

func (state *FallbackExecutionState) setTermination(reason string) {
	state.mu.Lock()
	defer state.mu.Unlock()
	state.Termination = reason
}

func fallbackCallType(info *relaycommon.RelayInfo) string {
	if info == nil {
		return ""
	}
	switch info.RelayMode {
	case relayconstant.RelayModeChatCompletions:
		switch info.RelayFormat {
		case types.RelayFormatClaude:
			return FallbackCallClaudeMessages
		case types.RelayFormatGemini:
			return FallbackCallGeminiContent
		default:
			return FallbackCallOpenAIChat
		}
	case relayconstant.RelayModeGemini:
		return FallbackCallGeminiContent
	default:
		return ""
	}
}

func fallbackConversationReplaySafe(info *relaycommon.RelayInfo, storage common.BodyStorage) bool {
	if info == nil || info.RelayFormat == types.RelayFormatOpenAIRealtime || storage == nil {
		return false
	}
	body, err := storage.Bytes()
	if err != nil {
		return false
	}
	var payload any
	return common.Unmarshal(body, &payload) == nil && !fallbackJSONUsesUnsupportedMedia(payload)
}

func fallbackRequestCapabilities(c *gin.Context) []string {
	storage, err := common.GetBodyStorage(c)
	if err != nil {
		return nil
	}
	body, err := storage.Bytes()
	if err != nil {
		return nil
	}
	required := make([]string, 0, 5)
	add := func(capability string) {
		if !slices.Contains(required, capability) {
			required = append(required, capability)
		}
	}
	if gjson.GetBytes(body, "tools.#").Int() > 0 ||
		gjson.GetBytes(body, "functions.#").Int() > 0 ||
		gjson.GetBytes(body, "tool_config.function_calling_config").Exists() {
		add(model.ModelCapabilityToolCalling)
	}
	responseFormat := gjson.GetBytes(body, "response_format.type").String()
	claudeOutputType := gjson.GetBytes(body, "output_config.format.type").String()
	if claudeOutputType == "" {
		claudeOutputType = gjson.GetBytes(body, "output_format.type").String()
	}
	geminiMimeType := gjson.GetBytes(body, "generationConfig.responseMimeType").String()
	if geminiMimeType == "" {
		geminiMimeType = gjson.GetBytes(body, "generation_config.response_mime_type").String()
	}
	if responseFormat == "json_schema" ||
		gjson.GetBytes(body, "response_format.json_schema").Exists() ||
		claudeOutputType == "json_schema" ||
		gjson.GetBytes(body, "generationConfig.responseSchema").Exists() ||
		gjson.GetBytes(body, "generationConfig.responseJsonSchema").Exists() ||
		gjson.GetBytes(body, "generation_config.response_schema").Exists() ||
		gjson.GetBytes(body, "generation_config.response_json_schema").Exists() {
		add(model.ModelCapabilityJSONSchema)
	} else if responseFormat == "json_object" || claudeOutputType == "json_object" || geminiMimeType == "application/json" {
		add(model.ModelCapabilityJSONObject)
	}
	var payload any
	if common.Unmarshal(body, &payload) == nil {
		imageInputs := fallbackJSONImageInputCount(payload)
		if imageInputs > 0 {
			add(model.ModelCapabilityImageInput)
		}
		if imageInputs > 1 {
			add(model.ModelCapabilityMultiImage)
		}
	}
	if gjson.GetBytes(body, "reasoning").Exists() ||
		gjson.GetBytes(body, "reasoning_effort").Exists() ||
		gjson.GetBytes(body, "thinking").Exists() ||
		gjson.GetBytes(body, "output_config.effort").Exists() ||
		gjson.GetBytes(body, "generationConfig.thinkingConfig").Exists() ||
		gjson.GetBytes(body, "generation_config.thinking_config").Exists() {
		add(model.ModelCapabilityReasoning)
	}
	slices.Sort(required)
	return required
}

func fallbackJSONImageInputCount(value any) int {
	switch typed := value.(type) {
	case []any:
		count := 0
		for _, item := range typed {
			count += fallbackJSONImageInputCount(item)
		}
		return count
	case map[string]any:
		count := 0
		blockImage := false
		if mediaType, ok := typed["type"].(string); ok && slices.Contains([]string{"image", "image_url", "input_image"}, strings.ToLower(mediaType)) {
			count++
			blockImage = true
		}
		for key, child := range typed {
			switch key {
			case "image_url", "input_image", "inline_data", "inlineData", "file_data", "fileData":
				if !blockImage {
					count++
				}
			}
			count += fallbackJSONImageInputCount(child)
		}
		return count
	}
	return 0
}

func fallbackJSONUsesUnsupportedMedia(value any) bool {
	switch typed := value.(type) {
	case []any:
		return slices.ContainsFunc(typed, fallbackJSONUsesUnsupportedMedia)
	case map[string]any:
		for key, child := range typed {
			switch key {
			case "input_audio", "audio_url", "input_video", "video_url":
				return true
			case "mime_type", "mimeType":
				mimeType := strings.ToLower(common.Interface2String(child))
				if strings.HasPrefix(mimeType, "audio/") || strings.HasPrefix(mimeType, "video/") {
					return true
				}
			case "type":
				mediaType := strings.ToLower(common.Interface2String(child))
				if slices.Contains([]string{"audio", "input_audio", "video", "input_video"}, mediaType) {
					return true
				}
			}
			if fallbackJSONUsesUnsupportedMedia(child) {
				return true
			}
		}
	}
	return false
}

func fallbackMappedModel(channel *model.Channel, original string) string {
	if channel == nil || channel.ModelMapping == nil || *channel.ModelMapping == "" {
		return original
	}
	var mapping map[string]string
	if err := common.UnmarshalJsonStr(*channel.ModelMapping, &mapping); err != nil {
		return original
	}
	current := original
	seen := map[string]struct{}{current: {}}
	for {
		next, exists := mapping[current]
		if !exists || next == "" || next == current {
			return current
		}
		if _, cycle := seen[next]; cycle {
			return current
		}
		seen[next] = struct{}{}
		current = next
	}
}
