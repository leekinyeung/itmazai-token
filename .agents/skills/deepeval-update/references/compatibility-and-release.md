# Compatibility and Release Gates

Read this reference when evaluating or releasing a DeepEval version change.

## Compatibility Review

Review the upstream release notes and the installed type declarations for changes to:

- `AnswerRelevancyMetric`, `FaithfulnessMetric`, and `GEval` constructor options
- `DeepEvalBaseLLM.generate`, `GenerationResult`, and Zod schema handling
- `LLMTestCase` and `SingleTurnParams`
- `measure()`, `reason`, `isSuccessful()`, thresholds, and score ranges
- generated judge prompts and structured response schemas
- telemetry, progress indicators, cache, dotenv, browser opening, and filesystem behavior

In `worker.ts`, preserve the `BrowserRelayModel` boundary: the Worker emits prompts and receives judge output, while the browser performs authenticated model requests. Do not add credentials to start messages, judge messages, logs, or environment variables.

DeepEval may issue several judge requests for one metric. Tests and production checks must assert correlation by `requestId` and completed metrics, not a fixed request count or exact prompt prose unless that prose is part of TaoDock's own protocol.

## Local Verification

Run from the repository root:

```bash
cd tools/model-evaluation-worker
bun install --frozen-lockfile
bun run typecheck
bun run test
bun run build

cd ../..
go test ./controller -run 'TestModelEvaluation'

cd web
bun run test src/features/model-evaluation/__tests__/model-evaluation.test.ts
bun run typecheck
bun run build:check
```

The Worker regression suite must demonstrate:

- answer relevancy, correctness, and faithfulness all complete
- structured judge output is parsed against the requested schema
- judge failures map to safe public codes
- cancellation exits cleanly
- no API key or Base URL reaches the Worker

If prompt changes break deterministic test fixtures, compare the new schema semantics before adjusting fixtures. Do not weaken assertions merely to accept the new version.

## Container Gate

Build the normal TaoDock image rather than copying a locally compiled Worker into production. Confirm that:

- `/model-evaluation-worker` exists and is executable
- `/api/status` reports `model_evaluation_enabled=true`
- the WebSocket accepts only `model-evaluation.v1` with the same-origin check
- cancellation and Worker timeout still release concurrency slots

## Production Gate

Production deployment requires explicit user authorization. Follow the existing TaoDock deployment skill to create a unique image, back up Compose and PostgreSQL, preserve the previous image, and update only `new-api`.

After deployment, verify:

1. Container health and internal/public `/api/status`.
2. HTTPS and WebSocket `ready`.
3. One target completion using a currently advertised, known-working model.
4. All three metric completions and the final `completed` event.
5. Recent logs contain no Worker startup, protocol, panic, or fatal errors.

Do not use a model that the upstream currently rejects or rate-limits as evidence that the Worker is broken.

## Rollback

The dependency update should not mutate application data. If the new Worker fails and no incompatible database migration occurred, restore the previous application image and repeat health, HTTPS, and WebSocket checks. Keep the failed image and relevant logs for diagnosis; do not delete PostgreSQL or Redis volumes.

Do not automatically roll back across an unknown database migration. Stop and report the compatibility uncertainty first.
