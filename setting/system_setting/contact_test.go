package system_setting

import (
	"errors"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func contactMessageKey(t *testing.T, err error) (string, map[string]any) {
	t.Helper()
	var message *common.Message
	require.True(t, errors.As(err, &message), "validation error must be a translatable *common.Message")
	return message.Key, message.Params
}

func TestValidateContactSetting(t *testing.T) {
	tests := []struct {
		name    string
		key     string
		value   string
		wantErr string
		wantKey string
	}{
		{name: "empty email is allowed", key: ContactEmailKey, value: ""},
		{name: "whitespace-only is allowed", key: ContactFacebookKey, value: "   "},
		{name: "valid email", key: ContactEmailKey, value: "support@example.com"},
		{name: "valid https link", key: ContactFacebookKey, value: "https://www.facebook.com/your-page"},
		{name: "valid http link with query", key: ContactTelegramKey, value: "http://t.me/your-channel?start=1"},
		{name: "valid youtube link", key: ContactYouTubeKey, value: "https://www.youtube.com/@your-channel"},
		{name: "valid instagram link", key: ContactInstagramKey, value: "https://www.instagram.com/your-profile"},
		{name: "valid x link", key: ContactXKey, value: "https://x.com/your-handle"},

		{name: "email without at sign", key: ContactEmailKey, value: "not-an-email", wantErr: "Invalid contact email address"},
		{name: "email without domain", key: ContactEmailKey, value: "a@", wantErr: "Invalid contact email address"},
		{name: "email with display name", key: ContactEmailKey, value: "Support <support@example.com>", wantErr: "Invalid contact email address"},
		{name: "email with mailto prefix", key: ContactEmailKey, value: "mailto:support@example.com", wantErr: "Invalid contact email address"},
		{name: "email with trailing comment", key: ContactEmailKey, value: "support@example.com (support)", wantErr: "Invalid contact email address"},

		{name: "javascript scheme", key: ContactFacebookKey, value: "javascript:alert(1)", wantErr: "Contact link must be a full http:// or https:// URL"},
		{name: "data scheme", key: ContactFacebookKey, value: "data:text/html,<script>alert(1)</script>", wantErr: "Contact link must be a full http:// or https:// URL"},
		{name: "vbscript scheme", key: ContactFacebookKey, value: "vbscript:msgbox(1)", wantErr: "Contact link must be a full http:// or https:// URL"},
		{name: "ftp scheme", key: ContactFacebookKey, value: "ftp://example.com/file", wantErr: "Contact link must be a full http:// or https:// URL"},
		{name: "protocol relative", key: ContactFacebookKey, value: "//evil.com", wantErr: "Contact link must be a full http:// or https:// URL"},
		{name: "missing host", key: ContactFacebookKey, value: "https://", wantErr: "Contact link must be a full http:// or https:// URL"},
		{name: "plain text", key: ContactFacebookKey, value: "not a url", wantErr: "Contact link must be a full http:// or https:// URL"},
		{name: "too long", key: ContactFacebookKey, value: "https://example.com/" + strings.Repeat("a", maxContactValueLength), wantErr: "Contact information cannot exceed {{max}} characters"},

		{name: "unknown contact key", key: "contact.unknown", value: "https://example.com", wantErr: "Unknown contact setting: {{key}}", wantKey: "contact.unknown"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateContactSetting(tt.key, tt.value)
			if tt.wantErr == "" {
				require.NoError(t, err)
				return
			}
			require.Error(t, err)
			key, params := contactMessageKey(t, err)
			assert.Equal(t, tt.wantErr, key)
			if tt.wantKey != "" {
				assert.Equal(t, tt.wantKey, params["key"])
			}
			if key == "Contact information cannot exceed {{max}} characters" {
				assert.Equal(t, maxContactValueLength, params["max"])
			}
		})
	}
}

func TestContactConfigRegistrationAndReflection(t *testing.T) {
	manager := config.NewConfigManager()
	settings := &ContactSettings{}
	manager.Register("contact", settings)

	flat, err := config.ConfigToMap(settings)
	require.NoError(t, err)
	flatKeys := make([]string, 0, len(flat))
	for key := range flat {
		flatKeys = append(flatKeys, key)
	}
	assert.ElementsMatch(t, []string{"email", "facebook", "youtube", "instagram", "telegram", "x"}, flatKeys)

	exported := manager.ExportAllConfigs()
	for _, key := range contactSettingKeys {
		assert.Contains(t, exported, key)
	}

	require.NoError(t, config.UpdateConfigFromMap(settings, map[string]string{
		"email":    "support@example.com",
		"facebook": "https://www.facebook.com/your-page",
	}))
	assert.Equal(t, "support@example.com", settings.Email)
	assert.Equal(t, "https://www.facebook.com/your-page", settings.Facebook)
	assert.Empty(t, settings.YouTube)
}
