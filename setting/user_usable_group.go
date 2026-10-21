package setting

import (
	"fmt"
	"maps"
	"strings"
	"sync"

	"github.com/QuantumNous/new-api/common"
)

// The default descriptions are English source keys that the web console
// translates; descriptions an administrator saves are shown as written.
var userUsableGroups = map[string]string{
	"default": "Default group",
	"vip":     "VIP group",
}
var userUsableGroupsMutex sync.RWMutex

var groupDisplayNames = map[string]map[string]string{
	"default": {
		"en": "Default", "zh": "默认", "zh-TW": "預設", "fr": "Par défaut",
		"ja": "デフォルト", "ru": "По умолчанию", "vi": "Mặc định",
	},
	"vip": {
		"en": "VIP", "zh": "VIP", "zh-TW": "VIP", "fr": "VIP",
		"ja": "VIP", "ru": "VIP", "vi": "VIP",
	},
}
var groupDisplayNamesMutex sync.RWMutex

var supportedGroupDisplayNameLocales = map[string]struct{}{
	"en": {}, "zh": {}, "zh-TW": {}, "fr": {}, "ja": {}, "ru": {}, "vi": {},
}

func GetUserUsableGroupsCopy() map[string]string {
	userUsableGroupsMutex.RLock()
	defer userUsableGroupsMutex.RUnlock()

	copyUserUsableGroups := make(map[string]string)
	maps.Copy(copyUserUsableGroups, userUsableGroups)
	return copyUserUsableGroups
}

func UserUsableGroups2JSONString() string {
	userUsableGroupsMutex.RLock()
	defer userUsableGroupsMutex.RUnlock()

	jsonBytes, err := common.Marshal(userUsableGroups)
	if err != nil {
		common.SysLog(common.LogText("error marshalling user groups: %s", err.Error()))
	}
	return string(jsonBytes)
}

func UpdateUserUsableGroupsByJSONString(jsonStr string) error {
	userUsableGroupsMutex.Lock()
	defer userUsableGroupsMutex.Unlock()

	userUsableGroups = make(map[string]string)
	return common.UnmarshalJsonStr(jsonStr, &userUsableGroups)
}

func GetUsableGroupDescription(groupName string) string {
	userUsableGroupsMutex.RLock()
	defer userUsableGroupsMutex.RUnlock()

	if desc, ok := userUsableGroups[groupName]; ok {
		return desc
	}
	return groupName
}

func GetGroupDisplayNamesCopy() map[string]map[string]string {
	groupDisplayNamesMutex.RLock()
	defer groupDisplayNamesMutex.RUnlock()

	copyDisplayNames := make(map[string]map[string]string, len(groupDisplayNames))
	for group, localizedNames := range groupDisplayNames {
		copyDisplayNames[group] = maps.Clone(localizedNames)
	}
	return copyDisplayNames
}

func GroupDisplayNames2JSONString() string {
	groupDisplayNamesMutex.RLock()
	defer groupDisplayNamesMutex.RUnlock()

	jsonBytes, err := common.Marshal(groupDisplayNames)
	if err != nil {
		common.SysLog(common.LogText("error marshalling group display names: %s", err.Error()))
	}
	return string(jsonBytes)
}

func ValidateGroupDisplayNamesJSONString(jsonStr string) error {
	_, err := parseGroupDisplayNamesJSONString(jsonStr)
	return err
}

func UpdateGroupDisplayNamesByJSONString(jsonStr string) error {
	parsed, err := parseGroupDisplayNamesJSONString(jsonStr)
	if err != nil {
		return err
	}

	groupDisplayNamesMutex.Lock()
	groupDisplayNames = parsed
	groupDisplayNamesMutex.Unlock()
	return nil
}

func parseGroupDisplayNamesJSONString(jsonStr string) (map[string]map[string]string, error) {
	var parsed map[string]map[string]string
	if err := common.UnmarshalJsonStr(jsonStr, &parsed); err != nil {
		return nil, fmt.Errorf("invalid group display names JSON: %w", err)
	}
	if parsed == nil {
		return nil, fmt.Errorf("group display names must be a JSON object")
	}

	normalized := make(map[string]map[string]string, len(parsed))
	for group, localizedNames := range parsed {
		if strings.TrimSpace(group) == "" {
			return nil, fmt.Errorf("group display name keys must not be empty")
		}
		if localizedNames == nil {
			return nil, fmt.Errorf("display names for group %q must be a JSON object", group)
		}

		cleanedNames := make(map[string]string, len(localizedNames))
		for locale, displayName := range localizedNames {
			if _, ok := supportedGroupDisplayNameLocales[locale]; !ok {
				return nil, fmt.Errorf("unsupported group display name locale %q", locale)
			}
			if displayName = strings.TrimSpace(displayName); displayName != "" {
				cleanedNames[locale] = displayName
			}
		}
		if len(cleanedNames) > 0 {
			normalized[group] = cleanedNames
		}
	}
	return normalized, nil
}
