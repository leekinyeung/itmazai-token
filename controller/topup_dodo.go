package controller

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"github.com/thanhpk/randstr"
)

const (
	dodoTestCheckoutURL = "https://test.dodopayments.com/checkouts"
	dodoLiveCheckoutURL = "https://live.dodopayments.com/checkouts"
	// Dodo Pay What You Want products are restricted to these base currencies,
	// all of which use two decimal places (minor units = 1/100).
	dodoMinorUnitsPerMajor = 100
	// Standard Webhooks tolerates a five minute clock skew.
	dodoWebhookToleranceSeconds = 300
)

var dodoSupportedCurrencies = map[string]bool{"USD": true, "EUR": true, "GBP": true}

// dodoPayMoney converts a wallet top-up amount into the amount charged in the
// configured Dodo currency. All multipliers are validated before they reach a
// decimal conversion, so a broken admin setting cannot create a free top-up.
func dodoPayMoney(amount int64, group string) (decimal.Decimal, error) {
	unitPrice := setting.DodoUnitPrice
	if unitPrice <= 0 || math.IsNaN(unitPrice) || math.IsInf(unitPrice, 0) {
		return decimal.Zero, errors.New("invalid Dodo unit price")
	}

	displayAmount := decimal.NewFromInt(amount)
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		if common.QuotaPerUnit <= 0 || math.IsNaN(common.QuotaPerUnit) || math.IsInf(common.QuotaPerUnit, 0) {
			return decimal.Zero, errors.New("invalid quota per unit")
		}
		displayAmount = displayAmount.Div(decimal.NewFromFloat(common.QuotaPerUnit))
	}

	groupRatio := common.GetTopupGroupRatio(group)
	if groupRatio == 0 {
		groupRatio = 1
	}
	if groupRatio <= 0 || math.IsNaN(groupRatio) || math.IsInf(groupRatio, 0) {
		return decimal.Zero, errors.New("invalid top-up group ratio")
	}

	discount := 1.0
	if configured, ok := operation_setting.GetPaymentSetting().AmountDiscount[int(amount)]; ok && configured > 0 {
		discount = configured
	}
	if discount <= 0 || math.IsNaN(discount) || math.IsInf(discount, 0) {
		return decimal.Zero, errors.New("invalid top-up discount")
	}

	money := displayAmount.
		Mul(decimal.NewFromFloat(unitPrice)).
		Mul(decimal.NewFromFloat(groupRatio)).
		Mul(decimal.NewFromFloat(discount)).
		Round(2)
	if !money.IsPositive() {
		return decimal.Zero, errors.New("Dodo payment amount must be positive")
	}
	// product_cart[].amount is an int32 in Dodo's API.
	if money.Mul(decimal.NewFromInt(dodoMinorUnitsPerMajor)).GreaterThan(decimal.NewFromInt(math.MaxInt32)) {
		return decimal.Zero, errors.New("Dodo payment amount exceeds the API limit")
	}
	return money, nil
}

func dodoCurrency() (string, error) {
	currency := strings.ToUpper(strings.TrimSpace(setting.DodoCurrency))
	if currency == "" {
		return "USD", nil
	}
	if !dodoSupportedCurrencies[currency] {
		return "", fmt.Errorf("unsupported Dodo currency %q", currency)
	}
	return currency, nil
}

func dodoCreditedAmount(amount int64) int64 {
	if operation_setting.GetQuotaDisplayType() != operation_setting.QuotaDisplayTypeTokens {
		return amount
	}
	return decimal.NewFromInt(amount).Div(decimal.NewFromFloat(common.QuotaPerUnit)).IntPart()
}

func dodoCustomerEmail(user *model.User) string {
	if strings.TrimSpace(user.Email) != "" {
		return user.Email
	}
	// Dodo requires an email for a new customer; accounts without one still
	// need a syntactically valid, unique placeholder.
	return fmt.Sprintf("%d@examples.com", user.Id)
}

type DodoPayRequest struct {
	Amount        int64  `json:"amount"`
	PaymentMethod string `json:"payment_method"`
}

// RequestDodoAmount previews the charge shown in the wallet confirm dialog.
func RequestDodoAmount(c *gin.Context) {
	if !isDodoTopUpEnabled() {
		paymentError(c, common.NewMessage("Payment information has not been configured by administrator"))
		return
	}
	var req AmountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		paymentError(c, common.NewMessage("Invalid parameters"))
		return
	}
	if req.Amount < int64(setting.DodoMinTopUp) {
		paymentError(c, common.NewMessage("Top-up amount cannot be less than {{min}}", map[string]any{"min": setting.DodoMinTopUp}))
		return
	}
	id := c.GetInt("id")
	if rejectInvalidTopUpQuota(c, id, req.Amount) {
		return
	}
	group, err := model.GetUserGroup(id, true)
	if err != nil {
		paymentError(c, common.NewMessage("Failed to get the user group"))
		return
	}
	money, err := dodoPayMoney(req.Amount, group)
	if err != nil || money.LessThan(decimal.NewFromFloat(0.01)) {
		paymentError(c, common.NewMessage("Payment amount is too low"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "success", "data": money.StringFixed(2)})
}

// RequestDodoPay creates a pending top-up order and a hosted checkout session.
// The credited quota always comes from this local order, never from the client
// or the webhook payload.
func RequestDodoPay(c *gin.Context) {
	if !isDodoTopUpEnabled() {
		paymentError(c, common.NewMessage("Payment information has not been configured by administrator"))
		return
	}
	var req DodoPayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		paymentError(c, common.NewMessage("Invalid parameters"))
		return
	}
	if req.PaymentMethod != "" && req.PaymentMethod != model.PaymentMethodDodo {
		paymentError(c, common.NewMessage("Unsupported payment channel"))
		return
	}
	if req.Amount < int64(setting.DodoMinTopUp) {
		paymentError(c, common.NewMessage("Top-up amount cannot be less than {{min}}", map[string]any{"min": setting.DodoMinTopUp}))
		return
	}
	currency, err := dodoCurrency()
	if err != nil {
		logger.LogError(c.Request.Context(), common.LogText("Dodo invalid currency user_id=%d error=%q", c.GetInt("id"), err.Error()))
		paymentError(c, common.NewMessage("Payment information has not been configured by administrator"))
		return
	}
	id := c.GetInt("id")
	if rejectInvalidTopUpQuota(c, id, req.Amount) {
		return
	}

	user, err := model.GetUserById(id, false)
	if err != nil || user == nil {
		paymentError(c, common.NewMessage("User does not exist"))
		return
	}
	group, err := model.GetUserGroup(id, true)
	if err != nil {
		paymentError(c, common.NewMessage("Failed to get the user group"))
		return
	}
	money, err := dodoPayMoney(req.Amount, group)
	if err != nil || money.LessThan(decimal.NewFromFloat(0.01)) {
		paymentError(c, common.NewMessage("Payment amount is too low"))
		return
	}
	amountInMinorUnits := money.Mul(decimal.NewFromInt(dodoMinorUnitsPerMajor)).IntPart()

	tradeNo := fmt.Sprintf("DODO-%d-%d-%s", id, time.Now().UnixMilli(), randstr.String(6))
	topUp := &model.TopUp{
		UserId:          id,
		Amount:          dodoCreditedAmount(req.Amount),
		Money:           money.InexactFloat64(),
		TradeNo:         tradeNo,
		PaymentMethod:   model.PaymentMethodDodo,
		PaymentProvider: model.PaymentProviderDodo,
		CreateTime:      time.Now().Unix(),
		Status:          common.TopUpStatusPending,
	}
	if err := topUp.Insert(); err != nil {
		logger.LogError(c.Request.Context(), common.LogText("Dodo failed to create top-up order user_id=%d trade_no=%s error=%q", id, tradeNo, err.Error()))
		paymentError(c, common.NewMessage("Failed to create order"))
		return
	}

	checkoutURL, err := createDodoCheckout(c.Request.Context(), tradeNo, amountInMinorUnits, currency, user)
	if err != nil {
		logger.LogError(c.Request.Context(), common.LogText("Dodo failed to create checkout user_id=%d trade_no=%s error=%q", id, tradeNo, err.Error()))
		paymentError(c, common.NewMessage("Failed to start payment"))
		return
	}
	logger.LogInfo(c.Request.Context(), common.LogText("Dodo top-up order created user_id=%d trade_no=%s amount=%d money=%s currency=%s", id, tradeNo, req.Amount, money.StringFixed(2), currency))

	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data": gin.H{
			"checkout_url": checkoutURL,
			"order_id":     tradeNo,
		},
	})
}

type dodoCheckoutProduct struct {
	ProductID string `json:"product_id"`
	Quantity  int    `json:"quantity"`
	Amount    int64  `json:"amount"`
}

type dodoCheckoutCustomer struct {
	Email string `json:"email"`
	Name  string `json:"name,omitempty"`
}

type dodoCheckoutRequest struct {
	ProductCart     []dodoCheckoutProduct `json:"product_cart"`
	Customer        dodoCheckoutCustomer  `json:"customer"`
	ReturnURL       string                `json:"return_url"`
	BillingCurrency string                `json:"billing_currency,omitempty"`
	Metadata        map[string]string     `json:"metadata"`
	FeatureFlags    map[string]bool       `json:"feature_flags,omitempty"`
}

type dodoCheckoutResponse struct {
	CheckoutURL string `json:"checkout_url"`
	SessionID   string `json:"session_id"`
}

func createDodoCheckout(ctx context.Context, tradeNo string, amountInMinorUnits int64, currency string, user *model.User) (string, error) {
	apiURL := dodoLiveCheckoutURL
	if setting.DodoTestMode {
		apiURL = dodoTestCheckoutURL
	}
	requestBody := dodoCheckoutRequest{
		ProductCart: []dodoCheckoutProduct{{
			ProductID: strings.TrimSpace(setting.DodoProductId),
			Quantity:  1,
			Amount:    amountInMinorUnits,
		}},
		Customer: dodoCheckoutCustomer{
			Email: dodoCustomerEmail(user),
			Name:  user.Username,
		},
		ReturnURL:       paymentReturnPath("/wallet?show_history=true"),
		BillingCurrency: currency,
		Metadata: map[string]string{
			"trade_no": tradeNo,
			"user_id":  strconv.Itoa(user.Id),
		},
		// A customer-applied discount or a currency switch would make the paid
		// amount diverge from the locally recorded order.
		FeatureFlags: map[string]bool{
			"allow_discount_code":      false,
			"allow_currency_selection": false,
		},
	}
	payload, err := common.Marshal(requestBody)
	if err != nil {
		return "", fmt.Errorf("marshal checkout request: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewReader(payload))
	if err != nil {
		return "", fmt.Errorf("build checkout request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+strings.TrimSpace(setting.DodoApiKey))

	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("send checkout request: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return "", fmt.Errorf("read checkout response: %w", err)
	}
	if resp.StatusCode/100 != 2 {
		return "", fmt.Errorf("checkout http status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	var parsed dodoCheckoutResponse
	if err := common.Unmarshal(body, &parsed); err != nil {
		return "", fmt.Errorf("parse checkout response: %w", err)
	}
	if parsed.CheckoutURL == "" {
		return "", errors.New("checkout response has no checkout_url")
	}
	return parsed.CheckoutURL, nil
}

type dodoWebhookEvent struct {
	BusinessID string `json:"business_id"`
	Type       string `json:"type"`
	Timestamp  string `json:"timestamp"`
	Data       struct {
		PayloadType string         `json:"payload_type"`
		PaymentID   string         `json:"payment_id"`
		Status      string         `json:"status"`
		TotalAmount int64          `json:"total_amount"`
		Currency    string         `json:"currency"`
		Metadata    map[string]any `json:"metadata"`
		Customer    struct {
			Email string `json:"email"`
		} `json:"customer"`
		ProductCart []struct {
			ProductID string `json:"product_id"`
		} `json:"product_cart"`
	} `json:"data"`
}

// verifyDodoWebhookSignature implements the Standard Webhooks scheme used by
// Dodo Payments: base64(HMAC-SHA256(secret, "{id}.{timestamp}.{raw body}")).
func verifyDodoWebhookSignature(payload []byte, webhookID, timestampHeader, signatureHeader, secret string, now time.Time) error {
	if webhookID == "" || timestampHeader == "" || signatureHeader == "" || strings.TrimSpace(secret) == "" {
		return errors.New("missing webhook signature headers or secret")
	}
	seconds, err := strconv.ParseInt(timestampHeader, 10, 64)
	if err != nil {
		return errors.New("invalid webhook timestamp")
	}
	if math.Abs(float64(now.Unix()-seconds)) > dodoWebhookToleranceSeconds {
		return errors.New("webhook timestamp outside tolerance")
	}

	encodedKey := strings.TrimPrefix(strings.TrimSpace(secret), "whsec_")
	key, err := base64.StdEncoding.DecodeString(encodedKey)
	if err != nil {
		key, err = base64.RawStdEncoding.DecodeString(encodedKey)
		if err != nil {
			return errors.New("invalid webhook secret encoding")
		}
	}
	signedContent := webhookID + "." + timestampHeader + "." + string(payload)
	mac := hmac.New(sha256.New, key)
	_, _ = mac.Write([]byte(signedContent))
	expected := []byte(base64.StdEncoding.EncodeToString(mac.Sum(nil)))

	for signature := range strings.SplitSeq(signatureHeader, " ") {
		candidate, ok := strings.CutPrefix(signature, "v1,")
		if ok && hmac.Equal(expected, []byte(candidate)) {
			return nil
		}
	}
	return errors.New("webhook signature mismatch")
}

func dodoMetadataTradeNo(metadata map[string]any) string {
	value, ok := metadata["trade_no"].(string)
	if !ok {
		return ""
	}
	return strings.TrimSpace(value)
}

// DodoWebhook fulfils a pending top-up only on a verified payment.succeeded
// event. Retries are safe: the database row lock in RechargeDodo and the
// pending-status check make the credit operation idempotent.
func DodoWebhook(c *gin.Context) {
	if !isDodoWebhookEnabled() {
		logger.LogWarn(c.Request.Context(), common.LogText("Dodo webhook rejected reason=webhook_disabled path=%q client_ip=%s", c.Request.RequestURI, c.ClientIP()))
		c.AbortWithStatus(http.StatusForbidden)
		return
	}
	body, err := io.ReadAll(io.LimitReader(c.Request.Body, 1<<20))
	if err != nil {
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}
	if err := verifyDodoWebhookSignature(
		body,
		c.GetHeader("webhook-id"),
		c.GetHeader("webhook-timestamp"),
		c.GetHeader("webhook-signature"),
		setting.DodoWebhookKey,
		time.Now(),
	); err != nil {
		logger.LogWarn(c.Request.Context(), common.LogText("Dodo webhook signature rejected reason=%q path=%q client_ip=%s", err.Error(), c.Request.RequestURI, c.ClientIP()))
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	var event dodoWebhookEvent
	if err := common.Unmarshal(body, &event); err != nil {
		logger.LogWarn(c.Request.Context(), common.LogText("Dodo webhook failed to parse error=%q client_ip=%s", err.Error(), c.ClientIP()))
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}
	if event.Type != "payment.succeeded" {
		c.Status(http.StatusOK)
		return
	}

	tradeNo := dodoMetadataTradeNo(event.Data.Metadata)
	if tradeNo == "" {
		logger.LogWarn(c.Request.Context(), common.LogText("Dodo webhook missing trade_no event_type=%s payment_id=%s", event.Type, event.Data.PaymentID))
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}
	topUp := model.GetTopUpByTradeNo(tradeNo)
	if topUp == nil {
		logger.LogWarn(c.Request.Context(), common.LogText("Dodo webhook order not found trade_no=%s payment_id=%s", tradeNo, event.Data.PaymentID))
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}
	if topUp.PaymentProvider != model.PaymentProviderDodo {
		logger.LogWarn(c.Request.Context(), common.LogText("Dodo webhook order payment gateway mismatch trade_no=%s payment_provider=%s", tradeNo, topUp.PaymentProvider))
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}
	expectedMinor := decimal.NewFromFloat(topUp.Money).Mul(decimal.NewFromInt(dodoMinorUnitsPerMajor)).Round(0).IntPart()
	if event.Data.TotalAmount > 0 && event.Data.TotalAmount < expectedMinor {
		logger.LogWarn(c.Request.Context(), common.LogText("Dodo webhook underpayment rejected trade_no=%s paid=%d expected=%d currency=%s", tradeNo, event.Data.TotalAmount, expectedMinor, event.Data.Currency))
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}
	if len(event.Data.ProductCart) > 0 && event.Data.ProductCart[0].ProductID != strings.TrimSpace(setting.DodoProductId) {
		logger.LogWarn(c.Request.Context(), common.LogText("Dodo webhook product mismatch trade_no=%s product_id=%s", tradeNo, event.Data.ProductCart[0].ProductID))
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}

	LockOrder(tradeNo)
	defer UnlockOrder(tradeNo)
	alreadyDone, err := model.RechargeDodo(tradeNo, event.Data.PaymentID, event.Data.Customer.Email, c.ClientIP())
	if err != nil {
		logger.LogError(c.Request.Context(), common.LogText("Dodo top-up processing failed trade_no=%s payment_id=%s error=%q", tradeNo, event.Data.PaymentID, err.Error()))
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}
	if alreadyDone {
		logger.LogInfo(c.Request.Context(), common.LogText("Dodo duplicate callback ignored trade_no=%s payment_id=%s", tradeNo, event.Data.PaymentID))
	} else {
		logger.LogInfo(c.Request.Context(), common.LogText("Dodo top-up succeeded trade_no=%s payment_id=%s quota=%d money=%.2f", tradeNo, event.Data.PaymentID, topUp.Amount, topUp.Money))
	}
	c.Status(http.StatusOK)
}
