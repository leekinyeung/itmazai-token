package middleware

import (
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTokenAutoGroupsContext() *gin.Context {
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	return ctx
}

func TestSetupContextForTokenIgnoresHistoricalRoutingFields(t *testing.T) {
	ctx := newTokenAutoGroupsContext()
	common.SetContextKey(ctx, constant.ContextKeyUserGroup, "default")
	token := &model.Token{Id: 1, UserId: 2, Group: "vip", AutoGroups: `["vip","default"]`, CrossGroupRetry: true}

	require.NoError(t, SetupContextForToken(ctx, token))
	_, ok := common.GetContextKey(ctx, constant.ContextKeyTokenAutoGroups)
	assert.False(t, ok)
	_, ok = common.GetContextKey(ctx, constant.ContextKeyTokenCrossGroupRetry)
	assert.False(t, ok)
	assert.Equal(t, "default", common.GetContextKeyString(ctx, constant.ContextKeyTokenGroup))
}
