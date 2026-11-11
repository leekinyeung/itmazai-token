package controller

import (
	"net/http"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTokenLegacyGroupFieldsTest(t *testing.T) *model.User {
	t.Helper()
	db := setupTokenControllerTestDB(t)
	require.NoError(t, db.AutoMigrate(&model.User{}))
	user := &model.User{Id: 101, Username: "token-group-user", Password: "password", Group: "default", Status: common.UserStatusEnabled}
	require.NoError(t, db.Create(user).Error)
	return user
}

func legacyTokenRequest(name string) map[string]any {
	return map[string]any{
		"name": name, "expired_time": -1, "remain_quota": 0, "unlimited_quota": true,
		"group": "vip", "auto_groups": []string{"vip", "default"}, "cross_group_retry": true,
	}
}

func TestTokenLegacyGroupFieldsAreAcceptedAndNormalized(t *testing.T) {
	user := setupTokenLegacyGroupFieldsTest(t)
	createCtx, createRecorder := newAuthenticatedContext(t, http.MethodPost, "/api/token/", legacyTokenRequest("legacy-create"), user.Id)
	common.SetContextKey(createCtx, constant.ContextKeyUserGroup, user.Group)
	AddToken(createCtx)
	require.True(t, decodeAPIResponse(t, createRecorder).Success)

	var token model.Token
	require.NoError(t, model.DB.Where("name = ?", "legacy-create").First(&token).Error)
	assert.Empty(t, token.Group)
	assert.Empty(t, token.AutoGroups)
	assert.False(t, token.CrossGroupRetry)

	token.Group = "historical"
	token.AutoGroups = `["historical"]`
	token.CrossGroupRetry = true
	require.NoError(t, model.DB.Save(&token).Error)

	update := legacyTokenRequest("legacy-update")
	update["id"] = token.Id
	update["status"] = common.TokenStatusEnabled
	updateCtx, updateRecorder := newAuthenticatedContext(t, http.MethodPut, "/api/token/", update, user.Id)
	common.SetContextKey(updateCtx, constant.ContextKeyUserGroup, user.Group)
	UpdateToken(updateCtx)
	response := decodeAPIResponse(t, updateRecorder)
	require.True(t, response.Success, response.Message)

	require.NoError(t, model.DB.First(&token, token.Id).Error)
	assert.Empty(t, token.Group)
	assert.Empty(t, token.AutoGroups)
	assert.False(t, token.CrossGroupRetry)

	legacy := token
	legacy.Group = "vip"
	legacy.AutoGroups = `["vip"]`
	legacy.CrossGroupRetry = true
	data := buildMaskedTokenResponse(&legacy)
	assert.Equal(t, "vip", data.Group)
	assert.Equal(t, []string{"vip"}, data.AutoGroups)
	assert.True(t, data.CrossGroupRetry)
}
