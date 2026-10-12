# 文章生成个人画像站

上传往期文章链接或个人简历 PDF → 自动抽出内容 → 生成 Glass / 杂志 / 和纸墨 **三套预览图** → 用户选定后生成个人站 HTML → **自定义域名前缀** → 发布为公开链接。

## 完整流程

| # | 阶段 | 说明 | 可否跳过 |
|---|---|---|---|
| A | 内容抽取 | 从文章 / 简历归纳内容槽位，缺项标「待补」，不编造 | ❌ |
| B | 三风格预览 | 按 `styles/*.md` 各出一张 16:9 首屏示意 | ❌ |
| C | 站点构建 | 选定风格后生成单页 `index.html`（Hero→关于→作品→文章→方法→合作） | ❌ |
| D | **域名前缀命名** | 询问窗口：自定义分享链接的子域名前缀 | ❌ 发布前必做 |
| E | 发布与交付 | 用 `scripts/publish-named.js` 发布并交付分享链接 | ✅ |

## 安装（WorkBuddy）

```bash
mkdir -p ~/.codebuddy/skills
cp -R article-to-portrait-site ~/.codebuddy/skills/
chmod +x ~/.codebuddy/skills/article-to-portrait-site/scripts/publish-named.js
```

也支持：`~/.workbuddy/skills/article-to-portrait-site`、`~/.agents/skills/article-to-portrait-site`

## 发布（可自定义域名前缀）

分享链接形如 `https://<appName>.app.workbuddy.host`：

| 组成 | 可否自定义 |
|---|---|
| `https://` | ❌ 固定 |
| `<appName>` 子域名前缀 | ✅ 可自定义 |
| `.app.workbuddy.host` | ❌ 平台固定后缀 |

```bash
# 自定义前缀并发布
node scripts/publish-named.js --dir <项目目录> --name wangtiancheng

# 沿用上次的前缀（链接不变）
node scripts/publish-named.js --dir <项目目录>

# 只预览将生成的域名，不发布
node scripts/publish-named.js --dir <项目目录> --name demo --dry-run
```

- 前缀规则：小写字母开头，仅含 `a-z` `0`-`9` `-`，不以 `-` 结尾，长度 ≤ 40
- 前缀持久化在 `~/.workbuddy-sandbox-publish/state.json`，**下次发布自动复用**
- 改前缀 = 换链接，**旧的分享链接会失效**

## 触发示例

> 这是我的简历.pdf，再加这几篇公众号链接，先出三种风格预览再做网站

## 目录

- `SKILL.md`：完整工作流程、各阶段细则与验收清单
- `styles/`：三套风格规格（色板 / 禁区 / 动效）
- `scripts/publish-named.js`：自定义域名前缀 + 发布
- `previews/`：风格气质示意（有用户素材后须重出带其文案的预览）
