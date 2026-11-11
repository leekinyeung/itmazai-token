---
name: deepeval-update
description: Manually inspect, review, test, and release DeepEval dependency updates for TaoDock's tools/model-evaluation-worker. Use only when the user explicitly invokes $deepeval-update; do not select it automatically for ordinary model-evaluation work.
---

# DeepEval Update Workflow

Keep TaoDock's embedded DeepEval Worker reproducible and compatible with its browser-relayed judge protocol.

## Source of Truth

- Dependency manifest: `tools/model-evaluation-worker/package.json`
- Lockfile: `tools/model-evaluation-worker/bun.lock`
- Adapter and metric integration: `tools/model-evaluation-worker/src/worker.ts`
- Worker protocol: `tools/model-evaluation-worker/src/protocol.ts`
- Go WebSocket bridge: `controller/model_evaluation.go`
- Frontend judge relay: `web/src/features/model-evaluation/`

The Worker is compiled during the Docker build and copied into the final `new-api` image. Never update DeepEval inside a running production container.

## Invariants

- Keep `deepeval` pinned to an exact version in both the manifest and lockfile.
- Let dependency tooling update `package.json` and `bun.lock`; do not hand-edit lockfile resolutions.
- Do not add scheduled dependency checks, automatic update pull requests, automatic merging, or automatic deployment.
- Preserve browser-side ownership of model credentials. API keys and Base URLs must not enter Worker messages or process environment.
- Preserve JSONL and WebSocket message compatibility unless the user explicitly authorizes a protocol migration.
- Keep telemetry, browser opening, cache, dotenv loading, and Worker filesystem writes disabled.
- Do not assume judge prompt wording or request counts are stable across DeepEval versions.

## Workflow

1. Act only after the user explicitly invokes `$deepeval-update`. A request to inspect or troubleshoot model evaluation without that invocation does not authorize dependency checks or changes.
2. Match the requested scope:
   - `检查` or `check`: read versions and upstream release information; do not edit files.
   - `更新` or `update`: update the dependency and run all local gates; do not deploy.
   - `部署` or `deploy`: require explicit production deployment wording in the same request, then follow the deployment skill after local gates pass.
3. Read the current version from the manifest and lockfile. For a proposed update, inspect the upstream release notes and changed exported APIs before editing.
4. When an update is requested, use Bun from `tools/model-evaluation-worker`:

   ```bash
   bun add --exact deepeval@<version>
   bun install --frozen-lockfile
   ```

5. Review the integration points and stopping conditions in [references/compatibility-and-release.md](references/compatibility-and-release.md).
6. Run the Worker typecheck, tests, and compiled build. Then run the Go bridge tests and focused frontend model-evaluation tests described in the reference.
7. Treat a successful compile as insufficient. Verify all three metrics, structured judge responses, cancellation, safe failure mapping, and credential isolation.
8. If the user explicitly requested production release, use the `itmazai-token-deploy` skill after all gates pass. Checking or preparing an update never authorizes deployment.

## Manual Invocation Policy

- The user initiates every version check, dependency edit, test run, pull request, and deployment.
- Do not create schedules, monitors, Dependabot entries, or background tasks for DeepEval.
- Keep the skill explicit-only through `agents/openai.yaml`.
- Patch and minor releases still require compatibility review because prompts and structured schemas may change without TypeScript breakage.
- Major releases require an explicit adapter review and a real end-to-end evaluation before release.
- Security fixes receive priority, but do not bypass the same credential, protocol, and rollback gates.

Stop without merging or deploying when a required metric fails, a judge schema changes without an adapter update, telemetry or file writes reappear, credentials cross the Worker boundary, or production rollback compatibility is unknown.
