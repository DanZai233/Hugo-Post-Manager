# Hugo 主题配置详解(以 hugo-theme-stack 为例)

> 配套 [hugo-blog-deploy-guide.md](hugo-blog-deploy-guide.md) 使用:那篇讲「怎么把博客搭起来并部署」,
> 这篇讲「主题装好之后,去哪改外观、导航、头像、评论」。
> 示例值全部取自作者真实博客 [DanZai233/DanZai233.github.io](https://github.com/DanZai233/DanZai233.github.io)。
> 主题官方文档:https://docs.stack.jimmycai.com/

---

## 1. 主题是什么、去哪找

主题 = 整套现成的页面模板 + 样式 + 布局逻辑。Hugo 会把你的 Markdown 文章套进主题模板,生成最终网页。

- **主题市场**:https://themes.gohugo.io/(官方收录站,可按分类/特性筛选)
- 点进任意主题,README 都会写清**安装方法**与**演示站/文档链接**
- 本文主角:**Stack**(hugo-theme-stack,CaiJimmy 出品),单栏文章流风格,中文支持好,作者博客同款
- 其他热门:Hugo-PaperMod(简洁两栏)、LoveIt、Coder、DoIt 等,配置思路一致

## 2. 三种安装方式(选一种即可)

| 方式 | 命令 | 特点 |
|---|---|---|
| **git submodule(推荐,实例做法)** | `git submodule add https://github.com/CaiJimmy/hugo-theme-stack.git themes/hugo-theme-stack` | 主题版本可锁定可升级,仓库自包含 |
| 普通 clone | `git clone --depth 1 https://github.com/CaiJimmy/hugo-theme-stack.git themes/hugo-theme-stack` | 最快,但主题不跟仓库走,换机器要重装 |
| Hugo Module | 在 `hugo.yaml` 声明 `module` + 仓库根 `go.mod` | 构建时自动下载,CI 友好 |

> 主题目录必须放在 `themes/<主题名>/`,并在 `hugo.yaml` 里写 `theme: "<主题名>"`——主题目录名要和 theme 字段一致。
> Hugo Post Manager 的「从零创建博客」向导无法通过 API 建 submodule,所以它生成的仓库在
> CI 里用 `git clone --depth 1` 自动拉主题到 `themes/hugo-theme-stack`;本地想用 submodule 可再执行上面的 add 命令。

**换主题怎么换?** 比如想换 PaperMod:clone 到 `themes/PaperMod` → `hugo.yaml` 的 `theme` 改成 `PaperMod` →
再按新主题 README 拷贝它的 `exampleSite` 配置(每个主题的 params 字段都不一样,别直接沿用 Stack 的)。

## 3. 主题装完后,配置去哪改

主题配置全部集中在站点 `config/` 目录。Stack 主题推荐的目录结构(也兼容单文件 `config.toml`,但强烈建议用目录):

```
config/_default/
├── hugo.yaml      # 站点级:标题/域名/语言/文章链接格式/构建行为
├── params.yaml    # 主题级:外观、侧边栏、首页组件、评论、页脚(90% 的"外观设置"在这里)
├── menu.yaml      # 导航菜单与社交链接
├── markup.yaml    # Markdown 渲染细节(目录、代码高亮、数学公式)
└── related.yaml   # 相关文章(可先不建)
```

> **最快的起步方式**:把主题仓库里的 `exampleSite/config/_default/*` 拷到你的 `config/_default/` 再逐个改;
> 或用 Hugo Post Manager 向导生成的版本,再从下面逐项改成你想要的。

### 3.1 hugo.yaml —— 站点基础(实例值)

```yaml
baseURL: "https://blog.danzaii.cn/"      # 线上根地址;没域名就写 https://<你的用户名>.github.io/
languageCode: "zh-cn"
title: "一只小羊羔的窝"                    # ← 站点名(浏览器标题/页头)
theme: "hugo-theme-stack"                 # ← 主题目录名

defaultContentLanguage: "zh-cn"
hasCJKLanguage: true        # 中文必须开,否则字数统计/摘要截断不准

buildFuture: true           # 允许构建"未来日期"的文章(定时发布场景)

pagination:
  pagerSize: 10             # 首页每页文章数

permalinks:
  post: "/p/:slug/"         # 文章永久链接:https://域名/p/<slug>/
  page: "/:slug/"
```

### 3.2 params.yaml —— 外观与行为(改动最频繁的文件)

以作者实例为模板,逐块说明:

```yaml
mainSections: [post]        # 首页只聚合 content/post/ 下的文章(改成 blog 则聚合 blog 目录)
featuredImageField: "image" # 文章 Front Matter 里 cover.image 即封面
rssFullContent: true        # RSS 输出全文

favicon: "img/avatar.png"   # 浏览器标签小图标(图片放 static/img/ 下)
description: "Dan_Zai 的个人博客,分享技术笔记、开源项目、生活随笔和 AI 开发心得"
blogStartDate: "2021-06-01" # 建站日期(供「运行时长」统计)

sidebar:
  emoji: "🌸"               # 侧边栏头像上方的 emoji
  subtitle: "Dan_Zai | 中之我" # 头像下的副标题(常写一句话签名)
  avatar: "img/avatar.png"  # 头像(assets 或 static 均可,见 5.4)

article:
  headingAnchor: true       # 标题悬停显示锚点链接
  toc: true                 # 文章右侧/顶部目录
  readingTime: true         # 显示阅读时长
  math: false               # 全局是否开数学公式(开的话每篇还能用 front matter math: true 关掉)
  license:
    enabled: true
    default: "Licensed under CC BY-NC-SA 4.0"   # 文章底部版权行

widgets:                    # 首页侧栏组件(可增删、调顺序)
  homepage:
    - type: search          # 搜索
    - type: archives        # 归档(近期)
      params: { limit: 5 }
    - type: categories
      params: { limit: 10 }
    - type: tag-cloud
      params: { limit: 10 }
  page:                     # 文章页侧栏
    - type: toc

colorScheme:
  toggle: true              # 显示明/暗切换按钮
  default: "auto"           # auto=跟随系统,也可 light/dark

comments:                   # 评论区(默认关闭,见第 6 节开 giscus)
  enabled: false
```

### 3.3 menu.yaml —— 导航与社交链接

```yaml
social:                     # 侧边栏底部一排社交图标
  - identifier: github
    name: GitHub
    url: "https://github.com/DanZai233"
    params:
      icon: brand-github    # 图标名来自主题内置图标(可自建,见 5.3)
  - identifier: email
    name: 邮箱
    url: "mailto:danzai233@qq.com"
    params:
      icon: mail
      newTab: true          # 新标签页打开(可选)

main:                       # 顶部主菜单
  - identifier: archives
    name: 归档
    url: /archives/
    weight: -100            # 越小越靠前(支持负数)
  - identifier: about
    name: 关于
    url: /about/
    weight: 90
```

### 3.4 markup.yaml —— 渲染细节(实例值)

```yaml
goldmark:
  extensions:
    passthrough:            # 让 $数学公式$ 原样透传给 KaTeX/MathJax
      enable: true
      delimiters:
        block:  [["\\[", "\\]"], ["$$", "$$"]]
        inline: [["\\(", "\\)"]]
  renderer:
    unsafe: true            # 允许正文里直接写 HTML(谨慎)

tableOfContents:
  startLevel: 2             # 目录从 ## 开始
  endLevel: 4

highlight:
  codeFences: true
  guessSyntax: true
  lineNos: true             # 代码块显示行号
  lineNumbersInTable: true
  tabWidth: 4
```

## 4. 写作时与主题相关的写法

- **新建文章**(Page Bundle,一篇文章一个文件夹,配图资源放同目录最省心):
  ```bash
  hugo new content post/my-post/index.md
  ```
- **封面图 / 摘要** 放在文章 Front Matter:
  ```yaml
  ---
  title: "我的文章"
  date: 2026-09-03T10:00:00+08:00
  draft: false
  cover:
    image: images/cover.png     # 相对本篇文章目录,或 /img/xxx.png 指 static
    alt: "封面说明"
  summary: "首页卡片显示的摘要;不写则自动截取"
  tags: ["Hugo"]
  categories: ["教程"]
  ---
  ```
- **手动截断点**:正文里写 `<!--more-->`,前面部分作为列表页摘要
- **主题短代码**(Stack 内置):`{{< figure src="..." title="..." >}}`、`{{< alert "info" >}}提示{{< /alert >}}`、
  `{{< youtube 视频ID >}}` 等;Hugo Post Manager 的「媒体资源」上传图片后生成的 `figure` 短代码即可直接显示

## 5. 自定义外观(换色/换头像/自建图标)

### 5.1 换主题色 —— assets/scss/custom.scss

Stack 把 CSS 变量集中在 `themes/hugo-theme-stack/assets/scss/variables.scss`。自定义文件放在**你的**
`assets/scss/custom.scss`(同名文件优先于主题,无需改主题源码):

```scss
/* 作者实例:粉色系 */
:root {
  --body-background: #faf6f9;
  --card-background: #ffffff;
  --main-color: #e07a9c;        /* 链接/强调色 */
  --main-accent: #e07a9c;
}
[data-scheme="dark"] {          /* 深色模式单独覆盖 */
  --body-background: #191414;
  --main-color: #f2a9c4;
}
```

改完跑 `hugo server` 刷新即生效。Stack 具体还有哪些变量可改,看主题的 variables.scss 最准。

### 5.2 改布局类细节

侧边栏宽度、头像圆角等 CSS 类名可右键「检查元素」找到后,在 custom.scss 里用
`#site-main .widget { ... }` 这种带 id/class 的选择器覆盖(Stack 顶层容器有稳定 id)。

### 5.3 自建社交图标 —— assets/icons/

菜单里 `icon: brand-qq` 这种名字,对应文件 `themes/hugo-theme-stack/assets/icons/brand-qq.svg`。
想要主题没有的图标(实例里就自建了 brand-qq / photo / train):

1. 拿到一个 SVG(simpleicons.org 之类);
2. 放到**你的** `assets/icons/<名字>.svg`(同名覆盖主题;新名字直接新增);
3. menu.yaml 里 `icon: <名字>` 即可。

### 5.4 头像/背景放哪:assets/ vs static/

| 目录 | 用途 | 引用方式 |
|---|---|---|
| `static/` | 原样复制到站点根,**不经过处理** | `/img/avatar.png` |
| `assets/` | 可被 Hugo Pipes 处理(压缩/指纹/SCSS) | 主题里用 `resources.Get` 引用 |

- 头像/favicon:实例放在 `static/img/avatar.png`,`params.yaml` 写 `avatar: "img/avatar.png"`
- CSS 里的背景图(url('/img/background.jpg'))只能放 static(实例的 background.jpg 在 static/img/)
- 文章封面建议就近放文章 bundle 目录,或用 `/img/xxx` 指 static

## 6. 开启评论(giscus,基于 GitHub Discussions)

1. 仓库 **Settings → General → Discussions** 勾选 Enable(公开仓库)
2. 打开 https://giscus.app/ ,填入你的仓库名,它会引导你安装 **giscus GitHub App** 并授权
3. giscus.app 会自动生成一段配置,把其中的值抄进 `params.yaml`:

```yaml
comments:
  enabled: true
  provider: "giscus"
  giscus:
    repo: "DanZai233/DanZai233.github.io"   # ← 你的仓库
    repoID: "R_kgDOK0SZtw"                   # ← giscus.app 生成
    category: "General"                      # ← 建议先在 Discussions 建一个
    categoryID: "DIC_kwDOK0SZt84C3LU2"       # ← giscus.app 生成
    mapping: "pathname"
    lightTheme: "light"
    darkTheme: "dark_dimmed"
    reactionsEnabled: 1
    emitMetadata: 0
    inputPosition: "top"
    lang: "zh-CN"
    strict: 0
    loading: "lazy"
```

改完刷新文章页即可看到评论框。

## 7. 升级 / 切换主题

```bash
# submodule 方式:更新到主题最新版
git submodule update --remote themes/hugo-theme-stack
# 然后本地预览确认没问题再提交

# 换主题:见第 2 节表格;记得先备份 params.yaml(每个主题参数不通用)
```

## 8. 常见问题

| 症状 | 原因与解决 |
|---|---|
| `error: failed to transform resource: SCSS processing failed` | 用了非 Extended 版 Hugo,换 `hugo_extended_*` 安装 |
| 改了 custom.scss 没反应 | 确认文件路径是 `assets/scss/custom.scss` 且拼写正确;清 `resources/` 缓存重跑 |
| 图标显示成方块/空白 | 主题内置图标集有限,自建图标见 5.3;或 `icon` 名字拼错 |
| 头像不显示 | 检查路径:写 `img/avatar.png` 时文件在 `static/img/avatar.png`(不带前导 /);assets 方式需经 Hugo Pipes |
| 中文摘要截断成半个词/字数不对 | `hugo.yaml` 里 `hasCJKLanguage: true` |
| 改了 config 不生效 | Stack 主题对 config 有缓存,`hugo server` 加 `--disableFastRender` 或重启 |
| 部署后样式错乱 | 构建命令的 `--baseURL` 与 `hugo.yaml` 的 baseURL 不一致 |

## 9. 关联链接

- Stack 官方文档:https://docs.stack.jimmycai.com/
- Stack 主题仓库:https://github.com/CaiJimmy/hugo-theme-stack(exampleSite 里有全套配置示例)
- Hugo 主题市场:https://themes.gohugo.io/
- 作者实例仓库(可直接对照):https://github.com/DanZai233/DanZai233.github.io
