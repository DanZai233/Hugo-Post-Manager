/**
 * blogScaffold.ts — 新 Hugo 博客仓库的脚手架内容生成
 *
 * 向导「从零创建博客」会调用 buildBlogScaffoldFiles() 生成一套可直接部署的
 * Hugo 站点文件(Stack 主题 + GitHub Pages Actions 工作流),再通过 GitHub
 * Git Data API 以单个 commit 写入新仓库。
 *
 * 说明:
 * - 主题无法通过 GitHub API 创建 git submodule,因此 CI 里用
 *   `git clone --depth 1` 拉取 hugo-theme-stack 到 themes/(本地开发时
 *   也可以按教程手动 git clone / submodule add)。
 * - 部署工作流采用 GitHub Pages 官方方案(actions/configure-pages +
 *   upload-pages-artifact + deploy-pages),只需在仓库 Settings → Pages 里
 *   把 Source 设为 GitHub Actions,无需 gh-pages 分支,首次运行即可发布。
 */

export interface ScaffoldFile {
  path: string;
  content: string;
}

export interface BlogScaffoldOptions {
  owner: string; // GitHub 用户名
  repoName: string; // 新仓库名(如 <owner>.github.io 则是用户站点,否则为项目子路径)
  siteTitle: string;
  description: string;
}

/** 依据仓库名计算最终站点 baseURL(用户站点在根路径,项目站点在 /repo/ 子路径) */
export function computeBaseURL(owner: string, repoName: string): string {
  const o = owner.toLowerCase();
  const r = repoName.toLowerCase();
  const isUserSite = r === `${o}.github.io` || r === `${o}.github.com`;
  return isUserSite ? `https://${r}/` : `https://${o}.github.io/${repoName}/`;
}

/** 生成一套完整的 Hugo 博客脚手架文件 */
export function buildBlogScaffoldFiles(opts: BlogScaffoldOptions): ScaffoldFile[] {
  const { owner, repoName, siteTitle, description } = opts;
  const baseURL = computeBaseURL(owner, repoName);
  const today = new Date();
  const dateStr = today.toISOString().replace('T', 'T').slice(0, 19) + '+08:00';
  const siteDesc = (description || `${siteTitle} - 基于 Hugo 的个人博客`).trim();

  const hugoYaml = `# Hugo 站点基础配置(更多配置见 config/_default/)
# 教程:https://github.com/DanZai233/Hugo-Post-Manager/blob/main/docs/hugo-blog-deploy-guide.md
# 主题配置详解:https://github.com/DanZai233/Hugo-Post-Manager/blob/main/docs/hugo-theme-guide.md
baseURL: "${baseURL}"
languageCode: "zh-cn"
title: "${siteTitle}"
theme: "hugo-theme-stack"

defaultContentLanguage: "zh-cn"
hasCJKLanguage: true        # 中文站点必须开启:影响字数统计与摘要

buildFuture: true

pagination:
  pagerSize: 10

permalinks:
  post: "/p/:slug/"
  page: "/:slug/"
`;

  const paramsYaml = `# 主题外观与行为配置(hugo-theme-stack)
# 完整字段见主题文档 https://docs.stack.jimmycai.com/configuration/
description: "${siteDesc}"

# 首页展示的文章分区
mainSections:
  - post

# 日期格式
dateFormat:
  published: "2006-01-02"
  lastUpdated: "2006-01-02"

# 侧边栏
sidebar:
  emoji: "🌱"
  subtitle: "${siteTitle}"

# 文章
article:
  headingAnchor: true
  toc: true
  readingTime: true
  license:
    enabled: false

# 首页与页面侧栏小组件
widgets:
  homepage:
    - type: search
    - type: archives
      params:
        limit: 5
    - type: categories
      params:
        limit: 10
    - type: tag-cloud
      params:
        limit: 10
  page:
    - type: toc

# 明暗主题切换
colorScheme:
  toggle: true
  default: "auto"

# 评论(默认关闭;开启 giscus 的方法见主题教程)
comments:
  enabled: false

# 页脚
footer:
  since: ${today.getFullYear()}
  customText: "Powered by <a href=\\"https://gohugo.io/\\" target=\\"_blank\\">Hugo</a> & <a href=\\"https://github.com/CaiJimmy/hugo-theme-stack\\" target=\\"_blank\\">Stack</a>"
`;

  const archetype = `---
title: "{{ replace .Name "-" " " | title }}"
date: {{ .Date }}
draft: true
description: ""
tags: []
categories: []
---

<!-- 正文从这里开始。draft 保持 true 时本地 hugo server -D 可预览,发布前记得改 false -->
`;

  const helloPost = `---
title: "你好,世界"
date: ${dateStr}
draft: false
description: "我的第一篇 Hugo 博客文章"
tags: ["Hugo", "博客"]
categories: ["随笔"]
---

欢迎来到我的博客 🎉 这是由 **Hugo + Stack 主题 + GitHub Actions + GitHub Pages** 自动构建发布的第一篇文章。

<!--more-->

## 接下来可以做什么

- 在 Hugo Post Manager 里选中这篇文章直接改,或新建文章
- 想换站点标题/侧边栏/导航?去 \`config/_default/\` 下的 yaml 文件改
- 想换颜色/头像/加评论?看主题配置教程(hugo-theme-guide.md)
- 每次「同步并部署」后,GitHub Actions 会自动重新构建并发布
`;

  const gitignore = `# Hugo 构建产物
/public/

# 资源缓存
/resources/_gen/

# 构建锁
.hugo_build.lock

# 系统文件
.DS_Store

# 本地环境变量
.env
`;

  const deployYaml = `# Hugo 博客 → GitHub Pages 自动部署(GitHub 官方 Pages 方案)
# 首次使用前:仓库 Settings → Pages → Build and deployment → Source 选 "GitHub Actions"
name: Deploy Hugo site to Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Install Hugo CLI (extended)
        run: |
          wget -O "$RUNNER_TEMP/hugo.tar.gz" "https://github.com/gohugoio/hugo/releases/download/v0.156.0/hugo_extended_0.156.0_linux-amd64.tar.gz"
          tar -xzf "$RUNNER_TEMP/hugo.tar.gz" -C "$RUNNER_TEMP"
          sudo mv "$RUNNER_TEMP/hugo" /usr/local/bin/hugo

      - name: Checkout
        uses: actions/checkout@v4

      - name: Fetch theme (hugo-theme-stack)
        run: |
          git clone --depth 1 https://github.com/CaiJimmy/hugo-theme-stack.git themes/hugo-theme-stack

      - name: Setup Pages
        id: pages
        uses: actions/configure-pages@v5

      - name: Build with Hugo
        env:
          HUGO_ENVIRONMENT: production
          TZ: Asia/Shanghai
        run: |
          hugo --gc --minify --baseURL "\${{ steps.pages.outputs.base_url }}/"

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./public

  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`;

  const repoReadme = `# ${siteTitle}

基于 [Hugo](https://gohugo.io/) + [Stack 主题](https://github.com/CaiJimmy/hugo-theme-stack) 的博客,
由 GitHub Actions 自动构建部署到 GitHub Pages。

**在线访问**: ${baseURL}

## 本地预览

\`\`\`bash
# 需要 Hugo Extended(https://gohugo.io/installation/)
git clone --depth 1 https://github.com/CaiJimmy/hugo-theme-stack.git themes/hugo-theme-stack
hugo server -D        # http://localhost:1313
\`\`\`

## 日常写作

1. 用 [Hugo Post Manager](https://github.com/DanZai233/Hugo-Post-Manager) 在线编辑并「同步并部署」;
2. 或本地 \`hugo new content post/my-post/index.md\` 后 git push main;
3. GitHub Actions 自动构建,几分钟内上线。

## 配置入口速查

| 想改什么 | 改哪个文件 |
|---|---|
| 站点标题 / 域名 / 语言 | \`hugo.yaml\`(或 config/_default/) |
| 描述 / 侧边栏 / 首页组件 / 评论 | \`config/_default/params.yaml\` |
| 导航菜单 / 社交链接 | \`config/_default/menu.yaml\`(可新建) |
| 部署流水线 | \`.github/workflows/deploy.yaml\` |
`;

  return [
    { path: 'hugo.yaml', content: hugoYaml },
    { path: 'config/_default/params.yaml', content: paramsYaml },
    { path: 'archetypes/default.md', content: archetype },
    { path: 'content/post/hello-world/index.md', content: helloPost },
    { path: '.gitignore', content: gitignore },
    { path: '.github/workflows/deploy.yaml', content: deployYaml },
    { path: 'README.md', content: repoReadme },
  ];
}
