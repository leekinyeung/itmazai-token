package service

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupAccountGroupChannelTest(t *testing.T) *gorm.DB {
	t.Helper()
	originalDB := model.DB
	originalMemoryCacheEnabled := common.MemoryCacheEnabled
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&model.Channel{}, &model.Ability{}))
	model.DB = db
	common.MemoryCacheEnabled = true
	t.Cleanup(func() {
		model.DB = originalDB
		common.MemoryCacheEnabled = originalMemoryCacheEnabled
		if sqlDB, dbErr := db.DB(); dbErr == nil {
			require.NoError(t, sqlDB.Close())
		}
	})
	return db
}

func createAccountGroupChannel(t *testing.T, db *gorm.DB, id int, group, modelName string) {
	t.Helper()
	priority := int64(0)
	weight := uint(100)
	require.NoError(t, db.Create(&model.Channel{
		Id: id, Type: constant.ChannelTypeOpenAI, Key: fmt.Sprintf("key-%d", id),
		Status: common.ChannelStatusEnabled, Name: fmt.Sprintf("channel-%d", id),
		Weight: &weight, Models: modelName, Group: group, Priority: &priority,
	}).Error)
	require.NoError(t, db.Create(&model.Ability{
		Group: group, Model: modelName, ChannelId: id, Enabled: true,
		Priority: &priority, Weight: weight,
	}).Error)
}

func TestChannelSelectionNeverLeavesAccountGroup(t *testing.T) {
	db := setupAccountGroupChannelTest(t)
	const modelName = "account-group-model"
	createAccountGroupChannel(t, db, 2101, "vip", modelName)
	createAccountGroupChannel(t, db, 2102, "default", modelName)
	model.InitChannelCache()

	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	common.SetContextKey(ctx, constant.ContextKeyUserGroup, "default")
	common.SetContextKey(ctx, constant.ContextKeyTokenAutoGroups, []string{"vip"})
	common.SetContextKey(ctx, constant.ContextKeyTokenCrossGroupRetry, true)
	common.SetContextKey(ctx, constant.ContextKeyTokenModelLimitEnabled, false)

	channel, selectedGroup, err := CacheGetRandomSatisfiedChannel(&RetryParam{
		Ctx: ctx, AccountGroup: "default", ModelName: modelName, Retry: new(int),
	})
	require.NoError(t, err)
	require.NotNil(t, channel)
	assert.Equal(t, 2102, channel.Id)
	assert.Equal(t, "default", selectedGroup)
	assert.Empty(t, common.GetContextKeyString(ctx, constant.ContextKeyAutoGroup))

	const vipOnlyModel = "vip-only-model"
	createAccountGroupChannel(t, db, 2103, "vip", vipOnlyModel)
	model.InitChannelCache()
	channel, selectedGroup, err = CacheGetRandomSatisfiedChannel(&RetryParam{
		Ctx: ctx, AccountGroup: "default", ModelName: vipOnlyModel, Retry: new(int),
	})
	require.NoError(t, err)
	assert.Nil(t, channel)
	assert.Equal(t, "default", selectedGroup)

	GetChannelConstraints(ctx).AddPin(dto.ChannelPin{ChannelId: 2101, Source: dto.PinSourceToken, Rank: dto.PinRankToken})
	channel, _, selectErr := SelectChannelForRequest(ctx, modelName, &RetryParam{
		Ctx: ctx, AccountGroup: "default", ModelName: modelName, Retry: new(int),
	})
	assert.Nil(t, channel)
	require.NotNil(t, selectErr)
	assert.Equal(t, http.StatusForbidden, selectErr.StatusCode)
}
