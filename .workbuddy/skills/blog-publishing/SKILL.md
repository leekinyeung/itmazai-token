---
name: blog-publishing
description: This skill should be used when writing, reviewing, publishing, or deploying SEO blog articles for the TaoDock/new-api site (web/src/content/blog/), covering the full closed loop — scaffolding new posts, validating frontmatter and internal links, syncing affected test files, committing generated SEO artifacts, watching the push-to-production deploy pipeline, verifying the live page, and submitting sitemaps to Google Search Console. Triggers on requests like 写博客、发文章、新增 blog 文章、起草/评审/发布博文、博客上线.
agent_created: true
---

# Blog Publishing

## Overview

Publish SEO blog posts through this repository's build-time static pipeline: Markdown source in `web/src/content/blog/` → `bun run content:generate` → generated artifacts in `web/public/` → Go SSR meta injection at request time. Always read the repo's `docs/blog-seo-plan.md` §7 for content strategy when planning new topics.

## Workflow

### 1. Scaffold the article

Run `scripts/new-post.sh <slug>` from the repository root (or copy `assets/article-template.md` manually) to create `web/src/content/blog/<slug>.md` with a valid frontmatter skeleton. Slug rules: lowercase letters, digits, and hyphens only; keep it short and include the primary keyword.

### 2. Fill the frontmatter

Follow `references/frontmatter-spec.md` exactly — it documents every field, its validation rule, and the pitfalls already hit in production (e.g., quote any value containing a colon, or YAML parsing fails).

### 3. Write the body

Follow `references/writing-guide.md`: opening paragraph answers the core question in ≤100 words, every section is actionable, no H1, no raw HTML, and internal links only point to paths that already exist (build-time validation rejects dangling links).

### 4. Validate locally

```bash
cd web && bun run content:generate
```

This regenerates `web/public/{public-content.json,page-metadata.json,sitemap.xml,feed.xml}` and fails on any schema violation, broken internal link, or missing cover image. Preview with `bun run dev` at `/blog/<slug>` when a visual check matters.

### 5. Sync the tests

Every new published article (draft: false) requires coordinated test updates. Follow `references/test-sync.md` for the exact files, counters, and lists to touch — skipping this leaves the test suite red.

### 6. Verify

```bash
cd web && bunx vitest run src/features/public-content --no-file-parallelism
cd web && bun run typecheck
go test ./router/ -count=1
```

Confirm the artifacts afterwards: the article appears in `web/public/sitemap.xml`, `web/public/feed.xml` (as a new `<item>`), and `web/public/public-content.json` (`blogHub.structuredData` CollectionPage `hasPart`).

When touching shared components (navigation, footer, layout), also run `bunx vitest run src/components/layout --no-file-parallelism` — CI's quality gate runs the full frontend suite, and a red gate blocks deployment.

### 7. Commit, deploy, and close the loop

Stage the Markdown source, the four regenerated artifacts under `web/public/`, and the touched test files in one commit, then push to `main`. Pushing triggers the production deploy pipeline automatically (quality gate → image build → smoke → SSH deploy with auto-rollback).

```bash
git push origin main
gh run watch $(gh run list --workflow=deploy.yml --limit 1 --json databaseId -q '.[0].databaseId')
```

Treat the release as done only when the deploy run is green — a failed run means production auto-rolled back. Diagnose failures with `gh run view <run-id>` and `gh run view --job <job-id> --log`.

### 8. Verify live and submit to GSC

After a green deploy, run from the repository root:

```bash
.workbuddy/skills/blog-publishing/scripts/verify-live.sh <slug>
.workbuddy/skills/blog-publishing/scripts/gsc-submit.sh   # needs one-time GSC setup
```

`verify-live.sh` checks the hub, article SSR meta, sitemap, and feed on production. `gsc-submit.sh` submits `sitemap.xml` and `feed.xml` through the Search Console API. Both require the one-time setup in `references/deploy-and-gsc.md`; if the GSC key is missing, skip the submission and report it to the user instead of failing the workflow.

## Hard rules

- Never invent URLs for `related` or body links — check the path exists in `web/public/sitemap.xml` or the route table first.
- Never use raw HTML or H1 headings in article bodies; the schema rejects both.
- Keep `title` at 20–90 chars and `description` at 80–180 chars; quote any frontmatter scalar containing a colon.
- Update all three date fields (`publishedAt`, `updatedAt`, `reviewedAt`) when intentionally refreshing an article, and regenerate.
- Never call a release done before the `deploy.yml` run is green; never hand-verify only a subset of tests when shared components changed (CI runs the full suite).
- Keep `draft: true` for work in progress so it stays out of the sitemap, feed, and hub page.

## Resources

- `assets/article-template.md` — article skeleton with the full frontmatter and section outline; `new-post.sh` copies it.
- `references/frontmatter-spec.md` — field-by-field specification with validation rules and pitfalls.
- `references/writing-guide.md` — SEO writing standards: structure, keyword placement, FAQ and internal-link strategy.
- `references/test-sync.md` — exact test files and edits required per new article, plus verification commands.
- `references/deploy-and-gsc.md` — deploy pipeline operations (push-to-deploy, watching, failure triage) and the one-time GSC service-account setup.
- `scripts/new-post.sh` — scaffolds a new article file from the template with slug and today's date filled in.
- `scripts/verify-live.sh` — post-deploy production checks for the hub and article SEO wiring.
- `scripts/gsc-submit.sh` — submits sitemap.xml and feed.xml to Google Search Console via the API.
