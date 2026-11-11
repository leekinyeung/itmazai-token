package authz

const ResourceFallbackPolicy = "fallback_policy"

var (
	FallbackPolicyRead  = Permission{Resource: ResourceFallbackPolicy, Action: ActionRead}
	FallbackPolicyWrite = Permission{Resource: ResourceFallbackPolicy, Action: ActionWrite}
)

func init() {
	RegisterResource(ResourceDefinition{
		Resource: ResourceFallbackPolicy,
		LabelKey: "Failure fallback",
		Actions: []ActionDefinition{
			{
				Action:         ActionRead,
				LabelKey:       "Read failure fallback",
				DescriptionKey: "View fallback configuration and exact routes.",
				DefaultRoles:   []string{BuiltInRoleAdmin},
			},
			{
				Action:         ActionWrite,
				LabelKey:       "Edit failure fallback",
				DescriptionKey: "Save fallback configuration and exact targets.",
				DefaultRoles:   []string{BuiltInRoleAdmin},
			},
		},
	})
}
