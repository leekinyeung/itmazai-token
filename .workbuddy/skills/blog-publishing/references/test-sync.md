# 测试同步清单

每新增一篇 `draft: false` 的文章，以下测试文件必须同步修改，否则测试套件会红。改完后跑「验证命令」全绿才算完成。

## 1. `web/src/features/public-content/__tests__/content-schema.test.ts`

文件末尾的 manifest 断言用例 `the generated manifest publishes exactly the launch set and valid JSON-LD`：

- `expect(PUBLIC_CONTENT.pages).toHaveLength(N)`：N +1
- `expect(getPublicContentPages('blog')).toHaveLength(M)`：M +1

## 2. `router/public_page_metadata_test.go` — 模式 A（TestPublicPageMetadataBeforeJavaScript）

在测试用例表中加一行（标题 = frontmatter title + " | TaoDock"，canonical = origin + path）：

```go
{path: "/blog/<slug>", title: "<title> | TaoDock", canonical: "https://taodock.com/blog/<slug>"},
```

并在「structured data」路径列表（约 83 行）中加入 `"/blog/<slug>"`。

## 3. `router/public_page_metadata_test.go` — 模式 B（TestGeneratedPublicContentAssetsStayIndexableAndSafe）

`indexableContentPaths` 列表加 `"/blog/<slug>"`。`<url>` 计数断言是 `8+len(indexableContentPaths)` 动态计算，**无需改数字**。

## 4. Hub 卡片断言（若有）

`web/src/features/public-content/__tests__/public-content-page.test.tsx` 中 `the blog hub lists published articles newest first` 断言 Hub 卡片数等于 `getPublicContentPages('blog').length`（动态），并抽查第一篇标题——仅当新文章成为最新一篇时才需要更新期望的标题/日期/链接。空态覆盖在 `blog-hub-empty.test.tsx`（mock registry），不受新文章影响。

## 验证命令

```bash
cd web && bun run content:generate                                    # schema + 内链校验、重新生成产物
cd web && bunx vitest run src/features/public-content --no-file-parallelism
cd web && bun run typecheck
go test ./router/ -count=1
```

产物人工核验（可选但推荐）：

```bash
grep -o "/blog/<slug>" web/public/sitemap.xml
grep -c "<item>" web/public/feed.xml
python3 -c "import json; m=json.load(open('web/public/public-content.json')); print(len(json.loads(m['blogHub']['structuredData'][0])['hasPart']))"
```

## 提交清单（一个 commit 包含）

- `web/src/content/blog/<slug>.md`（新文件）
- `web/public/` 下四个产物：`public-content.json`、`page-metadata.json`、`sitemap.xml`、`feed.xml`
- 上述测试文件改动
