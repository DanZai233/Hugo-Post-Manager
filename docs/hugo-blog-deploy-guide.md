# Hugo 博客从零搭建 + GitHub Actions 自动部署 + GitHub Pages 上线 详细指南

> 面向「Hugo Post Manager」使用者的配套教程:从**初始化一个空的 Hugo 仓库**开始,
> 配置 **GitHub Actions 流水线**,最终通过 **GitHub Pages** 让你的博客可以公开访问。
> 全程以作者的真实博客 [DanZai233/DanZai233.github.io](https://github.com/DanZai233/DanZai233.github.io)(访问地址
> [https://blog.danzaii.cn](https://blog.danzaii.cn))为参照实例——它就是「Hugo + Stack 主题 + GitHub Actions 部署到
> `gh-pages` 分支 + GitHub Pages + 自定义域名」的标准样板。
>
> 仓库里还附带一份**开箱即用的空仓库脚手架**,见 `docs/new-hugo-blog-template/`,
> 拷贝过去改改就能推上 GitHub 开始写博客。

---

## 0. 整体架构

```
你本机 / Hugo Post Manager(在线编辑器)
        │  git push(文章 Markdown 提交到 main 分支)
        ▼
GitHub 仓库 <username>.github.io
        │  触发 .github/workflows/deploy.yaml
        ▼
GitHub Actions(ubuntu-latest)
        ① 安装 Hugo Extended
        ② checkout(含主题 submodule)
        ③ hugo --gc --minify 构建 → public/
        ④ 推送到 gh-pages 分支(或 Pages Artifact)
        ▼
GitHub Pages 静态托管(全球 CDN)
        ▼
https://<username>.github.io / 你的自定义域名
```

- **Hugo**:Go 写的静态站点生成器,把 Markdown 文章编译成纯 HTML,秒级构建、无需数据库。
- **主题**:负责外观。下文用作者同款 [hugo-theme-stack](https://github.com/CaiJimmy/hugo-theme-stack),
  以 **git submodule** 形式引入(仓库自包含、版本可追踪)。想换 PaperMod / LoveIt 思路完全一样。
- **GitHub Actions**:监听 push,自动执行构建并把产物发布到 Pages,实现「写文章 → 自动上线」。
- **GitHub Pages**:GitHub 免费静态托管,默认域名 `https://<username>.github.io`。

---

## 1. 环境准备:安装 Hugo(必须 Extended 版)

Stack 主题依赖 SCSS / TypeScript 编译,**只有 Extended 版才带这些能力**;普通版会在构建时报错。

macOS(Homebrew):

```bash
brew install hugo
hugo version   # 输出应包含 +extended,如 hugo v0.156.0+extended darwin/amd64 ...
```

Linux / CI 服务器(直接下载二进制,与 GitHub Actions 里一致):

```bash
HUGO_VERSION=0.156.0
wget -O /tmp/hugo.tar.gz https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_linux-amd64.tar.gz
tar -xzf /tmp/hugo.tar.gz -C /tmp hugo
sudo mv /tmp/hugo /usr/local/bin/hugo
```

Windows:`winget install Hugo.Hugo.Extended`(或 scoop install hugo-extended)。

> 版本建议 ≥ 0.154.0(Stack 主题当前要求),作者仓库 Actions 里锁定的是 `0.156.0`。

---

## 2. 初始化一个空的 Hugo 仓库

命名规则:**博客仓库名必须是 `<你的GitHub用户名>.github.io`** 才会得到 `https://<用户名>.github.io`
这个默认域名(也可以用其他名字的仓库,然后靠自定义域名访问,但建议照此命名)。

```bash
# 2.1 建目录 + 初始化 git(先不急着推 GitHub)
mkdir my-hugo-blog && cd my-hugo-blog
git init -b main

# 2.2 生成 Hugo 站点骨架(自动创建 config/ content/ archetypes/ themes/ 等目录)
hugo new site .

# 2.3 引入主题(git submodule,便于后面 Hugo 主题版本升级)
git submodule add https://github.com/CaiJimmy/hugo-theme-stack.git themes/hugo-theme-stack

# 2.4 配置站点(见下方 2.5 的 hugo.yaml 内容,粘贴覆盖 config/hugo.toml 或直接新建 config/_default/hugo.yaml)
# 说明:Hugo ≥0.128 推荐把配置文件放 config/_default/hugo.yaml(作者仓库即此结构)
mkdir -p config/_default

# 2.5 新建默认文章模板(archetypes),这样 hugo new 出来的文章自带 Front Matter
```

**2.5 站点配置文件 `config/_default/hugo.yaml`**(参照实例,`baseURL` 记得改成你自己的):

```yaml
baseURL: "https://<你的GitHub用户名>.github.io/"   # 发布后的站点根地址
languageCode: "zh-cn"
title: "我的博客"
theme: "hugo-theme-stack"

defaultContentLanguage: "zh-cn"
hasCJKLanguage: true          # 中文站点必须开:影响字数统计/摘要截断

buildFuture: true

pagination:
  pagerSize: 10

permalinks:
  post: "/p/:slug/"           # 文章固定链接格式
  page: "/:slug/"
```

Stack 主题还可能用到 `params.yaml`(站点描述、头像、社交链接、评论 giscus 等)、`menu.yaml`
(导航菜单)、`markup.yaml`(markdown 渲染配置)、`related.yaml`(相关文章)。最快起步:从
[Stack 主题 exampleSite](https://github.com/CaiJimmy/hugo-theme-stack/tree/master/exampleSite)
拷 `params.yaml` 等文件到 `config/_default/` 再按需改。作者仓库的 `config/_default/` 下有
`hugo.yaml / params.yaml / markup.yaml / menu.yaml / related.yaml` 五个文件,可作参照。

**2.6 默认文章模板 `archetypes/default.md`:**

```yaml
---
title: "{{ replace .Name "-" " " | title }}"
date: {{ .Date }}
draft: true
description: ""
tags: []
categories: []
---
```

**2.7 本地写第一篇文章**(Hugo 的 Page Bundle 风格:一篇文章一个目录,配图/资源放同目录):

```bash
hugo new content post/hello-world/index.md
```

生成 `content/post/hello-world/index.md`,把 `draft: true` 改掉、填上内容,然后:

```bash
hugo server -D            # -D 让草稿也能预览;默认 http://localhost:1313
```

浏览器打开即见效果。满意后提交并推送到 GitHub:

```bash
git add -A
git commit -m "feat: init hugo blog"
git remote add origin git@github.com:<你的GitHub用户名>/<你的GitHub用户名>.github.io.git
git push -u origin main
```

> 实例参照:作者的仓库结构为 `content/post/<slug>/index.md`(Page Bundle),
> Hugo Post Manager 的「文章目录」就填 `content/post`;Manager 兼容单 .md 文件与 Page Bundle 两种。
> 克隆别人带 submodule 的 Hugo 仓库后务必执行 `git submodule update --init --recursive`,否则主题目录是空的。

---

## 3. 配置 GitHub Actions 自动部署

在仓库里新建 `.github/workflows/deploy.yaml`。提供两种方案,**二选一**即可:

### 方案 A:构建后推送到 `gh-pages` 分支(推荐,与实例仓库一致)

Pages 只负责托管 `gh-pages` 分支的内容,main 分支永远只存源码,职责清晰、回滚也简单:

```yaml
name: Deploy Hugo site to GitHub Pages

on:
  push:
    branches:
      - main                # main 分支有 push(包括 Hugo Post Manager 的提交)就触发
  workflow_dispatch:        # 也支持在 Actions 页面手动点「Run workflow」

permissions:
  contents: write           # 关键:允许把构建产物推送到 gh-pages 分支

concurrency:
  group: "pages"
  cancel-in-progress: false # 同一时间只跑一个部署,避免互相覆盖

defaults:
  run:
    shell: bash

jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      HUGO_VERSION: "0.156.0"   # 与本地开发版本保持一致
    steps:
      - name: Install Hugo CLI
        run: |
          wget -O ${{ runner.temp }}/hugo.tar.gz https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_linux-amd64.tar.gz
          tar -xzf ${{ runner.temp }}/hugo.tar.gz -C ${{ runner.temp }}
          sudo mv ${{ runner.temp }}/hugo /usr/local/bin/hugo

      - name: Checkout
        uses: actions/checkout@v4
        with:
          submodules: recursive   # 拉取主题 submodule,否则 themes/ 为空导致构建失败
          fetch-depth: 0

      - name: Build with Hugo
        env:
          HUGO_ENVIRONMENT: production
          TZ: Asia/Shanghai        # 让日期按中国时区生成
        run: |
          hugo --gc --minify --baseURL "https://<你的GitHub用户名>.github.io/"

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}   # GitHub 自动注入,无需自己建 Secret
          publish_dir: ./public                        # Hugo 构建产物目录
          publish_branch: gh-pages                     # 推送到 gh-pages 分支
```

流程拆解(提交到 main 后):

| 步骤 | 做什么 | 失败会怎样 |
|---|---|---|
| `on.push` | 监听 main 分支 push | 不触发则不会部署 |
| `permissions.contents: write` | 授权向 gh-pages 推分支 | 报错 `Permission to ... denied` |
| Install Hugo CLI | 装 Extended 版 Hugo | 版本号写错会 404 |
| Checkout + submodules | 拉代码和主题 | themes 空目录,构建 404 |
| Build with Hugo | `hugo --gc --minify` 产出 `public/` | 文章语法/短代码问题会失败 |
| actions-gh-pages | 把 `public/` 推到 `gh-pages` 分支 | Pages 内容不更新 |

### 方案 B:官方 Pages Artifact 方案(需要 Pages 源选择「GitHub Actions」)

```yaml
name: Deploy Hugo site to Pages

on:
  push:
    branches: ["main"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    env:
      HUGO_VERSION: "0.156.0"
    steps:
      - name: Install Hugo CLI
        run: |
          wget -O ${{ runner.temp }}/hugo.tar.gz https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_linux-amd64.tar.gz
          tar -xzf ${{ runner.temp }}/hugo.tar.gz -C ${{ runner.temp }}
          sudo mv ${{ runner.temp }}/hugo /usr/local/bin/hugo

      - name: Checkout
        uses: actions/checkout@v4
        with:
          submodules: recursive

      - name: Setup Pages
        id: pages
        uses: actions/configure-pages@v5

      - name: Build
        env:
          HUGO_ENVIRONMENT: production
        run: hugo --gc --minify --baseURL "${{ steps.pages.outputs.base_url }}/"

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./public

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

> **方案 A vs B 怎么选**:A 不需要改 Pages 源(选分支即可),Push 行为直观,和作者实例一致;
> B 是 GitHub 官方推荐,但部署前要把
> `Settings → Pages → Build and deployment → Source` 从「Deploy from a branch」改成「GitHub Actions」。

### 3.1 别忘了 Workflow 写权限

`Settings → Actions → General → Workflow permissions` 若为 **Read repository contents and packages
permissions**,方案 A 的 `contents: write` 可能仍被工作流级 `permissions` 覆盖而失效——建议直接改成
**Read and write permissions**(工作流内的 `permissions.contents: write` 仍建议保留)。

### 3.2 与 Hugo Post Manager 的联动

Manager 的「同步并部署」会通过 GitHub API 直接向 main 分支提交文章,天然触发上述 `on.push` 流水线;
Manager 的「Actions 监控」面板会实时显示这次部署的进度与结果。部署完成后文章即上线。

---

## 4. 启用 GitHub Pages 与自定义域名

### 4.1 首次启用(方案 A,分支模式)

1. 先把 `.github/workflows/deploy.yaml` 提交并推送到 GitHub(注意:仓库里还没有 gh-pages 分支时,
   可以先把 workflow 推上去跑一次,或先随便建个 `gh-pages` 空分支)。
2. 打开仓库 `Settings → Pages`:
   - **Build and deployment → Source** 选择 `Deploy from a branch`;
   - **Branch** 选择 `gh-pages` + `/ (root)`,Save。
3. 之后每次 push 到 main,Actions 跑完,访问 `https://<你的GitHub用户名>.github.io` 就是你的博客。
   (首次 DNS/构建可能有 1~2 分钟延迟,刷新即可。)

### 4.2 自定义域名(可选,实例:blog.danzaii.cn)

个人博客用 `<用户名>.github.io` 就够;想要自己的域名:

1. 在仓库 `static/` 下新建 `CNAME` 文件,内容只写一行你的域名,例如:
   ```bash
   echo "blog.danzaii.cn" > static/CNAME
   ```
   Hugo 构建时会把 `static/` 原样拷进 `public/`,域名随之带到 Pages。
2. 到你的 DNS 服务商加一条 **CNAME 记录**:
   | 主机记录 | 记录类型 | 记录值 |
   |---|---|---|
   | blog | CNAME | `<你的GitHub用户名>.github.io` |
3. 回到 `Settings → Pages`,Custom domain 填 `blog.danzaii.cn`,Save 后等待证书签发,
   **勾选 Enforce HTTPS**。
4. 本地构建若发现样式/链接指向旧域名,给构建命令带上
   `--baseURL "https://blog.danzaii.cn/"`(作者 workflow 即这样写死)。

> 实例验证:DanZai233.github.io 仓库 `static/CNAME` 内容为 `blog.danzaii.cn`,
> DNS 为 CNAME `blog → danzai233.github.io`,访问 https://blog.danzaii.cn 生效。

### 4.3 方案 B 的 Pages 设置

若用方案 B,`Settings → Pages → Source` 必须选 **GitHub Actions**(不要选分支),其余一致。

---

## 5. 日常写作与维护

```bash
# 本地草稿预览(含草稿)
hugo server -D --bind 0.0.0.0 --port 1313

# 新建文章(Page Bundle)
hugo new content post/my-new-post/index.md

# 生产构建(验证无误再提交)
hugo --gc --minify

# 升级主题
git submodule update --remote themes/hugo-theme-stack
```

写完后 `git push origin main` → 等待 Actions 变绿 → 刷新博客页面。当然,这一切也可以直接在
**Hugo Post Manager** 里完成:选仓库 → 在线编辑 Markdown + 实时预览 → 「同步并部署」,全程不用命令行。

---

## 6. 常见问题

| 症状 | 原因与解决 |
|---|---|
| `hugo: error: module "hugo-theme-stack" not found` / SCSS 报错 | 主题 submodule 未拉取:`git submodule update --init --recursive`;或装的是非 Extended 版 Hugo |
| Actions 里 `install hugo` 404 | `HUGO_VERSION` 不存在该版本,改成已发布版本;或换 brew/官方 release 下载 |
| 部署失败 `Permission to ... denied to github-actions[bot]` | Workflow 缺写权限:仓库 Settings → Actions → Workflow permissions 设 Read and write;workflow 里 `permissions: contents: write` |
| 部署成功但页面 404 | Pages 源没选对:方案 A 选 `gh-pages` 分支;方案 B 选 `GitHub Actions`;首次可能延迟 1~2 分钟 |
| 文章摘要字数/日期不对 | `hasCJKLanguage: true` 未开;Actions 里加 `TZ: Asia/Shanghai` |
| 本地预览正常、线上样式错乱 | `baseURL` 与 `static/CNAME` 域名不一致,统一后重建 |
| 图片不显示 | 确认图片在 Page Bundle 目录内(同 index.md),或 `static/` 下,引用路径正确 |

---

## 7. 关联文件速查

- 脚手架:本仓库 `docs/new-hugo-blog-template/`(直接拷贝起步)
- 实例仓库:https://github.com/DanZai233/DanZai233.github.io
  - 部署工作流:`~/.github/workflows/deploy.yaml`(方案 A 完整示例)
  - 站点配置:`config/_default/hugo.yaml` 等五个文件
  - 文章目录:`content/post/<slug>/index.md`
  - 自定义样式:`assets/scss/custom.scss`;自定义图标:`assets/icons/`
- Hugo 官方文档:https://gohugo.io/documentation/
- Stack 主题:https://github.com/CaiJimmy/hugo-theme-stack
