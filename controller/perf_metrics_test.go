package controller

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/QuantumNous/new-api/model"
	perfmetrics "github.com/QuantumNous/new-api/pkg/perf_metrics"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/console_setting"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func performanceControllerFixture(t *testing.T) *gin.Engine {
	t.Helper()
	previousDB, previousLogDB := model.DB, model.LOG_DB
	initModelListColumnNames(t)
	model.DB, model.LOG_DB = previousDB, previousLogDB
	setupAccessTokenAudit(t)
	gin.SetMode(gin.TestMode)
	require.NoError(t, model.DB.AutoMigrate(&model.Channel{}, &model.Ability{}, &model.Model{}, &model.Vendor{}, &model.PerfMetric{}))
	previousGroups := setting.UserUsableGroups2JSONString()
	common.OptionMapRWMutex.Lock()
	previousOptions := common.OptionMap
	common.OptionMap = map[string]string{}
	common.OptionMapRWMutex.Unlock()
	require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(`{"default":"Default"}`))
	model.InvalidatePricingCache()
	t.Cleanup(func() {
		require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(previousGroups))
		model.InvalidatePricingCache()
		common.OptionMapRWMutex.Lock()
		common.OptionMap = previousOptions
		common.OptionMapRWMutex.Unlock()
	})
	require.NoError(t, model.DB.Create(&model.Channel{Id: 1, Name: "test", Type: 1, Status: 1}).Error)
	require.NoError(t, model.DB.Create(&[]model.Ability{
		{ChannelId: 1, Model: "idle-model", Group: "default", Enabled: true},
		{ChannelId: 1, Model: "private-model", Group: "private", Enabled: true},
	}).Error)
	router := gin.New()
	router.Use(middleware.DisableCache())
	router.GET("/api/perf-metrics", middleware.HeaderNavModulePublicOrUserAuth("pricing"), GetPerfMetrics)
	router.GET("/api/perf-metrics/summary", middleware.HeaderNavModulePublicOrUserAuth("pricing"), GetPerfMetricsSummary)
	router.GET("/api/uptime/status", middleware.TryUserAuth(), GetUptimeKumaStatus)
	return router
}

func TestPublicPerformanceIncludesIdleVisibleModels(t *testing.T) {
	router := performanceControllerFixture(t)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/perf-metrics?model=idle-model", nil))
	require.Equal(t, http.StatusOK, response.Code)
	var payload struct {
		Success bool                    `json:"success"`
		Data    perfmetrics.QueryResult `json:"data"`
	}
	require.NoError(t, common.Unmarshal(response.Body.Bytes(), &payload))
	require.True(t, payload.Success)
	require.NotNil(t, payload.Data.Summary)
	assert.Equal(t, 100.0, payload.Data.Summary.SuccessRate)
	assert.Len(t, payload.Data.Series, 24)
	require.Len(t, payload.Data.Groups, 1)
	assert.Equal(t, "default", payload.Data.Groups[0].Group)
}

func TestPerformanceResponsesUseAuthenticatedRole(t *testing.T) {
	for _, tc := range []struct {
		name       string
		role       int
		invalid    string
		wantStatus int
	}{
		{name: "guest", wantStatus: 200},
		{name: "ordinary", role: common.RoleCommonUser, wantStatus: 200},
		{name: "administrator", role: common.RoleAdminUser, wantStatus: 200},
		{name: "root", role: common.RoleRootUser, wantStatus: 200},
		{name: "tampered administrator", role: common.RoleAdminUser, invalid: "tampered", wantStatus: 401},
		{name: "revoked administrator", role: common.RoleAdminUser, invalid: "revoked", wantStatus: 401},
		{name: "expired administrator", role: common.RoleAdminUser, invalid: "expired", wantStatus: 401},
		{name: "disabled administrator", role: common.RoleAdminUser, invalid: "disabled", wantStatus: 401},
	} {
		t.Run(tc.name, func(t *testing.T) {
			router := performanceControllerFixture(t)
			hour := time.Now().Truncate(time.Hour).Unix()
			require.NoError(t, model.DB.Create(&model.PerfMetric{ModelName: "idle-model", Group: "default", BucketTs: hour, RequestCount: 1, TotalLatencyMs: 90000}).Error)
			token := ""
			if tc.role > 0 {
				user := &model.User{Username: "viewer", Password: "unused", Role: tc.role, Status: common.UserStatusEnabled, Group: "default", AuthVersion: 1}
				require.NoError(t, model.DB.Create(user).Error)
				bundle, err := service.CreateLoginSession(user.Id, "password", "127.0.0.1", "performance-test")
				require.NoError(t, err)
				token = bundle.AccessToken
				switch tc.invalid {
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
				}
			}
			for _, path := range []string{"/api/perf-metrics?model=idle-model&role=100&real=true", "/api/perf-metrics/summary?recent_model=idle-model&role=100&real=true"} {
				request := httptest.NewRequest(http.MethodGet, path, nil)
				request.Header.Set("X-Role", "100")
				if token != "" {
					request.Header.Set("Authorization", "Bearer "+token)
				}
				response := httptest.NewRecorder()
				router.ServeHTTP(response, request)
				require.Equal(t, tc.wantStatus, response.Code, response.Body.String())
				assert.Contains(t, response.Header().Get("Cache-Control"), "no-store")
				if tc.wantStatus != http.StatusOK {
					continue
				}
				var payload struct {
					Data struct {
						Summary *perfmetrics.Summary `json:"summary"`
					} `json:"data"`
				}
				require.NoError(t, common.Unmarshal(response.Body.Bytes(), &payload))
				require.NotNil(t, payload.Data.Summary)
				if tc.role >= common.RoleAdminUser {
					assert.Equal(t, 0.0, payload.Data.Summary.SuccessRate)
					assert.Equal(t, int64(90000), payload.Data.Summary.AvgLatencyMs)
				} else {
					assert.Equal(t, 100.0, payload.Data.Summary.SuccessRate)
					assert.LessOrEqual(t, payload.Data.Summary.AvgLatencyMs, int64(1200))
				}
			}
			response := accessTokenRequest(router, http.MethodGet, "/api/uptime/status", token, "", "")
			assert.Equal(t, tc.wantStatus, response.Code)
			assert.Contains(t, response.Header().Get("Cache-Control"), "no-store")
		})
	}
}

func TestPublicPerformanceDoesNotReadMetricsOrExposePrivateModels(t *testing.T) {
	router := performanceControllerFixture(t)
	require.NoError(t, model.DB.Migrator().DropTable(&model.PerfMetric{}))
	for _, path := range []string{
		"/api/perf-metrics?model=private-model", "/api/perf-metrics?model=missing-model", "/api/perf-metrics?model=idle-model&group=private",
	} {
		response := httptest.NewRecorder()
		router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, path, nil))
		require.Equal(t, http.StatusOK, response.Code)
		var payload struct {
			Data perfmetrics.QueryResult `json:"data"`
		}
		require.NoError(t, common.Unmarshal(response.Body.Bytes(), &payload))
		assert.Nil(t, payload.Data.Summary)
		assert.Empty(t, payload.Data.Groups)
	}
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/perf-metrics/summary?recent_model=private-model&recent_model=idle-model", nil))
	require.Equal(t, http.StatusOK, response.Code)
	var payload struct {
		Data perfmetrics.SummaryAllResult `json:"data"`
	}
	require.NoError(t, common.Unmarshal(response.Body.Bytes(), &payload))
	require.Len(t, payload.Data.Models, 1)
	assert.Equal(t, "idle-model", payload.Data.Models[0].ModelName)
	assert.Len(t, payload.Data.RecentSuccessSeries["idle-model"], 24)
	assert.NotContains(t, payload.Data.RecentSuccessSeries, "private-model")
	response = httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/perf-metrics/summary?"+strings.Repeat("recent_model=idle-model&", 51), nil))
	assert.Equal(t, http.StatusBadRequest, response.Code)
}

func TestUptimeUsesSyntheticPublicStatusAndRealAdminStatus(t *testing.T) {
	router := performanceControllerFixture(t)
	var calls atomic.Int64
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		w.Header().Set("Content-Type", "application/json")
		if strings.Contains(r.URL.Path, "/heartbeat/") {
			_, _ = w.Write([]byte(`{"heartbeatList":{"1":[{"status":0}]},"uptimeList":{"1_24":0.25}}`))
			return
		}
		_, _ = w.Write([]byte(`{"publicGroupList":[{"name":"Real group","monitorList":[{"id":1,"name":"Real monitor"}]}]}`))
	}))
	t.Cleanup(upstream.Close)
	config := console_setting.GetConsoleSetting()
	previous := config.UptimeKumaGroups
	t.Cleanup(func() { config.UptimeKumaGroups = previous })
	encoded, err := common.Marshal([]map[string]string{{"url": upstream.URL, "slug": "test", "categoryName": "API availability"}})
	require.NoError(t, err)
	config.UptimeKumaGroups = string(encoded)
	for _, tc := range []struct {
		role   int
		uptime float64
		name   string
	}{
		{0, 1, "API availability"}, {common.RoleCommonUser, 1, "API availability"}, {common.RoleAdminUser, 0.25, "Real monitor"}, {common.RoleRootUser, 0.25, "Real monitor"},
	} {
		response := httptest.NewRecorder()
		context, _ := gin.CreateTestContext(response)
		context.Set("role", tc.role)
		context.Request = httptest.NewRequest(http.MethodGet, "/api/uptime/status", nil)
		GetUptimeKumaStatus(context)
		var payload struct {
			Data []UptimeGroupResult `json:"data"`
		}
		require.NoError(t, common.Unmarshal(response.Body.Bytes(), &payload))
		require.Len(t, payload.Data, 1)
		require.Len(t, payload.Data[0].Monitors, 1)
		assert.Equal(t, tc.uptime, payload.Data[0].Monitors[0].Uptime)
		assert.Equal(t, tc.name, payload.Data[0].Monitors[0].Name)
		if tc.role < common.RoleAdminUser {
			assert.Zero(t, calls.Load())
		}
	}
	assert.Equal(t, int64(4), calls.Load())
	config.UptimeKumaGroups = ""
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/uptime/status", nil))
	assert.JSONEq(t, `{"success":true,"message":"","data":[]}`, response.Body.String())
}
