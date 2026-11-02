package model

import (
	"math"
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const InviterFirstTopUpRewardUSDOptionKey = "InviterFirstTopUpRewardUSD"

// FirstTopUpReward also records first top-ups when rewards are disabled or the
// user has no inviter. Enabling rewards later never rewards a subsequent top-up.
type FirstTopUpReward struct {
	UserId    int `gorm:"primaryKey;autoIncrement:false"`
	TopUpId   int
	InviterId int
	Quota     int `gorm:"type:bigint"`
}

func firstTopUpRewardQuota(value string) (int, error) {
	amount, err := strconv.ParseFloat(value, 64)
	if err != nil || math.IsNaN(amount) || math.IsInf(amount, 0) || amount < 0 {
		return 0, common.NewMessage("First top-up inviter reward must be a valid non-negative USD amount within the wallet limit")
	}
	if amount == 0 {
		return 0, nil
	}
	quota, err := common.WalletQuotaFromDecimalStrict(decimal.NewFromFloat(amount).Mul(decimal.NewFromFloat(common.QuotaPerUnit)))
	if err != nil || quota <= 0 {
		return 0, common.NewMessage("First top-up inviter reward must be a valid non-negative USD amount within the wallet limit")
	}
	return quota, nil
}

// creditTopUpWithInviterReward runs inside the payment transaction. Crediting
// the invitee locks its user row, serializing distinct orders for the same user;
// the primary key additionally makes the first-top-up claim unique across hosts.
func creditTopUpWithInviterReward(tx *gorm.DB, topUp *TopUp, quota int, updates map[string]any) (*FirstTopUpReward, error) {
	if err := creditTopUpQuota(tx, topUp.UserId, quota, updates); err != nil {
		return nil, err
	}
	if topUp.Amount <= 0 || topUp.PaymentProvider == PaymentProviderBalance {
		return nil, nil
	}

	reward := FirstTopUpReward{UserId: topUp.UserId, TopUpId: topUp.Id}
	if err := tx.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "user_id"}}, DoNothing: true,
	}).Create(&reward).Error; err != nil {
		return nil, err
	}
	// Read back the claim rather than relying on RowsAffected: MySQL's
	// clientFoundRows option changes the result for an ignored duplicate.
	if err := lockForUpdate(tx).First(&reward, "user_id = ?", topUp.UserId).Error; err != nil {
		return nil, err
	}
	if reward.TopUpId != topUp.Id {
		return nil, nil
	}

	// Existing installations have successful orders but no first-top-up claims.
	// Subscription purchases also appear in top_ups, with amount=0, and do not
	// count as wallet recharges.
	var previousCount int64
	if err := tx.Model(&TopUp{}).Where(
		"user_id = ? AND id <> ? AND status = ? AND amount > 0 AND (payment_provider IS NULL OR payment_provider <> ?)",
		topUp.UserId, topUp.Id, common.TopUpStatusSuccess, PaymentProviderBalance,
	).Count(&previousCount).Error; err != nil {
		return nil, err
	}
	if previousCount > 0 {
		return nil, nil
	}

	var invitee User
	if err := lockForUpdate(tx).Select("id", "inviter_id").First(&invitee, topUp.UserId).Error; err != nil {
		return nil, err
	}
	if invitee.InviterId <= 0 || invitee.InviterId == invitee.Id {
		return nil, nil
	}
	common.OptionMapRWMutex.RLock()
	value := common.OptionMap[InviterFirstTopUpRewardUSDOptionKey]
	common.OptionMapRWMutex.RUnlock()
	if value == "" {
		value = "0"
	}
	rewardQuota, err := firstTopUpRewardQuota(value)
	if err != nil {
		return nil, err
	}
	if rewardQuota == 0 {
		return nil, nil
	}
	var inviter User
	if err := lockForUpdate(tx).Select("id").Find(&inviter, invitee.InviterId).Error; err != nil {
		return nil, err
	}
	if inviter.Id == 0 {
		return nil, nil
	}
	if err := creditTopUpQuota(tx, inviter.Id, rewardQuota, nil); err != nil {
		return nil, err
	}
	reward.InviterId = inviter.Id
	reward.Quota = rewardQuota
	if err := tx.Save(&reward).Error; err != nil {
		return nil, err
	}
	return &reward, nil
}

// finishFirstTopUpReward updates cache and logs only after the payment commits.
func finishFirstTopUpReward(reward *FirstTopUpReward) {
	if reward == nil {
		return
	}
	syncCreditUserQuotaCache(reward.InviterId, reward.Quota, common.LogText("first top-up invitation reward"))
	RecordLog(reward.InviterId, LogTypeSystem, common.NewMessage("Invited user's first top-up reward {{quota}} (user ID: {{user_id}})", map[string]any{
		"quota": logger.FormatQuota(reward.Quota), "user_id": reward.UserId,
	}))
}
