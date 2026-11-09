# 部署与 GSC 提交（闭环手册）

本仓库的发布是**推即部署**：`git push origin main` 触发 `.github/workflows/deploy.yml`（质量门禁 → 构建镜像 → 冒烟 → SSH 发布 → 失败自动回滚）。详见 `docs/ci-cd.md`。

## 日常发布闭环（每篇文章）

```bash
# 1. 提交并推送（commit 后）
git push origin main

# 2. 盯部署（约 6–14 分钟）
gh run list --workflow=deploy.yml --limit 1          # 确认新 run 已创建
gh run watch $(gh run list --workflow=deploy.yml --limit 1 --json databaseId -q '.[0].databaseId')

# 3. 失败时定位（先看哪个 job 红，再拉日志）
gh run view <run-id>
gh run view --job <job-id> --log | grep -B 3 -A 15 "AssertionError\|::error::"

# 4. 部署成功后验证线上
.workbuddy/skills/blog-publishing/scripts/verify-live.sh <slug>

# 5. 提交 GSC（需一次性配置，见下节）
GSC_SA_KEY=~/.config/taodock/gsc-service-account.json \
  .workbuddy/skills/blog-publishing/scripts/gsc-submit.sh
```

## 血泪教训：本地验证必须对齐 CI 质量门禁

CI 的 quality-gate 跑**全量**前端测试（`bun run test`，230+ 个测试文件），不是只有 public-content 目录。2026-11-09 博客功能首次发布就因为本地只跑了子集、漏掉 footer 链接计数断言而失败。规则：

- 改动导航/页脚/布局等公共组件时，本地至少跑 `bunx vitest run src/components/layout --no-file-parallelism`；
- 推送后必须盯 `deploy.yml` 跑完（步骤 2），绿了才算闭环；
- 部署失败 = 服务器已自动回滚到上一版，修复后重新推送即可，不需要登录服务器。

## GSC 一次性配置（约 10 分钟）

Search Console API 需要凭证。有两条路径，`gsc-submit.sh` 会按文件是否存在自动选择（优先服务账号）：

### 方案 A：服务账号（默认；组织策略允许时用）

1. 打开 [Google Cloud Console](https://console.cloud.google.com/) → 创建或选一个项目（如 `taodock-seo`）。
2. 「API 和服务」→「库」→ 启用 **Google Search Console API**。
3. 「凭据」→「创建凭据」→「服务账号」→ 命名（如 `gsc-sitemap-submitter`），不需要授予项目角色。
4. 进入该服务账号 →「密钥」→「添加密钥」→「JSON」，下载得到密钥文件。
5. 把密钥存到 `~/.config/taodock/gsc-service-account.json`（`chmod 600`，**不要提交进仓库**）。
6. 打开 [Google Search Console](https://search.google.com/search-console) → 选择 `taodock.com` 媒体资源 →「设置」→「用户和权限」→「添加用户」→ 填服务账号的 `client_email`（形如 `...@....iam.gserviceaccount.com`），权限选「所有者」或「完整」。
7. 验证：`.workbuddy/skills/blog-publishing/scripts/gsc-submit.sh` 输出两行 `ok` 即配置成功。

### 方案 B：OAuth 用户授权（组织策略 `iam.disableServiceAccountKeyCreation` 禁用 SA 密钥时用此路径）

原理：不再使用服务账号，而是创建「桌面应用」类型的 OAuth 客户端，用**你自己的 Google 账号**（GSC 媒体资源的所有者）授权一次，脚本保存 refresh token，之后每次运行时自动换访问令牌。rclone 等工具同款模式，不涉及任何服务账号密钥，不受该组织策略限制。

1. 同方案 A 的步骤 1–2（建项目、启用 Search Console API）。
2. 「API 和服务」→「OAuth 同意屏幕」：用户类型选「外部」，填应用名（如 `taodock-gsc-submit`）和你的邮箱；「范围」页添加 `https://www.googleapis.com/auth/webmasters`；「测试用户」页把**自己的 Gmail** 加进去。
3. **关键**：回到「OAuth 同意屏幕」概要页，把发布状态从「测试」改为「**正式版（In production）**」——测试状态下 refresh token 只有 7 天有效期。改为正式版不需要走 Google 审核（只有你自己一个用户，授权时会看到「未验证应用」警告，点「继续」即可）。
4. 「凭据」→「创建凭据」→「OAuth 客户端 ID」→ 应用类型选「**桌面应用（Desktop app）**」，创建后记下 client_id 和 client_secret。
5. 运行一次性授权（会自动打开浏览器，用拥有 GSC 权限的 Google 账号登录并同意）：

   ```bash
   .workbuddy/skills/blog-publishing/scripts/gsc-auth.py \
     --client-id 'XXX.apps.googleusercontent.com' \
     --client-secret 'GOCSPX-...'
   ```

   成功后凭证保存在 `~/.config/taodock/gsc-oauth.json`（权限 600，**不要提交进仓库**）。
6. 该 Google 账号必须已经在 GSC 里拥有 `taodock.com` 媒体资源的权限（你是站点所有者，默认就有）。
7. 验证：`.workbuddy/skills/blog-publishing/scripts/gsc-submit.sh` 输出两行 `ok` 即配置成功。

脚本提交 `sitemap.xml` 与 `feed.xml` 两个地址。GSC 已收录的 sitemap 重复提交无副作用（等同刷新）。

## 注意边界

- Google 的 **Indexing API 只对招聘启事/直播类内容开放**，普通博客文章无法通过 API 请求索引——收录靠 sitemap + 内链 + 内容质量，GSC 提交只是加速发现。
- robots.txt 已声明两个 sitemap，即使不调 API，Google 也会定期抓取；脚本的增量价值是「立即通知」。
- 服务账号密钥泄露 = GSC 数据可读可改，按生产密钥对待。
