package service

import (
	"cmp"
	"errors"
	"fmt"
	"slices"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
)

const (
	FallbackSchemaVersion = 6
	FallbackTargetLimit   = 20

	FallbackCallOpenAIChat     = "openai.chat_completions"
	FallbackCallClaudeMessages = "anthropic.messages"
	FallbackCallGeminiContent  = "gemini.generate_content"
)

var (
	ErrFallbackConfigConflict = model.ErrFallbackRevisionConflict

	fallbackSnapshot       atomic.Pointer[FallbackSnapshot]
	fallbackSnapshotLoaded atomic.Int64
	fallbackSnapshotMu     sync.Mutex
)

// FallbackGlobalSettings intentionally contains only the on/off switch. Model
// fallback is one extra attempt in the existing conversation retry flow.
type FallbackGlobalSettings struct {
	Enabled bool `json:"enabled"`
}

// FallbackTarget identifies one exact channel route. It deliberately contains
// no group, priority or weight: the configured channel is used directly.
type FallbackTarget struct {
	ChannelID int    `json:"channel_id"`
	Model     string `json:"model"`
}

type FallbackConfigDocument struct {
	Settings FallbackGlobalSettings `json:"settings"`
	Targets  []FallbackTarget       `json:"targets"`
}

type FallbackSnapshot struct {
	Revision      int64                  `json:"revision"`
	SchemaVersion int                    `json:"schema_version"`
	Document      FallbackConfigDocument `json:"document"`
	UpdatedAt     int64                  `json:"updated_at"`
}

type FallbackChannelOption struct {
	ChannelID   int    `json:"channel_id"`
	ChannelName string `json:"channel_name"`
	Enabled     bool   `json:"enabled"`
}

type FallbackChannelModelOption struct {
	ModelName         string   `json:"model_name"`
	UpstreamModel     string   `json:"upstream_model"`
	Capabilities      []string `json:"capabilities"`
	Eligible          bool     `json:"eligible"`
	UnavailableReason string   `json:"unavailable_reason,omitempty"`
}

func DefaultFallbackConfig() FallbackConfigDocument {
	return FallbackConfigDocument{
		Settings: FallbackGlobalSettings{Enabled: false},
		Targets:  []FallbackTarget{},
	}
}

func CurrentFallbackSnapshot() (*FallbackSnapshot, error) {
	loadedAt := fallbackSnapshotLoaded.Load()
	if snapshot := fallbackSnapshot.Load(); snapshot != nil && time.Since(time.Unix(0, loadedAt)) < 5*time.Second {
		return snapshot, nil
	}
	return ReloadFallbackSnapshot()
}

func ReloadFallbackSnapshot() (*FallbackSnapshot, error) {
	fallbackSnapshotMu.Lock()
	defer fallbackSnapshotMu.Unlock()

	state, err := model.GetFallbackConfigState(nil, false)
	if err != nil {
		return nil, err
	}
	snapshot := &FallbackSnapshot{
		Revision: state.ActiveRevision, SchemaVersion: FallbackSchemaVersion,
		Document: DefaultFallbackConfig(), UpdatedAt: state.UpdatedAt,
	}
	if state.ActiveRevision > 0 {
		version, loadErr := model.GetFallbackConfigVersion(state.ActiveRevision)
		if loadErr != nil {
			return nil, loadErr
		}
		if version.SchemaVersion != FallbackSchemaVersion {
			return nil, fmt.Errorf("fallback configuration schema version %d is not supported; version %d is required", version.SchemaVersion, FallbackSchemaVersion)
		}
		if err := common.UnmarshalJsonStr(version.Document, &snapshot.Document); err != nil {
			return nil, fmt.Errorf("decode fallback configuration v6: %w", err)
		}
	}
	normalizeFallbackConfig(&snapshot.Document)
	fallbackSnapshot.Store(snapshot)
	fallbackSnapshotLoaded.Store(time.Now().UnixNano())
	return snapshot, nil
}

func SaveFallbackConfig(baseRevision int64, document FallbackConfigDocument, actorID int) (*FallbackSnapshot, error) {
	normalizeFallbackConfig(&document)
	if err := ValidateFallbackConfig(document); err != nil {
		return nil, err
	}
	encoded, err := common.Marshal(document)
	if err != nil {
		return nil, err
	}
	if _, err := model.SaveFallbackConfigVersion(baseRevision, FallbackSchemaVersion, string(encoded), actorID); err != nil {
		return nil, err
	}
	fallbackSnapshotLoaded.Store(0)
	return ReloadFallbackSnapshot()
}

func ValidateFallbackConfig(document FallbackConfigDocument) error {
	if len(document.Targets) > FallbackTargetLimit {
		return fmt.Errorf("fallback target pool may contain at most %d targets", FallbackTargetLimit)
	}
	if len(document.Targets) == 0 {
		if document.Settings.Enabled {
			return errors.New("enabled fallback configuration requires at least one exact channel and model")
		}
		return nil
	}

	seen := make(map[FallbackTarget]struct{}, len(document.Targets))
	seenModels := make(map[string]struct{}, len(document.Targets))
	modelNames := make([]string, 0, len(document.Targets))
	channels := make(map[int]*model.Channel, len(document.Targets))
	for _, target := range document.Targets {
		if target.ChannelID <= 0 || target.Model == "" {
			return errors.New("fallback channel and model must be configured together")
		}
		if _, duplicate := seen[target]; duplicate {
			return fmt.Errorf("fallback target channel #%d and model %q is duplicated", target.ChannelID, target.Model)
		}
		seen[target] = struct{}{}
		channel, err := model.GetChannelById(target.ChannelID, false)
		if err != nil {
			return fmt.Errorf("load fallback channel #%d: %w", target.ChannelID, err)
		}
		if !fallbackChannelHasModel(channel, target.Model) {
			return fmt.Errorf("fallback model %q is not configured on channel #%d", target.Model, target.ChannelID)
		}
		if !fallbackConversationChannelSupports(channel, target.Model) {
			return fmt.Errorf("fallback channel #%d does not support conversation requests for model %q", target.ChannelID, target.Model)
		}
		channels[target.ChannelID] = channel
		if _, exists := seenModels[target.Model]; !exists {
			seenModels[target.Model] = struct{}{}
			modelNames = append(modelNames, target.Model)
		}
	}
	if !document.Settings.Enabled {
		return nil
	}
	metadata, err := model.ResolveModelCapabilityMetadata(modelNames)
	if err != nil {
		return err
	}
	for _, target := range document.Targets {
		if channels[target.ChannelID].Status == common.ChannelStatusEnabled &&
			metadata[target.Model].Status == model.ModelCapabilityMetadataComplete {
			return nil
		}
	}
	return errors.New("enabled fallback configuration requires at least one enabled target with complete capability metadata")
}

func normalizeFallbackConfig(document *FallbackConfigDocument) {
	if document.Targets == nil {
		document.Targets = []FallbackTarget{}
	}
	for i := range document.Targets {
		document.Targets[i].Model = strings.TrimSpace(document.Targets[i].Model)
	}
}

func FallbackChannelOptions() ([]FallbackChannelOption, error) {
	channels, err := model.GetAllChannels(0, 0, true, true)
	if err != nil {
		return nil, err
	}
	options := make([]FallbackChannelOption, 0, len(channels))
	for _, channel := range channels {
		if !slices.ContainsFunc(fallbackChannelModels(channel), func(modelName string) bool {
			return fallbackConversationChannelSupports(channel, modelName)
		}) {
			continue
		}
		option := FallbackChannelOption{
			ChannelID:   channel.Id,
			ChannelName: channel.Name,
			Enabled:     channel.Status == common.ChannelStatusEnabled,
		}
		options = append(options, option)
	}
	slices.SortFunc(options, func(a, b FallbackChannelOption) int {
		if byName := cmp.Compare(a.ChannelName, b.ChannelName); byName != 0 {
			return byName
		}
		return cmp.Compare(a.ChannelID, b.ChannelID)
	})
	return options, nil
}

func FallbackChannelModelOptions(channelID int) ([]FallbackChannelModelOption, error) {
	channel, err := model.GetChannelById(channelID, false)
	if err != nil {
		return nil, err
	}
	modelNames := make([]string, 0)
	for _, modelName := range fallbackChannelModels(channel) {
		if fallbackConversationChannelSupports(channel, modelName) {
			modelNames = append(modelNames, modelName)
		}
	}
	metadata, err := model.ResolveModelCapabilityMetadata(modelNames)
	if err != nil {
		return nil, err
	}
	options := make([]FallbackChannelModelOption, 0, len(modelNames))
	for _, modelName := range modelNames {
		item := metadata[modelName]
		capabilities := slices.Clone(item.Capabilities)
		if capabilities == nil {
			capabilities = []string{}
		}
		option := FallbackChannelModelOption{
			ModelName: modelName, UpstreamModel: fallbackMappedModel(channel, modelName),
			Capabilities: capabilities,
		}
		switch {
		case channel.Status != common.ChannelStatusEnabled:
			option.UnavailableReason = "channel_disabled"
		case item.Status == model.ModelCapabilityMetadataComplete:
			option.Eligible = true
		case item.Status == model.ModelCapabilityMetadataMissing:
			option.UnavailableReason = "missing_capability_metadata"
		case item.Status == model.ModelCapabilityMetadataDisabled:
			option.UnavailableReason = "disabled_capability_metadata"
		default:
			option.UnavailableReason = "invalid_capability_metadata"
		}
		options = append(options, option)
	}
	slices.SortFunc(options, func(a, b FallbackChannelModelOption) int {
		return cmp.Compare(a.ModelName, b.ModelName)
	})
	return options, nil
}

func fallbackChannelModels(channel *model.Channel) []string {
	if channel == nil {
		return nil
	}
	seen := make(map[string]struct{})
	models := make([]string, 0)
	for _, modelName := range channel.GetModels() {
		modelName = strings.TrimSpace(modelName)
		if modelName == "" {
			continue
		}
		if _, duplicate := seen[modelName]; duplicate {
			continue
		}
		seen[modelName] = struct{}{}
		models = append(models, modelName)
	}
	slices.Sort(models)
	return models
}

func fallbackChannelHasModel(channel *model.Channel, modelName string) bool {
	return slices.Contains(fallbackChannelModels(channel), modelName)
}

func fallbackConversationChannelSupports(channel *model.Channel, modelName string) bool {
	if channel == nil {
		return false
	}
	upstreamModel := fallbackMappedModel(channel, modelName)
	endpointTypes := common.GetEndpointTypesByChannelType(channel.Type, upstreamModel)
	return slices.Contains(endpointTypes, constant.EndpointTypeOpenAI) ||
		slices.Contains(endpointTypes, constant.EndpointTypeAnthropic) ||
		slices.Contains(endpointTypes, constant.EndpointTypeGemini)
}

func FallbackConfigReferencesAnyChannel(channelIDs []int) (bool, error) {
	snapshot, err := CurrentFallbackSnapshot()
	if err != nil {
		return false, err
	}
	return slices.ContainsFunc(snapshot.Document.Targets, func(target FallbackTarget) bool {
		return target.ChannelID > 0 && slices.Contains(channelIDs, target.ChannelID)
	}), nil
}
