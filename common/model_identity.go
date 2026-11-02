package common

import (
	"cmp"
	"net/http"
	"net/url"
	"slices"
	"strings"

	"github.com/gin-gonic/gin"
)

const ModelIdentityProjectionKey = "relay_public_model_projection"

// ModelIdentityProjection belongs to the host request. The HTTP and SSE
// writers use it without depending on the relay package or its billing state.
type ModelIdentityProjection interface {
	ProjectResponseModel([]byte) ([]byte, error)
	PublicModelMessage(string) string
}

func ProjectResponseModel(c *gin.Context, body []byte) ([]byte, error) {
	if c != nil {
		if value, exists := c.Get(ModelIdentityProjectionKey); exists {
			if projection, ok := value.(ModelIdentityProjection); ok {
				return projection.ProjectResponseModel(body)
			}
		}
	}
	return body, nil
}

func PublicModelMessage(c *gin.Context, message string) string {
	if c != nil {
		if value, exists := c.Get(ModelIdentityProjectionKey); exists {
			if projection, ok := value.(ModelIdentityProjection); ok {
				return projection.PublicModelMessage(message)
			}
		}
	}
	return message
}

// RedactModelNames is exclusively for system diagnostics, never generated
// text, tool arguments, user inputs, or an entire serialized response.
func RedactModelNames(message, publicModel string, privateModels ...string) string {
	names := slices.Clone(privateModels)
	slices.SortFunc(names, func(a, b string) int { return cmp.Compare(len(b), len(a)) })
	if publicModel == "" {
		publicModel = "[model]"
	}
	var replacements []string
	for _, name := range names {
		if name != "" && name != publicModel {
			replacements = append(replacements, name, publicModel)
			for _, encoded := range []string{url.PathEscape(name), url.QueryEscape(name)} {
				if encoded != name {
					replacements = append(replacements, encoded, publicModel)
				}
			}
		}
	}
	if len(replacements) == 0 {
		return message
	}
	return strings.NewReplacer(replacements...).Replace(message)
}

// WritePublicModelJSON is the JSON send boundary for relay handlers that do
// not use the upstream HTTP response copier. It preserves status and framing.
func WritePublicModelJSON(c *gin.Context, status int, value any) {
	body, err := Marshal(value)
	if err == nil {
		body, err = ProjectResponseModel(c, body)
	}
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": gin.H{"type": "server_error", "code": "invalid_response_metadata", "message": MessageWithRequestId(err.Error(), c.GetString(RequestIdKey))}})
		return
	}
	c.Data(status, "application/json; charset=utf-8", body)
}

func WritePublicModelBytes(c *gin.Context, body []byte) (int, error) {
	projected, err := ProjectResponseModel(c, body)
	if err != nil {
		return 0, err
	}
	return c.Writer.Write(projected)
}
