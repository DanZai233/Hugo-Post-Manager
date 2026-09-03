import { GitHubConfig, GitHubWorkflowRun, HugoPost } from '../types';

export const DEFAULT_CONFIG: GitHubConfig = {
  token: '',
  owner: '',
  repo: '',
  branch: 'main',
  postsDir: 'content/posts',
  staticDir: 'static/images',
  isConfigured: false,
  useMock: true,
};

export const INITIAL_MOCK_POSTS: HugoPost[] = [
  {
    id: 'content/posts/hugo-github-actions-guide.md',
    name: 'hugo-github-actions-guide.md',
    path: 'content/posts/hugo-github-actions-guide.md',
    sha: 'mock-sha-1a2b3c4d5e',
    frontMatter: {
      title: 'Hugo 静态博客与 GitHub Actions 持续集成自动化部署指南',
      date: '2026-08-28T14:30:00+08:00',
      draft: false,
      tags: ['Hugo', 'GitHub Actions', 'CI/CD', '博客搭建'],
      categories: ['技术笔记', 'DevOps'],
      slug: 'hugo-github-actions-guide',
      summary: '详细解析如何使用 Hugo 搭建个人静态博客，并通过 GitHub Actions 实现每次 push 提交代码时自动构建并发布到 GitHub Pages。',
      author: 'Hugo Master',
      toc: true,
      math: true,
      comments: true,
      cover: {
        image: 'https://images.unsplash.com/photo-1618401471353-b98aedd04e11?auto=format&fit=crop&w=1200&q=80',
        alt: 'Hugo CI/CD Deployment',
      },
    },
    content: `## 为什么选择 Hugo + GitHub Actions？

Hugo 是世界上速度最快的静态网站生成框架之一，由 Go 语言开发。结合 GitHub Actions，我们可以做到：

1. **秒级构建**：数百篇文章仅需不到一秒即可编译完成。
2. **纯 Git 流程**：所有文章即代码，历史版本追溯清晰安全。
3. **零服务器维护**：构建后产物托管在 GitHub Pages 或 Cloudflare Pages，享受全球 CDN 加速。

<!--more-->

---

## 核心部署流程

部署的工作流通常分为三个阶段：

{{< alert "info" >}}
每次你通过本平台完成在线编辑并点击 **「提交并触发部署」** 时，GitHub 会接收到包含最新 Front Matter 与 Markdown 内容的 Git Commit，随后自动触发 \`.github/workflows/deploy.yml\` 执行。
{{< /alert >}}

### 1. 编写文章

在 \`content/posts/\` 目录下新建 Markdown 文件，并在文件头部添加 YAML 格式的元数据（Front Matter）：

\`\`\`yaml
---
title: "我的第一篇 Hugo 文章"
date: 2026-09-02T20:00:00+08:00
draft: false
tags: ["Hugo", "Go"]
categories: ["随笔"]
---
\`\`\`

### 2. GitHub Actions 脚本范例

在你的 GitHub 仓库根目录创建 \`.github/workflows/hugo.yml\`：

\`\`\`yaml
name: Deploy Hugo site to Pages

on:
  push:
    branches: ["main"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          submodules: recursive
      - name: Setup Hugo
        uses: peaceiris/actions-hugo@v3
        with:
          hugo-version: 'latest'
          extended: true
      - name: Build
        run: hugo --minify
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
\`\`\`

---

## 常用 Hugo Shortcodes 特性测试

可以通过 Shortcodes 在 Markdown 中直接引用多媒体或特殊组件：

{{< alert "success" >}}
恭喜！通过本可视化管理面板，你无需每次在本地开启终端敲命令行，随时随地在浏览器内即可直接写作、预览排版并一键推送到生产环境。
{{< /alert >}}

\`\`\`bash
# 本地测试 Hugo 常用调试命令
hugo server -D --disableFastRender
\`\`\`
`,
    rawContent: '',
    lastModified: '2026-08-28T14:30:00+08:00',
  },
  {
    id: 'content/posts/markdown-craft-and-shortcodes.md',
    name: 'markdown-craft-and-shortcodes.md',
    path: 'content/posts/markdown-craft-and-shortcodes.md',
    sha: 'mock-sha-2b3c4d5e6f',
    frontMatter: {
      title: 'Hugo 文章排版设计与 Shortcodes 效率实战',
      date: '2026-09-01T10:15:00+08:00',
      draft: false,
      tags: ['Markdown', '排版', 'Shortcodes'],
      categories: ['写作技巧'],
      slug: 'markdown-craft-and-shortcodes',
      summary: '探讨如何通过精细的 Markdown 排版规范、语义化标点符号以及 Hugo 内置与自定义 Shortcodes，打造专业阅读体验。',
      author: 'Hugo Master',
      toc: true,
      cover: {
        image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80',
        alt: 'Writing and Typography',
      },
    },
    content: `## 优质排版的原则

阅读体验是由每一个排版细节构成的。无论是中英文混排的空格处理，还是恰到好处的行距与字阶比例，都能大幅提升读者的沉浸感。

<!--more-->

### 引用与呼应

> “优秀的技术写作不仅要内容准确无误，更应该如行云流水般让读者感到舒适与清晰。”

### 数据对比表格

| 功能项 | 传统桌面客户端 | Web 在线管理面板 |
| :--- | :--- | :--- |
| **设备依赖** | 必须安装 Go/Hugo/Git 环境 | 任何电脑或平板浏览器即开即用 |
| **自动同步** | 需手动 \`git commit && git push\` | 一键提交并实时监控 Actions 状态 |
| **实时预览** | 本地启动后台端口 | 浏览器直接渲染 Hugo 标准样式 |
| **图片上传** | 手动拷贝到 static/ 目录 | 上传自动提交至 GitHub 静态路径 |

### 警告与提示提示框

{{< alert "warning" >}}
注意：如果你的 Hugo 仓库配置了子模块（Submodule）作为主题，请确保 GitHub Actions 构建流程中加入了 \`submodules: recursive\` 配置，否则生产环境可能会出现样式缺失。
{{< /alert >}}

希望这篇指南能帮助你写出更加清晰优雅的技术博客文章！
`,
    rawContent: '',
    lastModified: '2026-09-01T10:15:00+08:00',
  },
  {
    id: 'content/posts/draft-ai-assisted-writing.md',
    name: 'draft-ai-assisted-writing.md',
    path: 'content/posts/draft-ai-assisted-writing.md',
    sha: 'mock-sha-3c4d5e6f7g',
    frontMatter: {
      title: '【草稿】构建高效的个人知识管理与博客工作流',
      date: '2026-09-02T18:00:00+08:00',
      draft: true,
      tags: ['PKM', '知识管理', '工作流'],
      categories: ['个人成长'],
      slug: 'personal-knowledge-workflow-draft',
      summary: '思考如何将日常笔记、碎片思考与 Hugo 深度长文进行有机串联，形成良性输入输出闭环。',
      author: 'Hugo Master',
      toc: true,
    },
    content: `## 思考框架

这篇内容尚在撰写和梳理中，目前状态为 **Draft（草稿）**。

在 Hugo 中，草稿文章默认在正式编译（\`hugo\`）时不会被输出到生产站点，只有在本地运行 \`hugo server -D\` 时才会渲染。

### 待梳理提纲
- [ ] 知识输入管道：RSS、论文与技术周刊
- [ ] 知识加工：原子笔记与卡片盒笔记法
- [ ] 知识输出：从日常小记到 Hugo 博客系统性发帖
- [ ] 自动化流水线：基于 GitHub Actions 的一站式分发

编辑完成后，只需在右侧或顶部的 Front Matter 属性栏中将 **“草稿状态 (Draft)”** 开关关闭，即可在下次部署时正式发布至线上！
`,
    rawContent: '',
    lastModified: '2026-09-02T18:00:00+08:00',
  },
];

export const MOCK_WORKFLOW_RUNS: GitHubWorkflowRun[] = [
  {
    id: 910245678,
    name: 'Deploy Hugo site to Pages',
    status: 'completed',
    conclusion: 'success',
    html_url: 'https://github.com',
    created_at: '2026-09-02T19:45:12Z',
    updated_at: '2026-09-02T19:46:08Z',
    run_number: 42,
    event: 'push',
    head_branch: 'main',
    head_commit: {
      id: 'f820ae1',
      message: 'content(posts): update "Hugo 静态博客与 GitHub Actions 自动化部署指南"',
      timestamp: '2026-09-02T19:45:00Z',
      author: {
        name: 'Hugo Publisher',
        email: 'chz2001@126.com',
      },
    },
  },
  {
    id: 909112345,
    name: 'Deploy Hugo site to Pages',
    status: 'completed',
    conclusion: 'success',
    html_url: 'https://github.com',
    created_at: '2026-09-01T10:18:22Z',
    updated_at: '2026-09-01T10:19:15Z',
    run_number: 41,
    event: 'push',
    head_branch: 'main',
    head_commit: {
      id: 'a38c921',
      message: 'content(posts): add "Hugo 文章排版设计与 Shortcodes 效率实战"',
      timestamp: '2026-09-01T10:18:00Z',
      author: {
        name: 'Hugo Publisher',
        email: 'chz2001@126.com',
      },
    },
  },
];
