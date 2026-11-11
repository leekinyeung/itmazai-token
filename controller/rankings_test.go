package controller

import (
	"fmt"
	"math"
	"net/http"
	"net/http/httptest"
	"os"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func rankingsControllerFixture(t *testing.T, kind, dsn string) *gin.Engine {
	t.Helper()
	db := modelManagementDB(t, kind, dsn)
	require.NoError(t, i18n.Init())
	require.NoError(t, db.AutoMigrate(&model.UserSession{}, &model.QuotaData{}, &model.UserAccessToken{}))
	previousGroups := setting.UserUsableGroups2JSONString()
	require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(`{"default":"Default"}`))
	model.InvalidatePricingCache()
	t.Cleanup(func() {
		require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(previousGroups))
		model.InvalidatePricingCache()
	})
	require.NoError(t, db.Create(&model.Channel{Id: 1, Name: "catalog", Type: 1, Status: 1}).Error)
	require.NoError(t, db.Create(&model.Vendor{Id: 1, Name: "Listed vendor", Icon: "OpenAI", Status: 1}).Error)
	require.NoError(t, db.Create(&[]model.Model{
		{ModelName: "catalog-model", VendorID: 1, Status: 1},
		{ModelName: "delisted-model", Status: 2},
	}).Error)
	require.NoError(t, db.Create(&[]model.Ability{
		{ChannelId: 1, Model: "catalog-model", Group: "default", Enabled: true},
		{ChannelId: 1, Model: "private-model", Group: "private", Enabled: true},
		{ChannelId: 1, Model: "delisted-model", Group: "default", Enabled: true},
		{ChannelId: 1, Model: "disabled-model", Group: "default", Enabled: false},
	}).Error)
	require.NoError(t, db.Create(&model.QuotaData{ModelName: "catalog-model", TokenUsed: 12345, CreatedAt: time.Now().Add(-time.Hour).Unix()}).Error)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/api/rankings", middleware.DisableCache(), middleware.HeaderNavModuleAuth("rankings"), GetRankings)
	return router
}

func rankingsRequest(t *testing.T, router http.Handler, period, token string, wantStatus int) service.RankingsResponse {
	t.Helper()
	request := httptest.NewRequest(http.MethodGet, "/api/rankings?period="+period+"&role=100&real=true&group=private", nil)
	request.Header.Set("X-Role", "100")
	if token != "" {
		request.Header.Set("Authorization", "Bearer "+token)
	}
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	require.Equal(t, wantStatus, response.Code, response.Body.String())
	assert.Contains(t, response.Header().Get("Cache-Control"), "no-store")
	var payload struct {
		Success bool                     `json:"success"`
		Data    service.RankingsResponse `json:"data"`
	}
	require.NoError(t, common.Unmarshal(response.Body.Bytes(), &payload))
	assert.Equal(t, wantStatus == http.StatusOK, payload.Success)
	return payload.Data
}

func TestRankingsUsesAuthenticatedRoleAndSession(t *testing.T) {
	router := rankingsControllerFixture(t, "sqlite", "")
	for _, tc := range []struct {
		name  string
		role  int
		state string
	}{
		{name: "guest"},
		{name: "ordinary", role: common.RoleCommonUser},
		{name: "administrator", role: common.RoleAdminUser},
		{name: "root", role: common.RoleRootUser},
		{name: "tampered", role: common.RoleAdminUser, state: "tampered"},
		{name: "revoked", role: common.RoleAdminUser, state: "revoked"},
		{name: "expired", role: common.RoleAdminUser, state: "expired"},
		{name: "disabled", role: common.RoleAdminUser, state: "disabled"},
		{name: "demoted", role: common.RoleAdminUser, state: "demoted"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			token := ""
			wantStatus := http.StatusOK
			if tc.role > 0 {
				user := &model.User{Username: tc.name, AffCode: tc.name, Password: "unused", Role: tc.role, Status: common.UserStatusEnabled, Group: "default", AuthVersion: 1}
				require.NoError(t, model.DB.Create(user).Error)
				bundle, err := service.CreateLoginSession(user.Id, "password", "127.0.0.1", "rankings-test")
				require.NoError(t, err)
				token = bundle.AccessToken
				switch tc.state {
				case "tampered":
					parts := strings.Split(token, ".")
					parts[2] = strings.Repeat("A", len(parts[2]))
					token = strings.Join(parts, ".")
				case "revoked":
					_, err := model.RevokeUserSession(user.Id, bundle.Session.SID, "test")
					require.NoError(t, err)
				case "expired":
					require.NoError(t, model.DB.Model(&model.UserSession{}).Where("sid = ?", bundle.Session.SID).Update("expires_at", time.Now().Unix()-1).Error)
				case "disabled":
					require.NoError(t, model.DB.Model(user).Update("status", common.UserStatusDisabled).Error)
				case "demoted":
					require.NoError(t, model.DB.Model(user).Update("role", common.RoleCommonUser).Error)
				}
				if tc.state != "" && tc.state != "demoted" {
					wantStatus = http.StatusUnauthorized
				}
			}
			data := rankingsRequest(t, router, "year", token, wantStatus)
			if wantStatus != http.StatusOK {
				assert.Empty(t, data.Models)
				return
			}
			require.Len(t, data.Models, 1)
			assert.Equal(t, "catalog-model", data.Models[0].ModelName)
			if tc.role >= common.RoleAdminUser && tc.state == "" {
				assert.EqualValues(t, 12345, data.Models[0].TotalTokens)
			} else {
				assert.Greater(t, data.Models[0].TotalTokens, int64(365_000_000_000))
			}
		})
	}
	var stored model.QuotaData
	require.NoError(t, model.DB.First(&stored).Error)
	assert.Equal(t, 12345, stored.TokenUsed)
	var count int64
	require.NoError(t, model.DB.Model(&model.QuotaData{}).Count(&count).Error)
	assert.EqualValues(t, 1, count)
}

func TestRankingsCatalogAndStatisticsDatabaseMatrix(t *testing.T) {
	for _, dialect := range []struct{ kind, env, period string }{
		{"sqlite", "", "today"}, {"mysql", "TEST_MYSQL_DSN", "week"}, {"postgres", "TEST_POSTGRES_DSN", "month"},
	} {
		t.Run(dialect.kind, func(t *testing.T) {
			if dialect.env != "" && os.Getenv(dialect.env) == "" {
				t.Skip("set " + dialect.env + " to run this database")
			}
			router := rankingsControllerFixture(t, dialect.kind, os.Getenv(dialect.env))
			user := &model.User{Username: "matrix-admin", AffCode: "matrix-admin", Password: "unused", Role: common.RoleAdminUser, Status: common.UserStatusEnabled, Group: "default", AuthVersion: 1}
			require.NoError(t, model.DB.Create(user).Error)
			bundle, err := service.CreateLoginSession(user.Id, "password", "127.0.0.1", "rankings-matrix")
			require.NoError(t, err)
			// Distinct periods exercise each database before its real snapshot is cached.
			actual := rankingsRequest(t, router, dialect.period, bundle.AccessToken, http.StatusOK)
			require.Len(t, actual.Models, 1)
			assert.EqualValues(t, 12345, actual.Models[0].TotalTokens)
			assert.Equal(t, "Listed vendor", actual.Models[0].Vendor)
			assert.EqualValues(t, 12345, actual.ModelsHistory.Models[0].Total)

			// Public generation must work even without the real statistics table.
			require.NoError(t, model.DB.Migrator().DropTable(&model.QuotaData{}))
			for _, period := range []string{"today", "week", "month", "year"} {
				data := rankingsRequest(t, router, period, "", http.StatusOK)
				require.Len(t, data.Models, 1)
				assert.Equal(t, "catalog-model", data.Models[0].ModelName)
				assert.Equal(t, "Listed vendor", data.Models[0].Vendor)
				assert.Equal(t, "OpenAI", data.Models[0].VendorIcon)
			}
			privateUser := &model.User{Username: "private-viewer", AffCode: "private-viewer", Password: "unused", Role: common.RoleCommonUser, Status: common.UserStatusEnabled, Group: "private", AuthVersion: 1}
			require.NoError(t, model.DB.Create(privateUser).Error)
			privateBundle, err := service.CreateLoginSession(privateUser.Id, "password", "127.0.0.1", "private-rankings")
			require.NoError(t, err)
			privateData := rankingsRequest(t, router, "today", privateBundle.AccessToken, http.StatusOK)
			assert.Len(t, privateData.Models, 2)
			require.NoError(t, model.DB.Model(&model.Model{}).Where("model_name = ?", "catalog-model").Update("status", 2).Error)
			model.InvalidatePricingCache()
			empty := rankingsRequest(t, router, "today", "", http.StatusOK)
			assert.Empty(t, empty.Models)
			assert.Empty(t, empty.Vendors)
			assert.Empty(t, empty.ModelsHistory.Points)
			assert.Empty(t, empty.VendorShareHistory.Points)
			rankingsRequest(t, router, "invalid", "", http.StatusBadRequest)
			common.OptionMap["HeaderNavModules"] = `{"rankings":{"enabled":true,"requireAuth":true}}`
			rankingsRequest(t, router, "today", "", http.StatusUnauthorized)
			common.OptionMap["HeaderNavModules"] = `{"rankings":false}`
			rankingsRequest(t, router, "today", bundle.AccessToken, http.StatusForbidden)
		})
	}
}

func TestSimulatedRankingsConsistentAcrossPeriods(t *testing.T) {
	now := time.Date(2026, 11, 11, 12, 35, 0, 0, time.UTC)
	catalog := []model.Pricing{}
	for i := range 6 {
		catalog = append(catalog, model.Pricing{ModelName: fmt.Sprintf("listed-%d", i), VendorID: i%2 + 1})
	}
	vendors := []model.PricingVendor{{ID: 1, Name: "Vendor A", Icon: "OpenAI"}, {ID: 2, Name: "Vendor B"}}
	for _, tc := range []struct {
		period string
		days   int64
	}{{"today", 1}, {"week", 7}, {"month", 30}, {"year", 365}} {
		t.Run(tc.period, func(t *testing.T) {
			data, err := service.SimulatedRankingsSnapshot(tc.period, catalog, vendors, now)
			require.NoError(t, err)
			repeated, err := service.SimulatedRankingsSnapshot(tc.period, catalog, vendors, now.Add(time.Minute))
			require.NoError(t, err)
			assert.Equal(t, data, repeated)
			reordered := slices.Clone(catalog)
			slices.Reverse(reordered)
			reordered = append(reordered, catalog[0])
			again, err := service.SimulatedRankingsSnapshot(tc.period, reordered, vendors, now)
			require.NoError(t, err)
			assert.Equal(t, data, again)
			previous, err := service.SimulatedRankingsSnapshot(tc.period, catalog, vendors, now.Add(-time.Duration(tc.days)*24*time.Hour))
			require.NoError(t, err)
			previousModels := map[string]service.RankedModel{}
			for _, row := range previous.Models {
				previousModels[row.ModelName] = row
			}
			var total, historyTotal, vendorTotal int64
			for i, row := range data.Models {
				assert.Equal(t, i+1, row.Rank)
				require.NotNil(t, row.PreviousRank)
				assert.Equal(t, previousModels[row.ModelName].Rank, *row.PreviousRank)
				expectedGrowth := float64(row.TotalTokens-previousModels[row.ModelName].TotalTokens) / float64(previousModels[row.ModelName].TotalTokens) * 100
				assert.InDelta(t, expectedGrowth, row.GrowthPct, 0.000051)
				total += row.TotalTokens
			}
			assert.InDelta(t, 2_000_000_000*tc.days, total, float64(1_000_000_000*tc.days))
			for _, point := range data.ModelsHistory.Points {
				historyTotal += point.Tokens
			}
			bucketShares := map[string]float64{}
			for _, point := range data.VendorShareHistory.Points {
				bucketShares[point.Ts] += point.Share
				vendorTotal += point.Tokens
			}
			assert.Equal(t, total, historyTotal)
			assert.Equal(t, total, vendorTotal)
			for _, share := range bucketShares {
				assert.InDelta(t, 1, share, 0.0001)
			}
			for _, mover := range append(slices.Clone(data.TopMovers), data.TopDroppers...) {
				assert.Equal(t, previousModels[mover.ModelName].Rank-mover.CurrentRank, mover.RankDelta)
			}
		})
	}
	week, err := service.SimulatedRankingsSnapshot("week", catalog, vendors, now)
	require.NoError(t, err)
	dailyTotals := map[string]int64{}
	for day := range 7 {
		data, err := service.SimulatedRankingsSnapshot("today", catalog, vendors, now.Add(-time.Duration(day)*24*time.Hour))
		require.NoError(t, err)
		for _, row := range data.Models {
			dailyTotals[row.ModelName] += row.TotalTokens
		}
	}
	for _, row := range week.Models {
		assert.Equal(t, row.TotalTokens, dailyTotals[row.ModelName])
	}
}

func TestSimulatedRankingsLimitsAndEmptyCatalog(t *testing.T) {
	now := time.Date(2026, 11, 11, 12, 35, 0, 0, time.UTC)
	catalog := []model.Pricing{}
	for i := range 25 {
		catalog = append(catalog, model.Pricing{ModelName: fmt.Sprintf("listed-%02d", i), OwnerBy: fmt.Sprintf("Vendor %d", i%7)})
	}
	data, err := service.SimulatedRankingsSnapshot("today", catalog, nil, now)
	require.NoError(t, err)
	assert.Len(t, data.Models, 20)
	assert.Len(t, data.ModelsHistory.Models, 11)
	assert.Len(t, data.VendorShareHistory.Vendors, 6)
	assert.NotEmpty(t, data.TopMovers)
	assert.NotEmpty(t, data.TopDroppers)
	var total, modelHistoryTotal, vendorHistoryTotal int64
	for _, vendor := range data.Vendors {
		total += vendor.TotalTokens
	}
	for _, point := range data.ModelsHistory.Points {
		modelHistoryTotal += point.Tokens
	}
	for _, point := range data.VendorShareHistory.Points {
		vendorHistoryTotal += point.Tokens
	}
	assert.Equal(t, total, modelHistoryTotal)
	assert.Equal(t, total, vendorHistoryTotal)
	assert.False(t, math.IsNaN(data.Models[0].Share))
	empty, err := service.SimulatedRankingsSnapshot("today", nil, nil, now)
	require.NoError(t, err)
	assert.Empty(t, empty.Models)
	assert.Empty(t, empty.TopMovers)
	assert.Empty(t, empty.TopDroppers)
	assert.Empty(t, empty.ModelsHistory.Points)
	_, err = service.SimulatedRankingsSnapshot("invalid", catalog, nil, now)
	assert.Error(t, err)
}
