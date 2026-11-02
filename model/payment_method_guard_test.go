package model

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

func insertUserForPaymentGuardTest(t *testing.T, id int, quota int) *User {
	t.Helper()
	user := &User{
		Id:       id,
		Username: "payment_guard_user",
		Status:   common.UserStatusEnabled,
		Quota:    quota,
	}
	require.NoError(t, DB.Create(user).Error)
	return user
}

func insertSubscriptionPlanForPaymentGuardTest(t *testing.T, id int) *SubscriptionPlan {
	t.Helper()
	plan := &SubscriptionPlan{
		Id:            id,
		Title:         "Guard Plan",
		PriceAmount:   9.99,
		Currency:      "USD",
		DurationUnit:  SubscriptionDurationMonth,
		DurationValue: 1,
		Enabled:       true,
		TotalAmount:   1000,
	}
	require.NoError(t, DB.Create(plan).Error)
	return plan
}

func insertSubscriptionOrderForPaymentGuardTest(t *testing.T, tradeNo string, userID int, planID int, paymentProvider string) {
	t.Helper()
	order := &SubscriptionOrder{
		UserId:          userID,
		PlanId:          planID,
		Money:           9.99,
		TradeNo:         tradeNo,
		PaymentMethod:   paymentProvider,
		PaymentProvider: paymentProvider,
		Status:          common.TopUpStatusPending,
		CreateTime:      time.Now().Unix(),
	}
	require.NoError(t, order.Insert())
}

func insertTopUpForPaymentGuardTest(t *testing.T, tradeNo string, userID int, paymentProvider string) {
	t.Helper()
	topUp := &TopUp{
		UserId:          userID,
		Amount:          2,
		Money:           9.99,
		TradeNo:         tradeNo,
		PaymentMethod:   paymentProvider,
		PaymentProvider: paymentProvider,
		Status:          common.TopUpStatusPending,
		CreateTime:      time.Now().Unix(),
	}
	require.NoError(t, topUp.Insert())
}

func getTopUpStatusForPaymentGuardTest(t *testing.T, tradeNo string) string {
	t.Helper()
	topUp := GetTopUpByTradeNo(tradeNo)
	require.NotNil(t, topUp)
	return topUp.Status
}

func countUserSubscriptionsForPaymentGuardTest(t *testing.T, userID int) int64 {
	t.Helper()
	var count int64
	require.NoError(t, DB.Model(&UserSubscription{}).Where("user_id = ?", userID).Count(&count).Error)
	return count
}

func getUserQuotaForPaymentGuardTest(t *testing.T, userID int) int {
	t.Helper()
	var user User
	require.NoError(t, DB.Select("quota").Where("id = ?", userID).First(&user).Error)
	return user.Quota
}

func TestRechargeWaffoPancake_RejectsMismatchedPaymentMethod(t *testing.T) {
	truncateTables(t)

	insertUserForPaymentGuardTest(t, 101, 0)
	insertTopUpForPaymentGuardTest(t, "waffo-pancake-guard", 101, PaymentProviderStripe)

	err := RechargeWaffoPancake("waffo-pancake-guard")
	require.Error(t, err)

	topUp := GetTopUpByTradeNo("waffo-pancake-guard")
	require.NotNil(t, topUp)
	assert.Equal(t, common.TopUpStatusPending, topUp.Status)
	assert.Equal(t, 0, getUserQuotaForPaymentGuardTest(t, 101))
}

func TestUpdatePendingTopUpStatus_RejectsMismatchedPaymentProvider(t *testing.T) {
	testCases := []struct {
		name                    string
		tradeNo                 string
		storedPaymentProvider   string
		expectedPaymentProvider string
		targetStatus            string
	}{
		{
			name:                    "stripe expire",
			tradeNo:                 "stripe-expire-guard",
			storedPaymentProvider:   PaymentProviderCreem,
			expectedPaymentProvider: PaymentProviderStripe,
			targetStatus:            common.TopUpStatusExpired,
		},
		{
			name:                    "waffo failed",
			tradeNo:                 "waffo-failed-guard",
			storedPaymentProvider:   PaymentProviderStripe,
			expectedPaymentProvider: PaymentProviderWaffo,
			targetStatus:            common.TopUpStatusFailed,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			truncateTables(t)
			insertUserForPaymentGuardTest(t, 150, 0)
			insertTopUpForPaymentGuardTest(t, tc.tradeNo, 150, tc.storedPaymentProvider)

			err := UpdatePendingTopUpStatus(tc.tradeNo, tc.expectedPaymentProvider, tc.targetStatus)
			require.ErrorIs(t, err, ErrPaymentMethodMismatch)
			assert.Equal(t, common.TopUpStatusPending, getTopUpStatusForPaymentGuardTest(t, tc.tradeNo))
		})
	}
}

func TestCompleteSubscriptionOrder_RejectsMismatchedPaymentProvider(t *testing.T) {
	truncateTables(t)

	insertUserForPaymentGuardTest(t, 202, 0)
	plan := insertSubscriptionPlanForPaymentGuardTest(t, 301)
	insertSubscriptionOrderForPaymentGuardTest(t, "sub-guard-order", 202, plan.Id, PaymentProviderStripe)

	err := CompleteSubscriptionOrder("sub-guard-order", `{"provider":"epay"}`, PaymentProviderEpay, "alipay")
	require.ErrorIs(t, err, ErrPaymentMethodMismatch)

	order := GetSubscriptionOrderByTradeNo("sub-guard-order")
	require.NotNil(t, order)
	assert.Equal(t, common.TopUpStatusPending, order.Status)
	assert.Zero(t, countUserSubscriptionsForPaymentGuardTest(t, 202))

	topUp := GetTopUpByTradeNo("sub-guard-order")
	assert.Nil(t, topUp)
}

func TestExpireSubscriptionOrder_RejectsMismatchedPaymentProvider(t *testing.T) {
	truncateTables(t)

	insertUserForPaymentGuardTest(t, 303, 0)
	plan := insertSubscriptionPlanForPaymentGuardTest(t, 401)
	insertSubscriptionOrderForPaymentGuardTest(t, "sub-expire-guard", 303, plan.Id, PaymentProviderStripe)

	err := ExpireSubscriptionOrder("sub-expire-guard", PaymentProviderCreem)
	require.ErrorIs(t, err, ErrPaymentMethodMismatch)

	order := GetSubscriptionOrderByTradeNo("sub-expire-guard")
	require.NotNil(t, order)
	assert.Equal(t, common.TopUpStatusPending, order.Status)
}

func createEpayTestOrder(t *testing.T, userId int, tradeNo string, provider string, status string) TopUp {
	t.Helper()
	topUp := TopUp{
		UserId:          userId,
		Amount:          2,
		Money:           10.0,
		TradeNo:         tradeNo,
		PaymentMethod:   "alipay",
		PaymentProvider: provider,
		CreateTime:      common.GetTimestamp(),
		Status:          status,
	}
	require.NoError(t, DB.Create(&topUp).Error)
	return topUp
}

func TestRechargeEpayCreditsQuotaExactlyOnce(t *testing.T) {
	truncateTables(t)

	oldQuotaPerUnit := common.QuotaPerUnit
	common.QuotaPerUnit = 500000
	t.Cleanup(func() { common.QuotaPerUnit = oldQuotaPerUnit })

	user := insertUserForPaymentGuardTest(t, 501, 0)
	order := createEpayTestOrder(t, user.Id, "EPAYTESTONCE", PaymentProviderEpay, common.TopUpStatusPending)

	alreadyDone, err := RechargeEpay(order.TradeNo, "alipay", "127.0.0.1")
	require.NoError(t, err)
	assert.False(t, alreadyDone)
	assert.Equal(t, 2*500000, getUserQuotaForPaymentGuardTest(t, user.Id))

	reloaded := GetTopUpByTradeNo(order.TradeNo)
	require.NotNil(t, reloaded)
	assert.Equal(t, common.TopUpStatusSuccess, reloaded.Status)
	assert.NotZero(t, reloaded.CompleteTime)

	alreadyDone, err = RechargeEpay(order.TradeNo, "alipay", "127.0.0.1")
	require.NoError(t, err)
	assert.True(t, alreadyDone)
	assert.Equal(t, 2*500000, getUserQuotaForPaymentGuardTest(t, user.Id))
}

func TestRechargeEpayKeepsRedisAndDatabaseCreditInSync(t *testing.T) {
	truncateTables(t)
	useUserCacheMiniRedis(t)

	oldQuotaPerUnit := common.QuotaPerUnit
	common.QuotaPerUnit = 5
	t.Cleanup(func() { common.QuotaPerUnit = oldQuotaPerUnit })

	user := insertUserForPaymentGuardTest(t, 502, 7)
	require.NoError(t, populateUserCache(*user))
	order := createEpayTestOrder(t, user.Id, "EPAYTESTREDISSYNC", PaymentProviderEpay, common.TopUpStatusPending)

	alreadyDone, err := RechargeEpay(order.TradeNo, "alipay", "127.0.0.1")
	require.NoError(t, err)
	assert.False(t, alreadyDone)
	assert.Equal(t, 17, getUserQuotaForPaymentGuardTest(t, user.Id))
	cached, err := cacheGetUserBase(user.Id)
	require.NoError(t, err)
	assert.Equal(t, 17, cached.Quota)

	alreadyDone, err = RechargeEpay(order.TradeNo, "alipay", "127.0.0.1")
	require.NoError(t, err)
	assert.True(t, alreadyDone)
	cached, err = cacheGetUserBase(user.Id)
	require.NoError(t, err)
	assert.Equal(t, 17, cached.Quota)
}

func TestRechargeEpayUpdatesPaymentMethodToActual(t *testing.T) {
	truncateTables(t)

	oldQuotaPerUnit := common.QuotaPerUnit
	common.QuotaPerUnit = 500000
	t.Cleanup(func() { common.QuotaPerUnit = oldQuotaPerUnit })

	user := insertUserForPaymentGuardTest(t, 503, 0)
	order := createEpayTestOrder(t, user.Id, "EPAYTESTMETHOD", PaymentProviderEpay, common.TopUpStatusPending)

	alreadyDone, err := RechargeEpay(order.TradeNo, "wxpay", "127.0.0.1")
	require.NoError(t, err)
	assert.False(t, alreadyDone)

	reloaded := GetTopUpByTradeNo(order.TradeNo)
	require.NotNil(t, reloaded)
	assert.Equal(t, "wxpay", reloaded.PaymentMethod)
	assert.Equal(t, 2*500000, getUserQuotaForPaymentGuardTest(t, user.Id))
}

func TestRechargeEpayRejectsForeignAndNonPendingOrders(t *testing.T) {
	truncateTables(t)

	oldQuotaPerUnit := common.QuotaPerUnit
	common.QuotaPerUnit = 500000
	t.Cleanup(func() { common.QuotaPerUnit = oldQuotaPerUnit })

	user := insertUserForPaymentGuardTest(t, 504, 7)

	t.Run("order from another payment provider", func(t *testing.T) {
		order := createEpayTestOrder(t, user.Id, "EPAYTESTSTRIPE", PaymentProviderStripe, common.TopUpStatusPending)
		_, err := RechargeEpay(order.TradeNo, "alipay", "127.0.0.1")
		assert.ErrorIs(t, err, ErrPaymentMethodMismatch)
		assert.Equal(t, 7, getUserQuotaForPaymentGuardTest(t, user.Id))
	})

	t.Run("order that is not pending", func(t *testing.T) {
		order := createEpayTestOrder(t, user.Id, "EPAYTESTEXPIRED", PaymentProviderEpay, common.TopUpStatusExpired)
		_, err := RechargeEpay(order.TradeNo, "alipay", "127.0.0.1")
		assert.ErrorIs(t, err, ErrTopUpStatusInvalid)
		assert.Equal(t, 7, getUserQuotaForPaymentGuardTest(t, user.Id))
	})

	t.Run("missing order", func(t *testing.T) {
		_, err := RechargeEpay("EPAYTESTMISSING", "alipay", "127.0.0.1")
		assert.ErrorIs(t, err, ErrTopUpNotFound)
	})
}

func TestRechargeEpayRejectsQuotaOverflowBeforeCompletingOrder(t *testing.T) {
	truncateTables(t)

	oldQuotaPerUnit := common.QuotaPerUnit
	common.QuotaPerUnit = float64(common.MaxWalletQuota + 1)
	t.Cleanup(func() { common.QuotaPerUnit = oldQuotaPerUnit })

	user := insertUserForPaymentGuardTest(t, 505, 3)
	order := createEpayTestOrder(t, user.Id, "EPAYTESTOVERFLOW", PaymentProviderEpay, common.TopUpStatusPending)

	_, err := RechargeEpay(order.TradeNo, "alipay", "127.0.0.1")
	require.Error(t, err)
	assert.Equal(t, 3, getUserQuotaForPaymentGuardTest(t, user.Id))
	assert.Equal(t, common.TopUpStatusPending, getTopUpStatusForPaymentGuardTest(t, order.TradeNo))
}

func TestRechargeEpayEnforcesFinalWalletQuotaLimit(t *testing.T) {
	oldQuotaPerUnit := common.QuotaPerUnit
	common.QuotaPerUnit = 500000
	t.Cleanup(func() { common.QuotaPerUnit = oldQuotaPerUnit })

	testCases := []struct {
		name         string
		currentQuota int
		wantErr      bool
		wantQuota    int
		wantStatus   string
	}{
		{
			name:         "allows exact highest representable wallet balance",
			currentQuota: common.MaxWalletQuota - 1_000_000,
			wantQuota:    common.MaxWalletQuota,
			wantStatus:   common.TopUpStatusSuccess,
		},
		{
			name:         "rejects balance above wallet quota domain",
			currentQuota: common.MaxWalletQuota - 999_999,
			wantErr:      true,
			wantQuota:    common.MaxWalletQuota - 999_999,
			wantStatus:   common.TopUpStatusPending,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			truncateTables(t)
			user := insertUserForPaymentGuardTest(t, 506, tc.currentQuota)
			order := createEpayTestOrder(t, user.Id, "EPAYTESTWALLETLIMIT", PaymentProviderEpay, common.TopUpStatusPending)

			_, err := RechargeEpay(order.TradeNo, "alipay", "127.0.0.1")
			if tc.wantErr {
				require.ErrorIs(t, err, ErrTopUpQuotaLimitExceeded)
			} else {
				require.NoError(t, err)
			}
			assert.Equal(t, tc.wantQuota, getUserQuotaForPaymentGuardTest(t, user.Id))
			assert.Equal(t, tc.wantStatus, getTopUpStatusForPaymentGuardTest(t, order.TradeNo))
		})
	}
}

func setFirstTopUpRewardForTest(t *testing.T, value string) {
	t.Helper()
	common.OptionMapRWMutex.Lock()
	if common.OptionMap == nil {
		common.OptionMap = make(map[string]string)
	}
	previous, exists := common.OptionMap[InviterFirstTopUpRewardUSDOptionKey]
	common.OptionMap[InviterFirstTopUpRewardUSDOptionKey] = value
	common.OptionMapRWMutex.Unlock()
	t.Cleanup(func() {
		common.OptionMapRWMutex.Lock()
		defer common.OptionMapRWMutex.Unlock()
		if exists {
			common.OptionMap[InviterFirstTopUpRewardUSDOptionKey] = previous
		} else {
			delete(common.OptionMap, InviterFirstTopUpRewardUSDOptionKey)
		}
	})
}

func createFirstTopUpRewardUsers(t *testing.T) {
	t.Helper()
	require.NoError(t, DB.Create(&[]User{
		{Id: 101, Username: "referral_inviter", AffCode: "referral_inviter", Quota: 7, Status: common.UserStatusEnabled},
		{Id: 102, Username: "referral_invitee", AffCode: "referral_invitee", InviterId: 101, Quota: 3, Status: common.UserStatusEnabled},
	}).Error)
}

func TestFirstTopUpInviterRewardDatabaseMatrix(t *testing.T) {
	for _, dialect := range []string{"sqlite", "mysql", "postgres"} {
		t.Run(dialect, func(t *testing.T) {
			var driver gorm.Dialector
			switch dialect {
			case "sqlite":
				driver = sqlite.Open(filepath.Join(t.TempDir(), "referral.db") + "?_pragma=busy_timeout(30000)&_pragma=journal_mode(WAL)&_txlock=immediate")
			case "mysql":
				dsn := os.Getenv("TEST_MYSQL_DSN")
				if dsn == "" {
					t.Skip("TEST_MYSQL_DSN is not configured")
				}
				driver = mysql.Open(dsn)
			case "postgres":
				dsn := os.Getenv("TEST_POSTGRES_DSN")
				if dsn == "" {
					t.Skip("TEST_POSTGRES_DSN is not configured")
				}
				driver = postgres.Open(dsn)
			}
			db, err := gorm.Open(driver, &gorm.Config{NamingStrategy: schema.NamingStrategy{TablePrefix: "referral_test_"}})
			require.NoError(t, err)
			sqlDB, err := db.DB()
			require.NoError(t, err)
			sqlDB.SetMaxOpenConns(8)
			previousDB, previousType, previousQuotaUnit := DB, common.MainDatabaseType(), common.QuotaPerUnit
			DB = db
			common.SetMainDatabaseType(common.DatabaseType(dialect))
			common.QuotaPerUnit = 500000
			t.Cleanup(func() {
				assert.NoError(t, db.Migrator().DropTable(&FirstTopUpReward{}, &TopUp{}, &User{}, &Option{}))
				DB = previousDB
				common.SetMainDatabaseType(previousType)
				common.QuotaPerUnit = previousQuotaUnit
				assert.NoError(t, sqlDB.Close())
			})
			versionSQL := "SELECT version()"
			if dialect == "sqlite" {
				versionSQL = "SELECT sqlite_version()"
			}
			var version string
			require.NoError(t, db.Raw(versionSQL).Scan(&version).Error)
			t.Logf("database version: %s", version)
			setFirstTopUpRewardForTest(t, "2.5")

			for _, upgrade := range []bool{false, true} {
				t.Run(fmt.Sprintf("migration/upgrade=%v", upgrade), func(t *testing.T) {
					require.NoError(t, db.Migrator().DropTable(&FirstTopUpReward{}, &TopUp{}, &User{}, &Option{}))
					// User and TopUp are unchanged by this feature: this represents
					// the existing schema before the new rewards table is introduced.
					require.NoError(t, db.AutoMigrate(&User{}, &TopUp{}, &Option{}))
					if upgrade {
						createFirstTopUpRewardUsers(t)
						createEpayTestOrder(t, 102, "legacy-success", PaymentProviderEpay, common.TopUpStatusSuccess)
					}
					for range 2 {
						require.NoError(t, db.AutoMigrate(&FirstTopUpReward{}))
					}
					if upgrade {
						assert.Equal(t, 3, getUserQuotaForPaymentGuardTest(t, 102))
						assert.Equal(t, common.TopUpStatusSuccess, getTopUpStatusForPaymentGuardTest(t, "legacy-success"))
						assert.Error(t, db.Create(&TopUp{TradeNo: "legacy-success"}).Error, "order numbers remain unique")
						createEpayTestOrder(t, 102, "after-upgrade", PaymentProviderEpay, common.TopUpStatusPending)
						_, err := RechargeEpay("after-upgrade", "alipay", "")
						require.NoError(t, err)
						assert.Equal(t, 7, getUserQuotaForPaymentGuardTest(t, 101), "existing users cannot claim on a later top-up")
						assert.Error(t, db.Create(&FirstTopUpReward{UserId: 102}).Error, "claims remain unique per invitee")
					}
				})
			}

			providers := []struct {
				name     string
				provider string
				complete func(string) error
			}{
				{"epay", PaymentProviderEpay, func(tradeNo string) error { _, err := RechargeEpay(tradeNo, "alipay", ""); return err }},
				{"stripe", PaymentProviderStripe, func(tradeNo string) error { return Recharge(tradeNo, "customer", "") }},
				{"creem", PaymentProviderCreem, func(tradeNo string) error { return RechargeCreem(tradeNo, "customer@example.com", "", "") }},
				{"waffo", PaymentProviderWaffo, func(tradeNo string) error { return RechargeWaffo(tradeNo, "") }},
				{"waffo pancake", PaymentProviderWaffoPancake, RechargeWaffoPancake},
				{"manual completion", PaymentProviderEpay, func(tradeNo string) error { return ManualCompleteTopUp(tradeNo, "") }},
			}
			for _, provider := range providers {
				t.Run(provider.name+"/credits once", func(t *testing.T) {
					for _, table := range []any{&FirstTopUpReward{}, &TopUp{}, &User{}} {
						require.NoError(t, db.Unscoped().Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(table).Error)
					}
					createFirstTopUpRewardUsers(t)
					order := createEpayTestOrder(t, 102, "first-payment", provider.provider, common.TopUpStatusPending)
					require.NoError(t, provider.complete(order.TradeNo))
					assert.Equal(t, 1_250_007, getUserQuotaForPaymentGuardTest(t, 101))
					var reward FirstTopUpReward
					require.NoError(t, db.First(&reward, "user_id = ?", 102).Error)
					assert.Equal(t, FirstTopUpReward{UserId: 102, TopUpId: order.Id, InviterId: 101, Quota: 1_250_000}, reward)
					var inviter User
					require.NoError(t, db.First(&inviter, 101).Error)
					assert.Zero(t, inviter.AffQuota, "reward is immediately spendable without a transfer")
					quotaAfterFirst := getUserQuotaForPaymentGuardTest(t, 102)
					assert.Greater(t, quotaAfterFirst, 3)
					_ = provider.complete(order.TradeNo) // Some providers reject an already-completed order.
					assert.Equal(t, quotaAfterFirst, getUserQuotaForPaymentGuardTest(t, 102))
					createEpayTestOrder(t, 102, "second-payment", provider.provider, common.TopUpStatusPending)
					require.NoError(t, provider.complete("second-payment"))
					assert.Greater(t, getUserQuotaForPaymentGuardTest(t, 102), quotaAfterFirst)
					assert.Equal(t, 1_250_007, getUserQuotaForPaymentGuardTest(t, 101))
				})
			}

			for _, scenario := range []string{"disabled", "no inviter", "self invitation", "deleted inviter", "failed earlier order", "subscription earlier order", "wallet limit"} {
				t.Run(scenario, func(t *testing.T) {
					for _, table := range []any{&FirstTopUpReward{}, &TopUp{}, &User{}} {
						require.NoError(t, db.Unscoped().Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(table).Error)
					}
					createFirstTopUpRewardUsers(t)
					wantInviterQuota := 7
					switch scenario {
					case "disabled":
						setFirstTopUpRewardForTest(t, "0")
					case "no inviter":
						require.NoError(t, db.Model(&User{}).Where("id = ?", 102).Update("inviter_id", 0).Error)
					case "self invitation":
						require.NoError(t, db.Model(&User{}).Where("id = ?", 102).Update("inviter_id", 102).Error)
					case "deleted inviter":
						require.NoError(t, db.Delete(&User{}, 101).Error)
					case "failed earlier order":
						createEpayTestOrder(t, 102, "earlier", PaymentProviderEpay, common.TopUpStatusFailed)
						wantInviterQuota += 1_250_000
					case "subscription earlier order":
						require.NoError(t, db.Create(&TopUp{UserId: 102, TradeNo: "subscription", Amount: 0, Status: common.TopUpStatusSuccess}).Error)
						wantInviterQuota += 1_250_000
					case "wallet limit":
						require.NoError(t, db.Model(&User{}).Where("id = ?", 101).Update("quota", common.MaxWalletQuota).Error)
					}
					createEpayTestOrder(t, 102, "first-payment", PaymentProviderEpay, common.TopUpStatusPending)
					_, err := RechargeEpay("first-payment", "alipay", "")
					if scenario == "wallet limit" {
						require.ErrorIs(t, err, ErrTopUpQuotaLimitExceeded)
						assert.Equal(t, common.TopUpStatusPending, getTopUpStatusForPaymentGuardTest(t, "first-payment"))
						assert.Equal(t, 3, getUserQuotaForPaymentGuardTest(t, 102))
						var count int64
						require.NoError(t, db.Model(&FirstTopUpReward{}).Count(&count).Error)
						assert.Zero(t, count)
						// A retry after capacity is available must deliver both credits.
						require.NoError(t, db.Model(&User{}).Where("id = ?", 101).Update("quota", 7).Error)
						_, err = RechargeEpay("first-payment", "alipay", "")
						require.NoError(t, err)
						wantInviterQuota += 1_250_000
					} else {
						require.NoError(t, err)
					}
					assert.Equal(t, 1_000_003, getUserQuotaForPaymentGuardTest(t, 102))
					if scenario != "deleted inviter" {
						assert.Equal(t, wantInviterQuota, getUserQuotaForPaymentGuardTest(t, 101))
					}
					if scenario == "disabled" {
						setFirstTopUpRewardForTest(t, "2.5")
						createEpayTestOrder(t, 102, "later-payment", PaymentProviderEpay, common.TopUpStatusPending)
						_, err := RechargeEpay("later-payment", "alipay", "")
						require.NoError(t, err)
						assert.Equal(t, 7, getUserQuotaForPaymentGuardTest(t, 101))
					}
				})
			}

			t.Run("concurrent different orders and duplicate callbacks", func(t *testing.T) {
				for _, table := range []any{&FirstTopUpReward{}, &TopUp{}, &User{}} {
					require.NoError(t, db.Unscoped().Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(table).Error)
				}
				createFirstTopUpRewardUsers(t)
				for _, tradeNo := range []string{"concurrent-a", "concurrent-b"} {
					createEpayTestOrder(t, 102, tradeNo, PaymentProviderEpay, common.TopUpStatusPending)
				}
				start := make(chan struct{})
				errors := make(chan error, 4)
				var group sync.WaitGroup
				for _, tradeNo := range []string{"concurrent-a", "concurrent-b", "concurrent-a", "concurrent-b"} {
					group.Go(func() {
						<-start
						_, err := RechargeEpay(tradeNo, "alipay", "")
						errors <- err
					})
				}
				close(start)
				group.Wait()
				close(errors)
				for err := range errors {
					require.NoError(t, err)
				}
				assert.Equal(t, 2_000_003, getUserQuotaForPaymentGuardTest(t, 102))
				assert.Equal(t, 1_250_007, getUserQuotaForPaymentGuardTest(t, 101))
			})
		})
	}
}

func TestFirstTopUpInviterRewardConfigurationAndCache(t *testing.T) {
	truncateTables(t)
	require.NoError(t, DB.AutoMigrate(&Option{}))
	setFirstTopUpRewardForTest(t, "0")
	for _, value := range []string{"-1", "NaN", "Inf", "invalid", "1e100", "0.00000001"} {
		require.Error(t, UpdateOption(InviterFirstTopUpRewardUSDOptionKey, value), value)
	}
	require.NoError(t, UpdateOption(InviterFirstTopUpRewardUSDOptionKey, "2.5"))
	var option Option
	require.NoError(t, DB.First(&option, "key = ?", InviterFirstTopUpRewardUSDOptionKey).Error)
	assert.Equal(t, "2.5", option.Value)
	t.Cleanup(func() { DB.Delete(&Option{}, "key = ?", InviterFirstTopUpRewardUSDOptionKey) })

	createFirstTopUpRewardUsers(t)
	useUserCacheMiniRedis(t)
	var inviter User
	require.NoError(t, DB.First(&inviter, 101).Error)
	require.NoError(t, populateUserCache(inviter))
	createEpayTestOrder(t, 102, "first-payment-cache", PaymentProviderEpay, common.TopUpStatusPending)
	_, err := RechargeEpay("first-payment-cache", "alipay", "")
	require.NoError(t, err)
	cached, err := cacheGetUserBase(101)
	require.NoError(t, err)
	assert.Equal(t, 1_250_007, cached.Quota)
	_, err = RechargeEpay("first-payment-cache", "alipay", "")
	require.NoError(t, err)
	cached, err = cacheGetUserBase(101)
	require.NoError(t, err)
	assert.Equal(t, 1_250_007, cached.Quota)
}
