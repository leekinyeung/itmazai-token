package controller

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"strings"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const dodoTestWebhookSecret = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw"

func dodoTestSignature(t *testing.T, secret string, webhookID string, timestamp string, payload []byte) string {
	t.Helper()
	key, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(secret, "whsec_"))
	require.NoError(t, err)
	mac := hmac.New(sha256.New, key)
	_, err = mac.Write([]byte(webhookID + "." + timestamp + "." + string(payload)))
	require.NoError(t, err)
	return "v1," + base64.StdEncoding.EncodeToString(mac.Sum(nil))
}

func TestVerifyDodoWebhookSignature(t *testing.T) {
	payload := []byte(`{"type":"payment.succeeded","data":{"payment_id":"pay_123"}}`)
	now := time.Unix(1_760_000_000, 0)
	webhookID := "msg_123"
	timestamp := "1760000000"

	t.Run("accepts a valid signature", func(t *testing.T) {
		signature := dodoTestSignature(t, dodoTestWebhookSecret, webhookID, timestamp, payload)
		require.NoError(t, verifyDodoWebhookSignature(payload, webhookID, timestamp, signature, dodoTestWebhookSecret, now))
	})

	t.Run("accepts the signing secret without the whsec prefix", func(t *testing.T) {
		secret := strings.TrimPrefix(dodoTestWebhookSecret, "whsec_")
		signature := dodoTestSignature(t, dodoTestWebhookSecret, webhookID, timestamp, payload)
		require.NoError(t, verifyDodoWebhookSignature(payload, webhookID, timestamp, signature, secret, now))
	})

	t.Run("accepts a matching signature in a multi signature header", func(t *testing.T) {
		signature := dodoTestSignature(t, dodoTestWebhookSecret, webhookID, timestamp, payload)
		header := "v1,AAAA" + " " + signature
		require.NoError(t, verifyDodoWebhookSignature(payload, webhookID, timestamp, header, dodoTestWebhookSecret, now))
	})

	t.Run("rejects a tampered payload", func(t *testing.T) {
		signature := dodoTestSignature(t, dodoTestWebhookSecret, webhookID, timestamp, payload)
		tampered := []byte(`{"type":"payment.succeeded","data":{"payment_id":"pay_456"}}`)
		require.Error(t, verifyDodoWebhookSignature(tampered, webhookID, timestamp, signature, dodoTestWebhookSecret, now))
	})

	t.Run("rejects a stale timestamp", func(t *testing.T) {
		staleTimestamp := "1759999000" // 16m40s before now
		signature := dodoTestSignature(t, dodoTestWebhookSecret, webhookID, staleTimestamp, payload)
		require.Error(t, verifyDodoWebhookSignature(payload, webhookID, staleTimestamp, signature, dodoTestWebhookSecret, now))
	})

	t.Run("rejects a future timestamp beyond tolerance", func(t *testing.T) {
		futureTimestamp := "1760000600" // 10m after now
		signature := dodoTestSignature(t, dodoTestWebhookSecret, webhookID, futureTimestamp, payload)
		require.Error(t, verifyDodoWebhookSignature(payload, webhookID, futureTimestamp, signature, dodoTestWebhookSecret, now))
	})

	t.Run("rejects a missing signature header", func(t *testing.T) {
		require.Error(t, verifyDodoWebhookSignature(payload, webhookID, timestamp, "", dodoTestWebhookSecret, now))
	})

	t.Run("rejects an empty secret", func(t *testing.T) {
		signature := dodoTestSignature(t, dodoTestWebhookSecret, webhookID, timestamp, payload)
		require.Error(t, verifyDodoWebhookSignature(payload, webhookID, timestamp, signature, "", now))
	})

	t.Run("rejects a signature produced with another secret", func(t *testing.T) {
		otherSecret := "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSx"
		signature := dodoTestSignature(t, otherSecret, webhookID, timestamp, payload)
		require.Error(t, verifyDodoWebhookSignature(payload, webhookID, timestamp, signature, dodoTestWebhookSecret, now))
	})
}

func TestDodoCurrency(t *testing.T) {
	originalCurrency := setting.DodoCurrency
	t.Cleanup(func() { setting.DodoCurrency = originalCurrency })

	setting.DodoCurrency = ""
	currency, err := dodoCurrency()
	require.NoError(t, err)
	assert.Equal(t, "USD", currency)

	setting.DodoCurrency = " eur "
	currency, err = dodoCurrency()
	require.NoError(t, err)
	assert.Equal(t, "EUR", currency)

	setting.DodoCurrency = "JPY"
	_, err = dodoCurrency()
	require.Error(t, err)
}

func TestDodoPayMoneyAppliesUnitPriceAndGroupRatio(t *testing.T) {
	originalUnitPrice := setting.DodoUnitPrice
	originalRatio := common.TopupGroupRatio2JSONString()
	originalDisplay := operation_setting.GetGeneralSetting().QuotaDisplayType
	t.Cleanup(func() {
		setting.DodoUnitPrice = originalUnitPrice
		require.NoError(t, common.UpdateTopupGroupRatioByJSONString(originalRatio))
		operation_setting.GetGeneralSetting().QuotaDisplayType = originalDisplay
	})

	operation_setting.GetGeneralSetting().QuotaDisplayType = operation_setting.QuotaDisplayTypeUSD
	setting.DodoUnitPrice = 0.25

	money, err := dodoPayMoney(100, "default")
	require.NoError(t, err)
	assert.Equal(t, "25.00", money.StringFixed(2))

	require.NoError(t, common.UpdateTopupGroupRatioByJSONString(`{"default":1,"vip":0.5}`))

	money, err = dodoPayMoney(100, "vip")
	require.NoError(t, err)
	assert.Equal(t, "12.50", money.StringFixed(2))
}

func TestDodoPayMoneyUsesQuotaPerUnitInTokenDisplay(t *testing.T) {
	originalUnitPrice := setting.DodoUnitPrice
	originalQuotaPerUnit := common.QuotaPerUnit
	originalDisplay := operation_setting.GetGeneralSetting().QuotaDisplayType
	t.Cleanup(func() {
		setting.DodoUnitPrice = originalUnitPrice
		common.QuotaPerUnit = originalQuotaPerUnit
		operation_setting.GetGeneralSetting().QuotaDisplayType = originalDisplay
	})

	operation_setting.GetGeneralSetting().QuotaDisplayType = operation_setting.QuotaDisplayTypeTokens
	setting.DodoUnitPrice = 2
	common.QuotaPerUnit = 500000

	money, err := dodoPayMoney(1000000, "default")
	require.NoError(t, err)
	assert.Equal(t, "4.00", money.StringFixed(2))
}

func TestDodoPayMoneyRejectsInvalidConfiguration(t *testing.T) {
	originalUnitPrice := setting.DodoUnitPrice
	originalDisplay := operation_setting.GetGeneralSetting().QuotaDisplayType
	t.Cleanup(func() {
		setting.DodoUnitPrice = originalUnitPrice
		operation_setting.GetGeneralSetting().QuotaDisplayType = originalDisplay
	})
	operation_setting.GetGeneralSetting().QuotaDisplayType = operation_setting.QuotaDisplayTypeUSD

	setting.DodoUnitPrice = 0
	_, err := dodoPayMoney(100, "default")
	require.Error(t, err)

	setting.DodoUnitPrice = -1
	_, err = dodoPayMoney(100, "default")
	require.Error(t, err)

	setting.DodoUnitPrice = 1
	_, err = dodoPayMoney(0, "default")
	require.Error(t, err)
}

func TestDodoPayMoneyRejectsAmountAboveAPILimit(t *testing.T) {
	originalUnitPrice := setting.DodoUnitPrice
	originalDisplay := operation_setting.GetGeneralSetting().QuotaDisplayType
	t.Cleanup(func() {
		setting.DodoUnitPrice = originalUnitPrice
		operation_setting.GetGeneralSetting().QuotaDisplayType = originalDisplay
	})

	operation_setting.GetGeneralSetting().QuotaDisplayType = operation_setting.QuotaDisplayTypeUSD
	setting.DodoUnitPrice = 1

	_, err := dodoPayMoney(3_000_000_000, "default")
	require.Error(t, err)
}

func TestDodoTopUpRequiresCompleteConfiguration(t *testing.T) {
	originalAPIKey := setting.DodoApiKey
	originalWebhookKey := setting.DodoWebhookKey
	originalProductID := setting.DodoProductId
	t.Cleanup(func() {
		setting.DodoApiKey = originalAPIKey
		setting.DodoWebhookKey = originalWebhookKey
		setting.DodoProductId = originalProductID
	})

	setting.DodoApiKey = "sk_test_123"
	setting.DodoWebhookKey = "whsec_test"
	setting.DodoProductId = ""
	require.False(t, isDodoTopUpEnabled())
	require.False(t, isDodoWebhookEnabled())

	setting.DodoProductId = "pdt_123"
	require.True(t, isDodoTopUpEnabled())
	require.True(t, isDodoWebhookEnabled())

	setting.DodoWebhookKey = " "
	require.False(t, isDodoTopUpEnabled())
	require.False(t, isDodoWebhookEnabled())
}
