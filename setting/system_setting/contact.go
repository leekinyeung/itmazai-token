package system_setting

import (
	"net/mail"
	"net/url"
	"slices"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/config"
)

const (
	ContactEmailKey     = "contact.email"
	ContactFacebookKey  = "contact.facebook"
	ContactYouTubeKey   = "contact.youtube"
	ContactInstagramKey = "contact.instagram"
	ContactTelegramKey  = "contact.telegram"
	ContactXKey         = "contact.x"

	maxContactValueLength = 500
)

var contactSettingKeys = []string{
	ContactEmailKey,
	ContactFacebookKey,
	ContactYouTubeKey,
	ContactInstagramKey,
	ContactTelegramKey,
	ContactXKey,
}

type ContactSettings struct {
	Email     string `json:"email"`
	Facebook  string `json:"facebook"`
	YouTube   string `json:"youtube"`
	Instagram string `json:"instagram"`
	Telegram  string `json:"telegram"`
	X         string `json:"x"`
}

var defaultContactSettings = ContactSettings{}

func init() {
	config.GlobalConfig.Register("contact", &defaultContactSettings)
}

func GetContactSettings() *ContactSettings {
	return &defaultContactSettings
}

// ValidateContactSetting checks a single contact option before it is stored.
// Empty values are allowed and mean the corresponding footer link is hidden.
func ValidateContactSetting(key, value string) error {
	if !slices.Contains(contactSettingKeys, key) {
		return common.NewMessage("Unknown contact setting: {{key}}", map[string]any{"key": key})
	}

	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	if len(value) > maxContactValueLength {
		return common.NewMessage("Contact information cannot exceed {{max}} characters", map[string]any{"max": maxContactValueLength})
	}

	if key == ContactEmailKey {
		address, err := mail.ParseAddress(value)
		if err != nil || address.Address != value {
			return common.NewMessage("Invalid contact email address")
		}
		return nil
	}

	parsed, err := url.Parse(value)
	if err != nil ||
		!slices.Contains([]string{"http", "https"}, strings.ToLower(parsed.Scheme)) ||
		parsed.Host == "" || parsed.Opaque != "" {
		return common.NewMessage("Contact link must be a full http:// or https:// URL")
	}
	return nil
}
