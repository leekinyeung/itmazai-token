package controller

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetStatusReturnsEffectiveOIDCDisplayName(t *testing.T) {
	settings := system_setting.GetOIDCSettings()
	originalDisplayName := settings.DisplayName
	originalOptionMap := common.OptionMap
	t.Cleanup(func() {
		settings.DisplayName = originalDisplayName
		common.OptionMap = originalOptionMap
	})
	common.OptionMap = map[string]string{}

	tests := []struct {
		name        string
		displayName string
		want        string
	}{
		{
			name:        "custom name is trimmed",
			displayName: "  Acme SSO  ",
			want:        "Acme SSO",
		},
		{
			name:        "whitespace-only name falls back",
			displayName: "   ",
			want:        "OIDC",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			settings.DisplayName = tt.displayName
			response := httptest.NewRecorder()
			context, _ := gin.CreateTestContext(response)
			context.Request = httptest.NewRequest(http.MethodGet, "/api/status", nil)

			GetStatus(context)

			var payload struct {
				Success bool           `json:"success"`
				Data    map[string]any `json:"data"`
			}
			require.NoError(t, common.Unmarshal(response.Body.Bytes(), &payload))
			require.True(t, payload.Success)
			assert.Equal(t, tt.want, payload.Data["oidc_display_name"])
		})
	}
}

func TestGroupDisplayNamesValidationCopyAndStatus(t *testing.T) {
	original := setting.GroupDisplayNames2JSONString()
	originalOptionMap := common.OptionMap
	t.Cleanup(func() {
		require.NoError(t, setting.UpdateGroupDisplayNamesByJSONString(original))
		common.OptionMap = originalOptionMap
	})
	common.OptionMap = map[string]string{}

	valid := `{
		"default":{"en":" Default ","zh":"默认","fr":"  "},
		"partner":{"zh-TW":"合作夥伴"}
	}`
	require.NoError(t, setting.ValidateGroupDisplayNamesJSONString(valid))
	require.NoError(t, setting.UpdateGroupDisplayNamesByJSONString(valid))

	displayNames := setting.GetGroupDisplayNamesCopy()
	assert.Equal(t, map[string]map[string]string{
		"default": {"en": "Default", "zh": "默认"},
		"partner": {"zh-TW": "合作夥伴"},
	}, displayNames)
	displayNames["default"]["en"] = "Changed"
	displayNames["new"] = map[string]string{"en": "New"}
	assert.Equal(t, "Default", setting.GetGroupDisplayNamesCopy()["default"]["en"])
	assert.NotContains(t, setting.GetGroupDisplayNamesCopy(), "new")
	var serialized map[string]map[string]string
	require.NoError(t, common.UnmarshalJsonStr(setting.GroupDisplayNames2JSONString(), &serialized))
	assert.NotContains(t, serialized["default"], "fr")

	for _, invalid := range []string{
		`not-json`,
		`null`,
		`{"default":1}`,
		`{"default":{"de":"Standard"}}`,
	} {
		require.Error(t, setting.ValidateGroupDisplayNamesJSONString(invalid))
		require.Error(t, setting.UpdateGroupDisplayNamesByJSONString(invalid))
		assert.Equal(t, "Default", setting.GetGroupDisplayNamesCopy()["default"]["en"])
	}

	response := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(response)
	context.Request = httptest.NewRequest(http.MethodGet, "/api/status", nil)
	GetStatus(context)

	var payload struct {
		Success bool `json:"success"`
		Data    struct {
			GroupDisplayNames map[string]map[string]string `json:"group_display_names"`
		} `json:"data"`
	}
	require.NoError(t, common.Unmarshal(response.Body.Bytes(), &payload))
	require.True(t, payload.Success)
	assert.Equal(t, "默认", payload.Data.GroupDisplayNames["default"]["zh"])
	assert.Equal(t, "合作夥伴", payload.Data.GroupDisplayNames["partner"]["zh-TW"])
}
