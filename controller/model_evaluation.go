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
	"crypto/subtle"
	"errors"
	"io"
	"net/http"
	"os"
	"os/exec"
	"slices"
	"strings"
	"sync/atomic"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

const (
	modelEvaluationSubprotocol      = "model-evaluation.v1"
	modelEvaluationMaxFrameBytes    = 256 * 1024
	modelEvaluationMaxInputBytes    = 128 * 1024
	modelEvaluationMaxWorkerMessage = 512 * 1024
)

var (
	activeModelEvaluations atomic.Int64
	modelEvaluationCommand = func(ctx context.Context, workerPath string) *exec.Cmd {
		return exec.CommandContext(ctx, workerPath)
	}
	modelEvaluationUpgrader = websocket.Upgrader{
		Subprotocols: []string{modelEvaluationSubprotocol},
		CheckOrigin:  modelEvaluationSameOrigin,
	}
)

type modelEvaluationClientError struct {
	Code string `json:"code"`
}

type modelEvaluationClientMessage struct {
	Type             string                      `json:"type"`
	Input            string                      `json:"input,omitempty"`
	ActualOutput     string                      `json:"actualOutput,omitempty"`
	ExpectedOutput   string                      `json:"expectedOutput,omitempty"`
	RetrievalContext string                      `json:"retrievalContext,omitempty"`
	JudgeModel       string                      `json:"judgeModel,omitempty"`
	RequestID        string                      `json:"requestId,omitempty"`
	Output           string                      `json:"output,omitempty"`
	Error            *modelEvaluationClientError `json:"error,omitempty"`
}

type modelEvaluationWorkerMessage struct {
	Type string `json:"type"`
}

type modelEvaluationReadResult struct {
	data []byte
	err  error
}

func modelEvaluationWorkerPath() string {
	return common.GetEnvOrDefaultString("MODEL_EVALUATION_WORKER_PATH", "/model-evaluation-worker")
}

func modelEvaluationMaxConcurrent() int64 {
	return int64(max(common.GetEnvOrDefault("MODEL_EVALUATION_MAX_CONCURRENT", 4), 1))
}

func modelEvaluationTimeout() time.Duration {
	seconds := max(common.GetEnvOrDefault("MODEL_EVALUATION_TIMEOUT_SECONDS", 300), 1)
	return time.Duration(seconds) * time.Second
}

func modelEvaluationWorkerAvailable() bool {
	info, err := os.Stat(modelEvaluationWorkerPath())
	return err == nil && info.Mode().IsRegular() && info.Mode().Perm()&0o111 != 0
}

func modelEvaluationSameOrigin(request *http.Request) bool {
	origins := request.Header.Values("Origin")
	if len(origins) != 1 || strings.Contains(origins[0], ",") {
		return false
	}
	origin, err := common.NormalizeOrigin(origins[0])
	if err != nil {
		return false
	}

	scheme := "http"
	if request.TLS != nil {
		scheme = "https"
	} else if forwarded := request.Header.Get("X-Forwarded-Proto"); forwarded != "" {
		candidate, _, _ := strings.Cut(forwarded, ",")
		candidate = strings.ToLower(strings.TrimSpace(candidate))
		if candidate == "http" || candidate == "https" {
			scheme = candidate
		}
	}
	requestOrigin, err := common.NormalizeOrigin(scheme + "://" + request.Host)
	if err != nil {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(origin), []byte(requestOrigin)) == 1
}

func validateModelEvaluationStart(message modelEvaluationClientMessage) error {
	message.Input = strings.TrimSpace(message.Input)
	message.ActualOutput = strings.TrimSpace(message.ActualOutput)
	message.JudgeModel = strings.TrimSpace(message.JudgeModel)
	if message.Input == "" || message.ActualOutput == "" || message.JudgeModel == "" {
		return errors.New("input, actual output, and judge model are required")
	}
	totalBytes := len(message.Input) + len(message.ActualOutput) + len(message.ExpectedOutput) + len(message.RetrievalContext) + len(message.JudgeModel)
	if totalBytes > modelEvaluationMaxInputBytes {
		return errors.New("evaluation input is too large")
	}
	if len(message.JudgeModel) > 512 {
		return errors.New("judge model is too long")
	}
	return nil
}

func writeModelEvaluationEvent(ws *websocket.Conn, message any) error {
	data, err := common.Marshal(message)
	if err != nil {
		return err
	}
	return ws.WriteMessage(websocket.TextMessage, data)
}

func writeModelEvaluationWorkerInput(writer *bufio.Writer, message modelEvaluationClientMessage) error {
	data, err := common.Marshal(message)
	if err != nil {
		return err
	}
	if _, err = writer.Write(append(data, '\n')); err != nil {
		return err
	}
	return writer.Flush()
}

func modelEvaluationError(stage, code, message string, retryable bool) gin.H {
	return gin.H{
		"type":      "error",
		"stage":     stage,
		"code":      code,
		"message":   message,
		"retryable": retryable,
	}
}

func ModelEvaluationWebSocket(c *gin.Context) {
	if !modelEvaluationWorkerAvailable() {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"success": false,
			"code":    "MODEL_EVALUATION_UNAVAILABLE",
			"message": "Model evaluation worker is unavailable",
		})
		return
	}
	if !slices.Contains(websocket.Subprotocols(c.Request), modelEvaluationSubprotocol) {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"code":    "MODEL_EVALUATION_PROTOCOL_REQUIRED",
			"message": "Model evaluation websocket protocol is required",
		})
		return
	}
	if activeModelEvaluations.Add(1) > modelEvaluationMaxConcurrent() {
		activeModelEvaluations.Add(-1)
		c.Header("Retry-After", "30")
		c.JSON(http.StatusTooManyRequests, gin.H{
			"success": false,
			"code":    "MODEL_EVALUATION_BUSY",
			"message": "Model evaluation capacity is full",
		})
		return
	}
	defer activeModelEvaluations.Add(-1)

	ws, err := modelEvaluationUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	defer ws.Close()
	ws.SetReadLimit(modelEvaluationMaxFrameBytes)

	ctx, cancel := context.WithTimeout(c.Request.Context(), modelEvaluationTimeout())
	defer cancel()
	if deadline, ok := ctx.Deadline(); ok {
		_ = ws.SetReadDeadline(deadline)
	}
	if err = writeModelEvaluationEvent(ws, gin.H{"type": "ready"}); err != nil {
		return
	}

	_, firstData, err := ws.ReadMessage()
	if err != nil {
		return
	}
	_ = ws.SetReadDeadline(time.Time{})
	var start modelEvaluationClientMessage
	if common.Unmarshal(firstData, &start) != nil || start.Type != "start" {
		_ = writeModelEvaluationEvent(ws, modelEvaluationError("protocol", "START_REQUIRED", "The first message must start an evaluation.", false))
		return
	}
	if err = validateModelEvaluationStart(start); err != nil {
		_ = writeModelEvaluationEvent(ws, modelEvaluationError("validation", "INVALID_INPUT", err.Error(), false))
		return
	}

	cmd := modelEvaluationCommand(ctx, modelEvaluationWorkerPath())
	cmd.Env = append(cmd.Environ(),
		"DEEPEVAL_TELEMETRY_OPT_OUT=1",
		"DEEPEVAL_DISABLE_DOTENV=1",
		"DEEPEVAL_FILE_SYSTEM=READ_ONLY",
		"CONFIDENT_OPEN_BROWSER=0",
		"CONFIDENT_TRACING_ENABLED=0",
		"ENABLE_DEEPEVAL_CACHE=0",
	)
	cmd.Stderr = io.Discard
	stdin, err := cmd.StdinPipe()
	if err != nil {
		_ = writeModelEvaluationEvent(ws, modelEvaluationError("startup", "WORKER_START_FAILED", "The evaluation worker could not start.", true))
		return
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		_ = writeModelEvaluationEvent(ws, modelEvaluationError("startup", "WORKER_START_FAILED", "The evaluation worker could not start.", true))
		return
	}
	if err = cmd.Start(); err != nil {
		_ = writeModelEvaluationEvent(ws, modelEvaluationError("startup", "WORKER_START_FAILED", "The evaluation worker could not start.", true))
		return
	}
	defer stdin.Close()

	workerInput := bufio.NewWriter(stdin)
	if err = writeModelEvaluationWorkerInput(workerInput, start); err != nil {
		_ = writeModelEvaluationEvent(ws, modelEvaluationError("startup", "WORKER_WRITE_FAILED", "The evaluation worker could not receive the test case.", true))
		return
	}

	clientMessages := make(chan modelEvaluationReadResult, 1)
	go func() {
		for {
			_, data, readErr := ws.ReadMessage()
			select {
			case clientMessages <- modelEvaluationReadResult{data: data, err: readErr}:
			case <-ctx.Done():
				return
			}
			if readErr != nil {
				return
			}
		}
	}()

	workerMessages := make(chan []byte, 1)
	workerScanDone := make(chan error, 1)
	go func() {
		scanner := bufio.NewScanner(stdout)
		scanner.Buffer(make([]byte, 64*1024), modelEvaluationMaxWorkerMessage)
		for scanner.Scan() {
			line := append([]byte(nil), scanner.Bytes()...)
			select {
			case workerMessages <- line:
			case <-ctx.Done():
				return
			}
		}
		select {
		case workerScanDone <- scanner.Err():
		case <-ctx.Done():
		}
	}()

	processDone := make(chan error, 1)
	go func() {
		processDone <- cmd.Wait()
	}()

	for {
		select {
		case line := <-workerMessages:
			var header modelEvaluationWorkerMessage
			if common.Unmarshal(line, &header) != nil || header.Type == "" {
				_ = writeModelEvaluationEvent(ws, modelEvaluationError("protocol", "WORKER_PROTOCOL_ERROR", "The evaluation worker returned an invalid message.", true))
				return
			}
			if err = ws.WriteMessage(websocket.TextMessage, line); err != nil {
				return
			}
			if header.Type == "completed" || header.Type == "error" {
				return
			}
		case result := <-clientMessages:
			if result.err != nil {
				return
			}
			var message modelEvaluationClientMessage
			if common.Unmarshal(result.data, &message) != nil {
				_ = writeModelEvaluationEvent(ws, modelEvaluationError("protocol", "INVALID_MESSAGE", "The evaluation request was invalid.", false))
				return
			}
			switch message.Type {
			case "judge_response":
				if message.RequestID == "" || len(message.RequestID) > 128 || len(message.Output) > modelEvaluationMaxInputBytes || (message.Error == nil && message.Output == "") {
					_ = writeModelEvaluationEvent(ws, modelEvaluationError("protocol", "INVALID_JUDGE_RESPONSE", "The judge response was invalid.", false))
					return
				}
				if err = writeModelEvaluationWorkerInput(workerInput, message); err != nil {
					_ = writeModelEvaluationEvent(ws, modelEvaluationError("worker", "WORKER_WRITE_FAILED", "The evaluation worker stopped receiving judge responses.", true))
					return
				}
			case "cancel":
				_ = writeModelEvaluationWorkerInput(workerInput, modelEvaluationClientMessage{Type: "cancel"})
				return
			default:
				_ = writeModelEvaluationEvent(ws, modelEvaluationError("protocol", "UNEXPECTED_MESSAGE", "The evaluation request was out of sequence.", false))
				return
			}
		case scanErr := <-workerScanDone:
			processErr := <-processDone
			if ctx.Err() == context.DeadlineExceeded {
				_ = writeModelEvaluationEvent(ws, modelEvaluationError("timeout", "EVALUATION_TIMEOUT", "The evaluation timed out.", true))
				return
			}
			if scanErr != nil || processErr != nil {
				_ = writeModelEvaluationEvent(ws, modelEvaluationError("worker", "WORKER_STOPPED", "The evaluation worker stopped unexpectedly.", true))
				return
			}
			_ = writeModelEvaluationEvent(ws, modelEvaluationError("worker", "WORKER_NO_RESULT", "The evaluation worker exited without a result.", true))
			return
		case <-ctx.Done():
			if ctx.Err() == context.DeadlineExceeded {
				_ = writeModelEvaluationEvent(ws, modelEvaluationError("timeout", "EVALUATION_TIMEOUT", "The evaluation timed out.", true))
			}
			return
		}
	}
}
