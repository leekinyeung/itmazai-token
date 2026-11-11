package controller

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPricingCatalogUsesAnonymousDefaultAndAuthenticatedAccountVisibility(t *testing.T) {
	db := setupModelListControllerTestDB(t)
	originalUsableGroups := setting.UserUsableGroups2JSONString()
	originalSpecialGroups := ratio_setting.GetGroupRatioSetting().GroupSpecialUsableGroup.ReadAll()
	t.Cleanup(func() {
		require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(originalUsableGroups))
		specialGroups := ratio_setting.GetGroupRatioSetting().GroupSpecialUsableGroup
		specialGroups.Clear()
		specialGroups.AddAll(originalSpecialGroups)
		model.InvalidatePricingCache()
	})

	require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(`{"default":"Default"}`))
	specialGroups := ratio_setting.GetGroupRatioSetting().GroupSpecialUsableGroup
	specialGroups.Clear()
	specialGroups.Set("default", map[string]string{"+:vip": "VIP", "+:hidden": "Hidden", "-:hidden": ""})
	specialGroups.Set("vip", map[string]string{"+:hidden": "Hidden", "-:default": ""})

	require.NoError(t, db.Create(&model.Channel{Id: 1, Name: "catalog", Type: 1, Status: common.ChannelStatusEnabled}).Error)
	require.NoError(t, db.Create(&[]model.Ability{
		{Group: "default", Model: "catalog-default", ChannelId: 1, Enabled: true},
		{Group: "default", Model: "catalog-shared", ChannelId: 1, Enabled: true},
		{Group: "vip", Model: "catalog-shared", ChannelId: 1, Enabled: true},
		{Group: "vip", Model: "catalog-vip", ChannelId: 1, Enabled: true},
		{Group: "hidden", Model: "catalog-hidden", ChannelId: 1, Enabled: true},
	}).Error)
	user := &model.User{Username: "catalog-user", Status: common.UserStatusEnabled, Group: "vip"}
	require.NoError(t, db.Create(user).Error)
	model.InvalidatePricingCache()

	anonymous := GetAnonymousPricingData()
	anonymousNames := make([]string, 0, len(anonymous.Pricing))
	for _, item := range anonymous.Pricing {
		anonymousNames = append(anonymousNames, item.ModelName)
	}
	assert.ElementsMatch(t, []string{"catalog-default", "catalog-shared", "catalog-vip"}, anonymousNames)
	assert.Len(t, anonymousNames, 3)

	tests := []struct {
		name     string
		path     string
		userID   int
		expected []string
	}{
		{
			name:     "legacy anonymous group query is ignored",
			path:     "/api/pricing?group=vip",
			expected: anonymousNames,
		},
		{
			name:     "authenticated catalog follows account visibility",
			path:     "/api/pricing?group=default",
			userID:   user.Id,
			expected: []string{"catalog-shared", "catalog-vip", "catalog-hidden"},
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			context, _ := gin.CreateTestContext(recorder)
			context.Request = httptest.NewRequest(http.MethodGet, test.path, nil)
			if test.userID != 0 {
				context.Set("id", test.userID)
			}

			GetPricing(context)

			require.Equal(t, http.StatusOK, recorder.Code)
			var payload struct {
				Success bool            `json:"success"`
				Data    []model.Pricing `json:"data"`
			}
			require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &payload))
			require.True(t, payload.Success)
			actual := make([]string, 0, len(payload.Data))
			for _, item := range payload.Data {
				actual = append(actual, item.ModelName)
			}
			assert.ElementsMatch(t, test.expected, actual)
			assert.Len(t, actual, len(test.expected))
		})
	}
}
