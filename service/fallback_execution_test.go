package service

import (
	"bytes"
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/pkg/billingexpr"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/relaykit/types"
	hosttypes "github.com/QuantumNous/new-api/types"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

type legacyFallbackConfigState struct {
	ID             int   `gorm:"primaryKey;autoIncrement:false"`
	ActiveRevision int64 `gorm:"bigint"`
	EmergencyStop  bool
	UpdatedAt      int64 `gorm:"bigint"`
}

type legacyFallbackMetric struct {
	BucketTs  int64  `gorm:"bigint;primaryKey;autoIncrement:false"`
	ModelName string `gorm:"type:varchar(255);primaryKey"`
	CallType  string `gorm:"type:varchar(64);primaryKey"`
}

func newFallbackTestContext(t *testing.T, state *FallbackExecutionState) (*gin.Context, *relaycommon.RelayInfo) {
	t.Helper()
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", bytes.NewBufferString(`{"model":"public-model"}`))
	c.Set(fallbackExecutionContextKey, state)
	return c, &relaycommon.RelayInfo{OriginModelName: "public-model", BillingModelName: "public-model"}
}

func TestFallbackRunsOnlyWhenNormalRetryBudgetIsExhausted(t *testing.T) {
	tests := []struct {
		name       string
		decision   PolicyDecision
		retryIndex int
		want       bool
	}{
		{name: "budget exhausted", decision: PolicyDecision{Action: "stop", Reason: "attempt_budget_exhausted"}, retryIndex: 2, want: true},
		{name: "channel error on last attempt", decision: PolicyDecision{Action: "retry", Reason: "channel_error"}, retryIndex: 2, want: true},
		{name: "retry remains", decision: PolicyDecision{Action: "retry", Reason: "retry_status_matched"}, retryIndex: 1},
		{name: "business error", decision: PolicyDecision{Action: "stop", Reason: "status_not_retryable"}, retryIndex: 2},
		{name: "pinned channel", decision: PolicyDecision{Action: "stop", Reason: "pinned_channel"}, retryIndex: 2},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			assert.Equal(t, test.want, ShouldAttemptFallbackAfterRetry(test.decision, test.retryIndex, 2))
		})
	}
}

func TestFallbackAllowsOnlyOneAdditionalAttempt(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&model.FallbackConfigState{}))
	previousDB := model.DB
	model.DB = db
	t.Cleanup(func() { model.DB = previousDB })

	target := FallbackTarget{ChannelID: 7, Model: "fallback-a"}
	state := &FallbackExecutionState{Targets: []FallbackTarget{target}, CandidateTargets: []FallbackTarget{target}}
	c, _ := newFallbackTestContext(t, state)
	channel := &model.Channel{Id: 7, Type: constant.ChannelTypeOpenAI, Models: "fallback-a", Status: common.ChannelStatusEnabled}
	assert.True(t, BeginFallbackAttempt(c, target, channel))
	assert.True(t, IsFallbackAttempt(c))
	assert.False(t, BeginFallbackAttempt(c, target, channel))
	assert.True(t, state.Triggered)
	assert.Equal(t, "fallback-a", state.SelectedModel)
}

func TestFallbackDoesNotStartAfterResponseCommitOrClientCancellation(t *testing.T) {
	target := FallbackTarget{ChannelID: 7, Model: "fallback-model"}
	state := &FallbackExecutionState{Targets: []FallbackTarget{target}, CandidateTargets: []FallbackTarget{target}}
	c, info := newFallbackTestContext(t, state)
	apiErr := types.NewErrorWithStatusCode(errors.New("upstream unavailable"), types.ErrorCodeBadResponseStatusCode, http.StatusServiceUnavailable)
	assert.True(t, CanAttemptFallback(c, info, apiErr))

	_, err := c.Writer.Write([]byte("committed"))
	require.NoError(t, err)
	assert.False(t, CanAttemptFallback(c, info, apiErr))
	assert.Equal(t, "response_committed_or_cancelled", state.Termination)

	state.Termination = ""
	c, info = newFallbackTestContext(t, state)
	requestContext, cancel := context.WithCancel(c.Request.Context())
	c.Request = c.Request.Clone(requestContext)
	cancel()
	assert.False(t, CanAttemptFallback(c, info, apiErr))
}

func TestFallbackRestoresOriginalBillingIdentity(t *testing.T) {
	state := &FallbackExecutionState{
		Revision: 4, CallType: FallbackCallOpenAIChat, PublicModel: "public-model",
		Targets:          []FallbackTarget{{ChannelID: 9, Model: "fallback-public-model"}},
		CandidateTargets: []FallbackTarget{{ChannelID: 9, Model: "fallback-public-model"}}, RequiredCapabilities: []string{model.ModelCapabilityToolCalling},
		Triggered: true, SelectedModel: "fallback-public-model", ChannelID: 9, UpstreamModel: "fallback-upstream-model",
	}
	c, info := newFallbackTestContext(t, state)
	info.PriceData = hosttypes.PriceData{ModelPrice: 2.5, ModelDiscount: 0.8, QuotaToPreConsume: 120, UsePrice: true}
	info.PriceData.AddOtherRatio("cached_tokens", 0.25)
	info.OriginModelName = "original-routing-model"
	info.PublicModelName = "public-model"
	info.BillingModelName = "original-billing-model"
	info.UserGroup = "original-group"
	info.UsingGroup = "original-group"
	info.TieredBillingSnapshot = &billingexpr.BillingSnapshot{ModelName: "original-billing-model", ExprHash: "original-expression-hash", QuotaPerUnit: 500_000}
	request := &dto.GeneralOpenAIRequest{Model: "public-model"}
	info.Request = request

	FreezeFallbackBilling(c, info)
	ApplyFallbackExecutionIdentity(c, info, "fallback-public-model")
	assert.Equal(t, "fallback-public-model", info.OriginModelName)
	assert.Equal(t, "fallback-public-model", request.Model)
	assert.Equal(t, "original-billing-model", info.BillingModelName)
	assert.Equal(t, 2.5, info.PriceData.ModelPrice)

	info.PriceData = hosttypes.PriceData{ModelPrice: 99}
	info.BillingModelName = "fallback-billing-model"
	RestoreFallbackBilling(c, info)
	assert.Equal(t, 2.5, info.PriceData.ModelPrice)
	assert.Equal(t, "original-billing-model", info.BillingModelName)
	assert.Equal(t, "original-routing-model", info.OriginModelName)
	assert.Equal(t, "original-routing-model", request.Model)
	encoded, err := common.Marshal(FallbackAuditSnapshot(c))
	require.NoError(t, err)
	assert.Contains(t, string(encoded), "fallback-public-model")
	assert.Contains(t, string(encoded), "fallback-upstream-model")
}

func TestFallbackConversationCapabilitiesAreExtractedStructurally(t *testing.T) {
	tests := []struct {
		name string
		body string
		want []string
	}{
		{name: "empty tools", body: `{"tools":[]}`},
		{name: "combined OpenAI request", body: `{"tools":[{"type":"function"}],"response_format":{"type":"json_schema","json_schema":{}},"messages":[{"content":[{"type":"image_url","image_url":{"url":"data:image/png;base64,AA"}}]}],"reasoning_effort":"high"}`, want: []string{model.ModelCapabilityToolCalling, model.ModelCapabilityJSONSchema, model.ModelCapabilityImageInput, model.ModelCapabilityReasoning}},
		{name: "multiple images", body: `{"messages":[{"content":[{"type":"image_url","image_url":{"url":"data:image/png;base64,AA"}},{"type":"image_url","image_url":{"url":"data:image/png;base64,BB"}}]}]}`, want: []string{model.ModelCapabilityImageInput, model.ModelCapabilityMultiImage}},
		{name: "Claude schema", body: `{"output_config":{"format":{"type":"json_schema"}}}`, want: []string{model.ModelCapabilityJSONSchema}},
		{name: "Gemini JSON reasoning", body: `{"generationConfig":{"responseMimeType":"application/json","thinkingConfig":{"thinkingBudget":100}}}`, want: []string{model.ModelCapabilityJSONObject, model.ModelCapabilityReasoning}},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			c, _ := newFallbackTestContext(t, &FallbackExecutionState{})
			c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", bytes.NewBufferString(test.body))
			t.Cleanup(func() { common.CleanupBodyStorage(c) })
			assert.ElementsMatch(t, test.want, fallbackRequestCapabilities(c))
		})
	}
}

func TestFallbackConversationReplayRejectsUnsupportedMedia(t *testing.T) {
	c, info := newFallbackTestContext(t, &FallbackExecutionState{})
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", bytes.NewBufferString(`{"messages":[{"content":[{"type":"input_audio","input_audio":{"data":"AA"}}]}]}`))
	storage, err := common.GetBodyStorage(c)
	require.NoError(t, err)
	t.Cleanup(func() { common.CleanupBodyStorage(c) })
	assert.False(t, fallbackConversationReplaySafe(info, storage))
}

func TestFallbackCandidatePoolSkipsCapabilityMismatchInConfiguredOrder(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(
		&model.Model{}, &model.Channel{}, &model.FallbackConfigVersion{}, &model.FallbackConfigState{},
	))
	previousDB := model.DB
	previousMemoryCache := common.MemoryCacheEnabled
	model.DB = db
	common.MemoryCacheEnabled = false
	fallbackSnapshot.Store(nil)
	fallbackSnapshotLoaded.Store(0)
	t.Cleanup(func() {
		model.DB = previousDB
		common.MemoryCacheEnabled = previousMemoryCache
		fallbackSnapshot.Store(nil)
		fallbackSnapshotLoaded.Store(0)
	})

	require.NoError(t, db.Create([]model.Model{
		{ModelName: "basic", Capabilities: `[]`, Status: 1},
		{ModelName: "vision", Capabilities: `["image_input"]`, Status: 1},
		{ModelName: "vision-second", Capabilities: `["image_input"]`, Status: 1},
	}).Error)
	channel := model.Channel{
		Type: constant.ChannelTypeOpenAI, Key: "key", Status: common.ChannelStatusEnabled,
		Name: "fallback", Models: "basic,vision,vision-second", Group: "default",
	}
	require.NoError(t, db.Create(&channel).Error)
	_, err = SaveFallbackConfig(0, FallbackConfigDocument{
		Settings: FallbackGlobalSettings{Enabled: true},
		Targets: []FallbackTarget{
			{ChannelID: channel.Id, Model: "basic"},
			{ChannelID: channel.Id, Model: "vision-second"},
			{ChannelID: channel.Id, Model: "vision"},
		},
	}, 1)
	require.NoError(t, err)

	c, _ := newFallbackTestContext(t, &FallbackExecutionState{})
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", bytes.NewBufferString(
		`{"model":"public-model","messages":[{"content":[{"type":"image_url","image_url":{"url":"data:image/png;base64,AA"}}]}]}`,
	))
	t.Cleanup(func() { common.CleanupBodyStorage(c) })
	info := &relaycommon.RelayInfo{
		RelayMode:       relayconstant.RelayModeChatCompletions,
		RelayFormat:     types.RelayFormatOpenAI,
		OriginModelName: "public-model",
	}
	require.NoError(t, PrepareFallbackExecution(c, info))
	assert.Equal(t, []FallbackTarget{
		{ChannelID: channel.Id, Model: "vision-second"},
		{ChannelID: channel.Id, Model: "vision"},
	}, FallbackTargetsForRequest(c))
	state := fallbackState(c)
	require.NotNil(t, state)
	assert.Equal(t, []FallbackTargetSkip{{
		Target: FallbackTarget{ChannelID: channel.Id, Model: "basic"},
		Reason: "capability_mismatch",
	}}, state.TargetSkips)
}

func TestFallbackConfigurationPreservesOrderedExactTargets(t *testing.T) {
	document := FallbackConfigDocument{Targets: []FallbackTarget{
		{ChannelID: 7, Model: " fallback-model "},
		{ChannelID: 8, Model: "second-model"},
	}}
	normalizeFallbackConfig(&document)
	assert.Equal(t, "fallback-model", document.Targets[0].Model)
	encoded, err := common.Marshal(document)
	require.NoError(t, err)
	assert.JSONEq(t, `{"settings":{"enabled":false},"targets":[{"channel_id":7,"model":"fallback-model"},{"channel_id":8,"model":"second-model"}]}`, string(encoded))
}

func TestFallbackConfigurationValidationUsesExactChannelWithoutGroupAbility(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&model.Model{}, &model.Channel{}))
	previousDB := model.DB
	previousMemoryCache := common.MemoryCacheEnabled
	model.DB = db
	common.MemoryCacheEnabled = false
	t.Cleanup(func() {
		model.DB = previousDB
		common.MemoryCacheEnabled = previousMemoryCache
	})

	require.NoError(t, db.Create([]model.Model{
		{ModelName: "basic", Capabilities: `[]`, Status: 1},
		{ModelName: "missing", Status: 1},
	}).Error)
	channel := model.Channel{Type: constant.ChannelTypeOpenAI, Key: "key", Status: common.ChannelStatusEnabled, Name: "fallback", Models: "basic,missing", Group: "default"}
	require.NoError(t, db.Create(&channel).Error)

	require.NoError(t, ValidateFallbackConfig(FallbackConfigDocument{
		Settings: FallbackGlobalSettings{Enabled: true},
		Targets:  []FallbackTarget{{ChannelID: channel.Id, Model: "basic"}},
	}))
	assert.ErrorContains(t, ValidateFallbackConfig(FallbackConfigDocument{Settings: FallbackGlobalSettings{Enabled: true}}), "requires at least one exact channel and model")
	assert.ErrorContains(t, ValidateFallbackConfig(FallbackConfigDocument{
		Settings: FallbackGlobalSettings{Enabled: true},
		Targets:  []FallbackTarget{{ChannelID: channel.Id, Model: "missing"}},
	}), "requires at least one enabled target with complete capability metadata")
	assert.ErrorContains(t, ValidateFallbackConfig(FallbackConfigDocument{
		Targets: []FallbackTarget{{ChannelID: channel.Id, Model: "unknown"}},
	}), "is not configured on channel")
	assert.ErrorContains(t, ValidateFallbackConfig(FallbackConfigDocument{
		Targets: []FallbackTarget{
			{ChannelID: channel.Id, Model: "basic"},
			{ChannelID: channel.Id, Model: "basic"},
		},
	}), "is duplicated")
	assert.ErrorContains(t, ValidateFallbackConfig(FallbackConfigDocument{
		Targets: make([]FallbackTarget, FallbackTargetLimit+1),
	}), "at most 20 targets")
}

func TestFallbackConfigPersistenceDatabaseMatrix(t *testing.T) {
	for _, database := range []struct {
		name     string
		typeName common.DatabaseType
		envName  string
		driver   func(string) gorm.Dialector
	}{
		{name: "sqlite", typeName: common.DatabaseTypeSQLite, driver: func(string) gorm.Dialector { return sqlite.Open(":memory:") }},
		{name: "mysql", typeName: common.DatabaseTypeMySQL, envName: "TEST_MYSQL_DSN", driver: func(dsn string) gorm.Dialector { return mysql.Open(dsn) }},
		{name: "postgres", typeName: common.DatabaseTypePostgreSQL, envName: "TEST_POSTGRES_DSN", driver: func(dsn string) gorm.Dialector {
			return postgres.New(postgres.Config{DSN: dsn, PreferSimpleProtocol: true})
		}},
	} {
		t.Run(database.name, func(t *testing.T) {
			dsn := "memory"
			if database.envName != "" {
				dsn = os.Getenv(database.envName)
				if dsn == "" {
					t.Skip(database.envName + " is not configured")
				}
			}
			db, err := gorm.Open(database.driver(dsn), &gorm.Config{NamingStrategy: schema.NamingStrategy{TablePrefix: "fallback_simple_matrix_"}})
			require.NoError(t, err)
			previousDB := model.DB
			previousType := common.MainDatabaseType()
			model.DB = db
			common.SetMainDatabaseType(database.typeName)
			t.Cleanup(func() {
				model.DB = previousDB
				common.SetMainDatabaseType(previousType)
				fallbackSnapshot.Store(nil)
				fallbackSnapshotLoaded.Store(0)
			})
			sqlDB, err := db.DB()
			require.NoError(t, err)
			sqlDB.SetMaxOpenConns(1)
			t.Cleanup(func() { require.NoError(t, sqlDB.Close()) })

			models := []any{&model.FallbackConfigVersion{}, &model.FallbackConfigState{}}
			stateTable := db.NamingStrategy.TableName("FallbackConfigState")
			metricTable := db.NamingStrategy.TableName("FallbackMetric")
			require.NoError(t, db.Migrator().DropTable(metricTable))
			require.NoError(t, db.Migrator().DropTable(models...))
			t.Cleanup(func() {
				_ = db.Migrator().DropTable(metricTable)
				_ = db.Migrator().DropTable(models...)
			})

			// A fresh final-version database contains only the active configuration
			// tables. Removed experimental columns and metrics are not recreated.
			require.NoError(t, db.AutoMigrate(models...))
			require.NoError(t, db.AutoMigrate(models...))
			assert.False(t, db.Migrator().HasColumn(&model.FallbackConfigState{}, "emergency_stop"))
			assert.False(t, db.Migrator().HasTable(metricTable))

			// Upgrading an experimental database is non-destructive: GORM leaves
			// its unused column and table in place while current saves keep working.
			require.NoError(t, db.Migrator().DropTable(models...))
			require.NoError(t, db.Table(stateTable).AutoMigrate(&legacyFallbackConfigState{}))
			require.NoError(t, db.Table(metricTable).AutoMigrate(&legacyFallbackMetric{}))
			require.NoError(t, db.AutoMigrate(models...))
			require.NoError(t, db.AutoMigrate(models...))
			assert.True(t, db.Migrator().HasColumn(&model.FallbackConfigState{}, "emergency_stop"))
			assert.True(t, db.Migrator().HasTable(metricTable))

			encoded, err := common.Marshal(FallbackConfigDocument{
				Settings: FallbackGlobalSettings{Enabled: false},
				Targets: []FallbackTarget{
					{ChannelID: 7, Model: "fallback-chat"},
					{ChannelID: 8, Model: "fallback-vision"},
				},
			})
			require.NoError(t, err)
			_, err = model.SaveFallbackConfigVersion(0, FallbackSchemaVersion, string(encoded), 1)
			require.NoError(t, err)
			version, err := model.GetFallbackConfigVersion(1)
			require.NoError(t, err)
			assert.JSONEq(t, `{"settings":{"enabled":false},"targets":[{"channel_id":7,"model":"fallback-chat"},{"channel_id":8,"model":"fallback-vision"}]}`, version.Document)
		})
	}
}
