package controller

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/config"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

type paymentFeatureResponse struct {
	Success bool            `json:"success"`
	Message string          `json:"message"`
	Data    json.RawMessage `json:"data"`
}

func requestPaymentFeature(t *testing.T, handler gin.HandlerFunc, userID int, body any) paymentFeatureResponse {
	t.Helper()
	encoded, err := common.Marshal(body)
	require.NoError(t, err)
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodPost, "/", bytes.NewReader(encoded))
	context.Request.Header.Set("Content-Type", "application/json")
	context.Set("id", userID)
	context.Set("role", common.RoleRootUser)
	handler(context)
	var response paymentFeatureResponse
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &response), recorder.Body.String())
	return response
}

func TestPaymentFeaturesWithoutCompliance(t *testing.T) {
	previousConfig := config.GlobalConfig.ExportAllConfigs()
	previousInviter, previousInvitee, previousNew := common.QuotaForInviter, common.QuotaForInvitee, common.QuotaForNewUser
	previousUnit, previousBatch := common.QuotaPerUnit, common.BatchUpdateEnabled
	previousAddress, previousID, previousKey := operation_setting.PayAddress, operation_setting.EpayId, operation_setting.EpayKey
	previousMethods := operation_setting.PayMethods
	previousStripeAPI, previousStripeWebhook, previousStripePrice := setting.StripeApiSecret, setting.StripeWebhookSecret, setting.StripePriceId
	t.Cleanup(func() {
		require.NoError(t, config.GlobalConfig.LoadFromDB(previousConfig))
		common.QuotaForInviter, common.QuotaForInvitee, common.QuotaForNewUser = previousInviter, previousInvitee, previousNew
		common.QuotaPerUnit, common.BatchUpdateEnabled = previousUnit, previousBatch
		operation_setting.PayAddress, operation_setting.EpayId, operation_setting.EpayKey = previousAddress, previousID, previousKey
		operation_setting.PayMethods = previousMethods
		setting.StripeApiSecret, setting.StripeWebhookSecret, setting.StripePriceId = previousStripeAPI, previousStripeWebhook, previousStripePrice
	})
	common.QuotaPerUnit, common.BatchUpdateEnabled = 100, false
	operation_setting.PayAddress, operation_setting.EpayId, operation_setting.EpayKey = "https://pay.example.com", "merchant", "test-key"
	operation_setting.PayMethods = []map[string]string{{"type": "alipay", "name": "Alipay"}}
	setting.StripeApiSecret, setting.StripeWebhookSecret, setting.StripePriceId = "sk_test", "whsec_test", "price_test"

	for _, dialect := range []struct{ kind, env string }{{"sqlite", ""}, {"mysql", "TEST_MYSQL_DSN"}, {"postgres", "TEST_POSTGRES_DSN"}} {
		t.Run(dialect.kind, func(t *testing.T) {
			if dialect.env != "" && os.Getenv(dialect.env) == "" {
				t.Skip("set " + dialect.env + " to run this database")
			}
			db := modelManagementDB(t, dialect.kind, os.Getenv(dialect.env))
			require.NoError(t, db.AutoMigrate(&model.Redemption{}, &model.SubscriptionPlan{}, &model.SubscriptionOrder{}, &model.UserSubscription{}))
			logDB, _ := newAuditTestDatabase(t, dialect.kind, os.Getenv(dialect.env))
			require.NoError(t, logDB.AutoMigrate(&model.Log{}, &model.AuditLog{}))
			model.LOG_DB = logDB
			if dialect.kind == "sqlite" {
				connection, err := logDB.DB()
				require.NoError(t, err)
				t.Cleanup(func() { require.NoError(t, connection.Close()) })
			}

			for _, state := range []struct{ name, confirmed, version string }{
				{"missing", "", ""}, {"unconfirmed", "false", "v1"}, {"old-version", "true", "v0"},
			} {
				t.Run(state.name, func(t *testing.T) {
					require.NoError(t, db.Where("1 = 1").Delete(&model.Option{}).Error)
					require.NoError(t, config.GlobalConfig.LoadFromDB(map[string]string{
						"payment_setting.compliance_confirmed": "false", "payment_setting.compliance_terms_version": "",
					}))
					if state.confirmed != "" {
						require.NoError(t, db.Create(&[]model.Option{
							{Key: "payment_setting.compliance_confirmed", Value: state.confirmed},
							{Key: "payment_setting.compliance_terms_version", Value: state.version},
						}).Error)
					}
					for range 2 {
						model.InitOptionMap()
						options := requestPaymentFeature(t, GetOptions, 0, nil)
						require.True(t, options.Success)
						assert.NotContains(t, string(options.Data), "payment_setting.compliance_")
					}
					t.Run("configured gateways and redemption are available", func(t *testing.T) {
						response := requestPaymentFeature(t, GetTopUpInfo, 0, nil)
						require.True(t, response.Success)
						var data map[string]any
						require.NoError(t, common.Unmarshal(response.Data, &data))
						assert.Equal(t, true, data["enable_online_topup"])
						assert.Equal(t, true, data["enable_stripe_topup"])
						assert.Equal(t, true, data["enable_redemption"])
						assert.NotContains(t, data, "payment_compliance_confirmed")
						assert.NotContains(t, data, "payment_compliance_terms_version")
					})
					t.Run("retired options are rejected without changing stored history", func(t *testing.T) {
						response := requestPaymentFeature(t, UpdateOption, 0, OptionUpdateRequest{Key: "payment_setting.compliance_confirmed", Value: true})
						assert.False(t, response.Success)
						assert.Equal(t, "Invalid parameters", response.Message)
						var rows []model.Option
						require.NoError(t, db.Find(&rows).Error)
						if state.confirmed == "" {
							assert.Empty(t, rows)
						} else {
							assert.ElementsMatch(t, []model.Option{{Key: "payment_setting.compliance_confirmed", Value: state.confirmed}, {Key: "payment_setting.compliance_terms_version", Value: state.version}}, rows)
						}
					})
					for _, entry := range []struct {
						key   string
						value int
					}{{"QuotaForInviter", 200}, {"QuotaForInvitee", 50}} {
						response := requestPaymentFeature(t, UpdateOption, 0, OptionUpdateRequest{Key: entry.key, Value: entry.value})
						require.True(t, response.Success, response.Message)
					}
					common.QuotaForNewUser = 0
					inviter := model.User{Username: state.name + "-inviter", AffCode: state.name, Role: common.RoleCommonUser, Status: common.UserStatusEnabled, Group: "default"}
					require.NoError(t, db.Create(&inviter).Error)
					for _, method := range []string{"password", "oauth"} {
						t.Run(method+" registration credits configured rewards", func(t *testing.T) {
							user := model.User{Username: state.name + "-" + method, Role: common.RoleCommonUser, Status: common.UserStatusEnabled, Group: "default"}
							if method == "password" {
								require.NoError(t, user.Insert(inviter.Id))
							} else {
								require.NoError(t, db.Transaction(func(tx *gorm.DB) error { return user.InsertWithTx(tx, inviter.Id) }))
								user.FinalizeOAuthUserCreation(inviter.Id)
							}
							require.NoError(t, db.First(&user, user.Id).Error)
							assert.Equal(t, 50, user.Quota)
						})
					}
					require.NoError(t, db.First(&inviter, inviter.Id).Error)
					assert.Equal(t, 400, inviter.AffQuota)
					assert.Equal(t, 400, inviter.AffHistoryQuota)
					assert.Equal(t, 2, inviter.AffCount)
					t.Run("failed registrations do not issue rewards", func(t *testing.T) {
						duplicate := model.User{Username: state.name + "-password", Group: "default"}
						require.Error(t, duplicate.Insert(inviter.Id))
						rolledBack := model.User{Username: state.name + "-rollback", Group: "default"}
						require.Error(t, db.Transaction(func(tx *gorm.DB) error {
							if err := rolledBack.InsertWithTx(tx, inviter.Id); err != nil {
								return err
							}
							return errors.New("registration rolled back")
						}))
						require.NoError(t, db.First(&inviter, inviter.Id).Error)
						assert.Equal(t, 400, inviter.AffQuota)
						assert.Equal(t, 2, inviter.AffCount)
						var count int64
						require.NoError(t, db.Model(&model.User{}).Where("username = ?", rolledBack.Username).Count(&count).Error)
						assert.Zero(t, count)
					})
					t.Run("reward transfer changes only the available balance", func(t *testing.T) {
						response := requestPaymentFeature(t, TransferAffQuota, inviter.Id, TransferAffQuotaRequest{Quota: 200})
						require.True(t, response.Success, response.Message)
						require.NoError(t, db.First(&inviter, inviter.Id).Error)
						assert.Equal(t, 200, inviter.Quota)
						assert.Equal(t, 200, inviter.AffQuota)
						assert.Equal(t, 400, inviter.AffHistoryQuota)
					})
					t.Run("redemption credits once", func(t *testing.T) {
						created := requestPaymentFeature(t, AddRedemption, inviter.Id, map[string]any{"name": "credit", "count": 1, "quota": 100})
						require.True(t, created.Success, created.Message)
						var codes []string
						require.NoError(t, common.Unmarshal(created.Data, &codes))
						require.Len(t, codes, 1)
						first := requestPaymentFeature(t, TopUp, inviter.Id, map[string]any{"key": codes[0]})
						require.True(t, first.Success, first.Message)
						second := requestPaymentFeature(t, TopUp, inviter.Id, map[string]any{"key": codes[0]})
						assert.False(t, second.Success)
						require.NoError(t, db.First(&inviter, inviter.Id).Error)
						assert.Equal(t, 300, inviter.Quota)
					})
					t.Run("subscription purchase deducts once and rejects insufficient funds", func(t *testing.T) {
						created := requestPaymentFeature(t, AdminCreateSubscriptionPlan, inviter.Id, AdminUpsertSubscriptionPlanRequest{Plan: model.SubscriptionPlan{Title: "Monthly", PriceAmount: 2, Enabled: true}})
						require.True(t, created.Success, created.Message)
						var plan model.SubscriptionPlan
						require.NoError(t, db.Order("id desc").First(&plan).Error)
						listed := requestPaymentFeature(t, GetSubscriptionPlans, inviter.Id, nil)
						require.True(t, listed.Success)
						assert.Contains(t, string(listed.Data), "Monthly")
						paid := requestPaymentFeature(t, SubscriptionRequestBalancePay, inviter.Id, SubscriptionBalancePayRequest{PlanId: plan.Id})
						require.True(t, paid.Success, paid.Message)
						failed := requestPaymentFeature(t, SubscriptionRequestBalancePay, inviter.Id, SubscriptionBalancePayRequest{PlanId: plan.Id})
						assert.False(t, failed.Success)
						assert.Contains(t, failed.Message, "Insufficient balance")
						require.NoError(t, db.First(&inviter, inviter.Id).Error)
						assert.Equal(t, 100, inviter.Quota)
						var subscriptions int64
						require.NoError(t, db.Model(&model.UserSubscription{}).Where("user_id = ?", inviter.Id).Count(&subscriptions).Error)
						assert.EqualValues(t, 1, subscriptions)
					})
					var logs []model.Log
					require.NoError(t, logDB.Where("user_id = ?", inviter.Id).Find(&logs).Error)
					assert.Len(t, logs, 4, "two invitation rewards, one redemption, one purchase reach the separate log database")
					for key := range config.GlobalConfig.ExportAllConfigs() {
						assert.False(t, strings.HasPrefix(key, "payment_setting.compliance_"))
					}
				})
			}
		})
	}
}
