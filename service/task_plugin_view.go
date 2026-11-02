package service

import (
	"encoding/json"
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/gin-gonic/gin"
)

// BuildTaskPluginView converts a persisted task into the deliberately narrow
// public shape permitted at JavaScript plugin boundaries.
func BuildTaskPluginView(task *model.Task) (dto.TaskView, error) {
	createdAt := task.CreatedAt
	if createdAt == 0 {
		createdAt = task.SubmitTime
	}
	view := dto.TaskView{
		TaskID:     task.TaskID,
		Platform:   string(task.Platform),
		Status:     string(task.Status),
		Progress:   task.Progress,
		FailReason: common.RedactModelNames(task.FailReason, task.Properties.OriginModelName, task.Properties.UpstreamModelName),
		CreatedAt:  createdAt,
		UpdatedAt:  task.UpdatedAt,
		FinishedAt: task.FinishTime,
	}
	if len(task.Data) > 0 {
		projected, err := ProjectTaskModelData(task)
		if err != nil {
			return dto.TaskView{}, err
		}
		if err := common.Unmarshal(projected, &view.Data); err != nil {
			return dto.TaskView{}, err
		}
		view.Data = replacePrivateTaskID(view.Data, task.PrivateData.UpstreamTaskID, task.TaskID)
	}
	return view, nil
}

// replacePrivateTaskID rewrites exact private IDs only in known task-ID fields.
// Map keys and opaque strings, including URLs containing the ID, are preserved.
func replacePrivateTaskID(value any, privateTaskID, publicTaskID string) any {
	if privateTaskID == "" || privateTaskID == publicTaskID {
		return value
	}
	switch typed := value.(type) {
	case []any:
		replaced := make([]any, len(typed))
		for index, item := range typed {
			replaced[index] = replacePrivateTaskID(item, privateTaskID, publicTaskID)
		}
		return replaced
	case map[string]any:
		replaced := make(map[string]any, len(typed))
		for key, item := range typed {
			if (key == "id" || key == "task_id" || key == "taskId") && item == privateTaskID {
				replaced[key] = publicTaskID
				continue
			}
			replaced[key] = replacePrivateTaskID(item, privateTaskID, publicTaskID)
		}
		return replaced
	default:
		return value
	}
}

// ProjectTaskModelData projects the provider envelope without normalizing opaque
// business JSON through float64. Arrays have no protocol model envelope.
func ProjectTaskModelData(task *model.Task) (json.RawMessage, error) {
	if len(task.Data) == 0 {
		return nil, nil
	}
	if common.GetJsonType(task.Data) != "object" {
		return task.Data, nil
	}
	return taskPublicModelIdentity(task).ProjectResponseModel(task.Data)
}

// BindTaskPublicModel rebuilds only the display projection from persisted
// identities. It never supplies an upstream fallback for a missing public name.
func BindTaskPublicModel(c *gin.Context, task *model.Task) {
	taskPublicModelIdentity(task).BindPublicModel(c)
}

func taskPublicModelIdentity(task *model.Task) *relaycommon.RelayInfo {
	return &relaycommon.RelayInfo{
		OriginModelName: task.Properties.OriginModelName,
		PublicModelName: task.Properties.OriginModelName,
		RelayFormat:     types.RelayFormatTask,
		ChannelMeta: &relaycommon.ChannelMeta{
			UpstreamModelName: task.Properties.UpstreamModelName,
			IsModelMapped:     task.Properties.OriginModelName == "" || task.Properties.UpstreamModelName != task.Properties.OriginModelName,
		},
	}
}
