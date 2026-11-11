package model

import (
	"errors"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var ErrFallbackRevisionConflict = errors.New("fallback configuration revision conflict")

// FallbackConfigVersion is an immutable configuration document. The active
// revision provides optimistic concurrency without overwriting prior values.
type FallbackConfigVersion struct {
	Revision      int64  `json:"revision" gorm:"primaryKey;autoIncrement:false"`
	SchemaVersion int    `json:"schema_version"`
	Document      string `json:"document" gorm:"type:text"`
	CreatedAt     int64  `json:"created_at" gorm:"bigint;index"`
	CreatedBy     int    `json:"created_by" gorm:"index"`
}

type FallbackConfigState struct {
	ID             int   `json:"id" gorm:"primaryKey;autoIncrement:false"`
	ActiveRevision int64 `json:"active_revision" gorm:"bigint"`
	UpdatedAt      int64 `json:"updated_at" gorm:"bigint"`
}

func GetFallbackConfigState(tx *gorm.DB, forUpdate bool) (FallbackConfigState, error) {
	if tx == nil {
		tx = DB
	}
	query := tx
	if forUpdate {
		query = lockForUpdate(query)
	}
	var state FallbackConfigState
	err := query.First(&state, "id = ?", 1).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return FallbackConfigState{ID: 1}, nil
	}
	return state, err
}

func GetFallbackConfigVersion(revision int64) (*FallbackConfigVersion, error) {
	if revision <= 0 {
		return nil, gorm.ErrRecordNotFound
	}
	var version FallbackConfigVersion
	if err := DB.First(&version, "revision = ?", revision).Error; err != nil {
		return nil, err
	}
	return &version, nil
}

func SaveFallbackConfigVersion(baseRevision int64, schemaVersion int, document string, actorID int) (*FallbackConfigVersion, error) {
	var saved FallbackConfigVersion
	err := DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&FallbackConfigState{ID: 1}).Error; err != nil {
			return err
		}
		state, err := GetFallbackConfigState(tx, true)
		if err != nil {
			return err
		}
		if state.ActiveRevision != baseRevision {
			return ErrFallbackRevisionConflict
		}
		nextRevision := state.ActiveRevision + 1
		if nextRevision <= 0 {
			return errors.New("fallback configuration revision overflow")
		}
		saved = FallbackConfigVersion{
			Revision: nextRevision, SchemaVersion: schemaVersion, Document: document,
			CreatedAt: common.GetTimestamp(), CreatedBy: actorID,
		}
		result := tx.Model(&FallbackConfigState{}).
			Where("id = ? AND active_revision = ?", 1, baseRevision).
			Updates(map[string]any{
				"active_revision": nextRevision,
				"updated_at":      common.GetTimestamp(),
			})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return ErrFallbackRevisionConflict
		}
		return tx.Create(&saved).Error
	})
	if err != nil {
		return nil, err
	}
	return &saved, nil
}
