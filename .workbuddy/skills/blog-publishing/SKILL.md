---
name: blog-publishing
description: This skill should be used when writing, reviewing, or publishing SEO blog articles for the TaoDock/new-api site (web/src/content/blog/), including scaffolding new posts, validating frontmatter and internal links, syncing the affected test files, and committing the generated SEO artifacts. Triggers on requests like 写博客、发文章、新增 blog 文章、起草/评审/发布博文.
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

### 7. Commit and publish

Stage the Markdown source, the four regenerated artifacts under `web/public/`, and the touched test files in one commit. Publishing happens at deployment; keep `draft: true` for work in progress so it stays out of the sitemap, feed, and hub page.

## Hard rules

- Never invent URLs for `related` or body links — check the path exists in `web/public/sitemap.xml` or the route table first.
- Never use raw HTML or H1 headings in article bodies; the schema rejects both.
- Keep `title` at 20–90 chars and `description` at 80–180 chars; quote any frontmatter scalar containing a colon.
- Update all three date fields (`publishedAt`, `updatedAt`, `reviewedAt`) when intentionally refreshing an article, and regenerate.

## Resources

- `assets/article-template.md` — article skeleton with the full frontmatter and section outline; `new-post.sh` copies it.
- `references/frontmatter-spec.md` — field-by-field specification with validation rules and pitfalls.
- `references/writing-guide.md` — SEO writing standards: structure, keyword placement, FAQ and internal-link strategy.
- `references/test-sync.md` — exact test files and edits required per new article, plus verification commands.
- `scripts/new-post.sh` — scaffolds a new article file from the template with slug and today's date filled in.
