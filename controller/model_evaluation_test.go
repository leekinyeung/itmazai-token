/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

package controller

import (
	"bufio"
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestModelEvaluationValidationAndOrigin(t *testing.T) {
	valid := modelEvaluationClientMessage{
		Type:         "start",
		Input:        "What is 2 + 2?",
		ActualOutput: "4",
		JudgeModel:   "judge-model",
	}
	require.NoError(t, validateModelEvaluationStart(valid))

	missing := valid
	missing.Input = " "
	assert.Error(t, validateModelEvaluationStart(missing))

	tooLarge := valid
	tooLarge.Input = strings.Repeat("a", modelEvaluationMaxInputBytes)
	assert.Error(t, validateModelEvaluationStart(tooLarge))

	tests := []struct {
		name           string
		host           string
		origin         string
		forwardedProto string
		want           bool
	}{
		{name: "same HTTP origin", host: "example.com", origin: "http://example.com", want: true},
		{name: "same HTTPS origin behind proxy", host: "example.com", origin: "https://example.com", forwardedProto: "https", want: true},
		{name: "different host", host: "example.com", origin: "https://attacker.example", forwardedProto: "https", want: false},
		{name: "multiple origins", host: "example.com", origin: "https://example.com, https://attacker.example", forwardedProto: "https", want: false},
		{name: "missing origin", host: "example.com", want: false},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodGet, "http://"+test.host+"/api/model-evaluation/ws", nil)
			if test.origin != "" {
				request.Header.Set("Origin", test.origin)
			}
			if test.forwardedProto != "" {
				request.Header.Set("X-Forwarded-Proto", test.forwardedProto)
			}
			assert.Equal(t, test.want, modelEvaluationSameOrigin(request))
		})
	}
}

func TestModelEvaluationAvailabilityProtocolAndConcurrency(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/api/model-evaluation/ws", ModelEvaluationWebSocket)

	t.Setenv("MODEL_EVALUATION_WORKER_PATH", t.TempDir()+"/missing-worker")
	request := httptest.NewRequest(http.MethodGet, "/api/model-evaluation/ws", nil)
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)
	assert.Equal(t, http.StatusServiceUnavailable, recorder.Code)

	nonExecutableWorker := t.TempDir() + "/worker"
	require.NoError(t, os.WriteFile(nonExecutableWorker, []byte("worker"), 0o600))
	t.Setenv("MODEL_EVALUATION_WORKER_PATH", nonExecutableWorker)
	request = httptest.NewRequest(http.MethodGet, "/api/model-evaluation/ws", nil)
	recorder = httptest.NewRecorder()
	router.ServeHTTP(recorder, request)
	assert.Equal(t, http.StatusServiceUnavailable, recorder.Code)

	executable, err := os.Executable()
	require.NoError(t, err)
	t.Setenv("MODEL_EVALUATION_WORKER_PATH", executable)
	request = httptest.NewRequest(http.MethodGet, "/api/model-evaluation/ws", nil)
	recorder = httptest.NewRecorder()
	router.ServeHTTP(recorder, request)
	assert.Equal(t, http.StatusBadRequest, recorder.Code)

	t.Setenv("MODEL_EVALUATION_MAX_CONCURRENT", "1")
	activeModelEvaluations.Store(1)
	t.Cleanup(func() { activeModelEvaluations.Store(0) })
	request = httptest.NewRequest(http.MethodGet, "/api/model-evaluation/ws", nil)
	request.Header.Set("Sec-WebSocket-Protocol", modelEvaluationSubprotocol)
	recorder = httptest.NewRecorder()
	router.ServeHTTP(recorder, request)
	assert.Equal(t, http.StatusTooManyRequests, recorder.Code)
	assert.Equal(t, "30", recorder.Header().Get("Retry-After"))
}

func TestModelEvaluationWebSocketBridge(t *testing.T) {
	gin.SetMode(gin.TestMode)
	executable, err := os.Executable()
	require.NoError(t, err)
	t.Setenv("MODEL_EVALUATION_WORKER_PATH", executable)
	t.Setenv("MODEL_EVALUATION_MAX_CONCURRENT", "1")
	t.Setenv("MODEL_EVALUATION_TIMEOUT_SECONDS", "5")
	activeModelEvaluations.Store(0)

	originalCommand := modelEvaluationCommand
	modelEvaluationCommand = func(ctx context.Context, _ string) *exec.Cmd {
		cmd := exec.CommandContext(ctx, executable, "-test.run=^TestModelEvaluationWorkerProcess$")
		cmd.Env = append(os.Environ(), "MODEL_EVALUATION_TEST_WORKER=1")
		return cmd
	}
	t.Cleanup(func() {
		modelEvaluationCommand = originalCommand
		activeModelEvaluations.Store(0)
	})

	router := gin.New()
	router.GET("/api/model-evaluation/ws", ModelEvaluationWebSocket)
	server := httptest.NewServer(router)
	t.Cleanup(server.Close)

	header := http.Header{"Origin": []string{server.URL}}
	dialer := websocket.Dialer{Subprotocols: []string{modelEvaluationSubprotocol}}
	client, response, err := dialer.Dial("ws"+strings.TrimPrefix(server.URL, "http")+"/api/model-evaluation/ws", header)
	require.NoError(t, err)
	t.Cleanup(func() { _ = client.Close() })
	require.Equal(t, http.StatusSwitchingProtocols, response.StatusCode)
	assert.Equal(t, modelEvaluationSubprotocol, client.Subprotocol())

	var event map[string]any
	require.NoError(t, client.ReadJSON(&event))
	assert.Equal(t, "ready", event["type"])

	require.NoError(t, client.WriteJSON(map[string]any{
		"type":         "start",
		"input":        "What is 2 + 2?",
		"actualOutput": "4",
		"judgeModel":   "judge-model",
		"apiKey":       "must-not-reach-worker",
		"baseUrl":      "https://must-not-reach-worker.example/v1",
	}))
	require.NoError(t, client.ReadJSON(&event))
	assert.Equal(t, "metric_started", event["type"])
	require.NoError(t, client.ReadJSON(&event))
	assert.Equal(t, "judge_request", event["type"])
	assert.Equal(t, "judge-1", event["requestId"])

	require.NoError(t, client.WriteJSON(map[string]any{
		"type":      "judge_response",
		"requestId": "judge-1",
		"output":    `{"score": 0.9, "reason": "Relevant"}`,
		"apiKey":    "must-not-reach-worker",
	}))
	require.NoError(t, client.ReadJSON(&event))
	assert.Equal(t, "metric_completed", event["type"])
	assert.Equal(t, 0.9, event["score"])
	require.NoError(t, client.ReadJSON(&event))
	assert.Equal(t, "completed", event["type"])
	assert.Equal(t, true, event["passed"])
	require.NoError(t, client.Close())
	require.Eventually(t, func() bool {
		return activeModelEvaluations.Load() == 0
	}, time.Second, 10*time.Millisecond)

	t.Setenv("MODEL_EVALUATION_TIMEOUT_SECONDS", "1")
	timeoutClient, _, err := dialer.Dial("ws"+strings.TrimPrefix(server.URL, "http")+"/api/model-evaluation/ws", header)
	require.NoError(t, err)
	require.NoError(t, timeoutClient.ReadJSON(&event))
	require.NoError(t, timeoutClient.WriteJSON(map[string]any{
		"type":         "start",
		"input":        "Wait for the timeout",
		"actualOutput": "Waiting",
		"judgeModel":   "blocking-model",
	}))
	require.NoError(t, timeoutClient.ReadJSON(&event))
	assert.Equal(t, "error", event["type"])
	assert.Equal(t, "EVALUATION_TIMEOUT", event["code"])
	require.NoError(t, timeoutClient.Close())
	require.Eventually(t, func() bool {
		return activeModelEvaluations.Load() == 0
	}, time.Second, 10*time.Millisecond)

	t.Setenv("MODEL_EVALUATION_TIMEOUT_SECONDS", "5")
	cancelClient, _, err := dialer.Dial("ws"+strings.TrimPrefix(server.URL, "http")+"/api/model-evaluation/ws", header)
	require.NoError(t, err)
	require.NoError(t, cancelClient.ReadJSON(&event))
	require.NoError(t, cancelClient.WriteJSON(map[string]any{
		"type":         "start",
		"input":        "Cancel this evaluation",
		"actualOutput": "Waiting",
		"judgeModel":   "blocking-model",
	}))
	require.NoError(t, cancelClient.WriteJSON(map[string]any{"type": "cancel"}))
	_, _, err = cancelClient.ReadMessage()
	assert.Error(t, err)
	assert.Eventually(t, func() bool {
		return activeModelEvaluations.Load() == 0
	}, time.Second, 10*time.Millisecond)
}

func TestModelEvaluationWorkerProcess(t *testing.T) {
	if os.Getenv("MODEL_EVALUATION_TEST_WORKER") != "1" {
		return
	}

	scanner := bufio.NewScanner(os.Stdin)
	if !scanner.Scan() {
		os.Exit(2)
	}
	start := scanner.Text()
	if strings.Contains(start, "must-not-reach-worker") || strings.Contains(start, "apiKey") || strings.Contains(start, "baseUrl") {
		fmt.Println(`{"type":"error","code":"CREDENTIAL_LEAK"}`)
		os.Exit(3)
	}
	if strings.Contains(start, "blocking-model") {
		scanner.Scan()
		time.Sleep(5 * time.Second)
		os.Exit(0)
	}
	fmt.Println(`{"type":"metric_started","metric":"answer_relevancy"}`)
	fmt.Println(`{"type":"judge_request","requestId":"judge-1","prompt":"Judge the answer"}`)
	if !scanner.Scan() {
		os.Exit(4)
	}
	judgeResponse := scanner.Text()
	if strings.Contains(judgeResponse, "must-not-reach-worker") || strings.Contains(judgeResponse, "apiKey") {
		fmt.Println(`{"type":"error","code":"CREDENTIAL_LEAK"}`)
		os.Exit(5)
	}
	fmt.Println(`{"type":"metric_completed","metric":"answer_relevancy","score":0.9,"threshold":0.5,"passed":true,"reason":"Relevant"}`)
	fmt.Println(`{"type":"completed","passed":true}`)
	time.Sleep(20 * time.Millisecond)
	os.Exit(0)
}
