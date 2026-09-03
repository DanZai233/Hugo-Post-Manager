# Hugo Post Manager(Hugo Studio)

一个可视化管理 Hugo 博客的 Web 应用:**在线浏览/编辑 Markdown 文章、Front Matter 可视化配置、
实时预览、图片上传、一键提交到 GitHub 并触发 Actions 自动部署**,内置一套
**可自定义人设的 AI 写作助手**——支持配置主流大模型 API Key,分析你的文章提炼写作风格,
陪你聊天把文章写完。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDanZai233%2FHugo-Post-Manager&project-name=hugo-post-manager&repository-name=Hugo-Post-Manager)

> ⚡ 点上面的按钮,一键把本应用部署到你自己的 Vercel 账号(免费),浏览器打开即可用。
> 完整步骤见下方「[一键部署到 Vercel](#-一键部署到-vercel)」。

## ✨ 功能一览

### 文章管理
- **从零创建博客向导**:没有博客仓库?点「仓库配置」里的绿色横幅,填个名字即自动创建 GitHub 仓库并写入
  Hugo 脚手架(Stack 主题 + Actions 自动部署 + 示例文章),3 步上线
- 连接任意 Hugo 博客 GitHub 仓库(支持 `content/posts/*.md` 单文件与 `content/post/<slug>/index.md` Page Bundle 两种结构)
- 文章列表 / 新建 / 复制 / 删除 / 重置(恢复远端版本),本地草稿缓存
- 内置演示数据,未连仓库也能完整体验(演示模式)

### 编辑器
- Markdown 编辑 + 实时预览 双栏布局;Front Matter 可视化面板(标题/日期/分类/标签/slug/封面…)
- 图片上传自动生成 Hugo `figure` 短代码;Git 提交预览与 diff 对比

### AI 写作助手(右侧抽屉,可自定义)
- **人设自由配置**:助手的名字、性格(内置 5 套性格模板)、对你的称呼、额外写作规则
- **写作风格分析**:选中你的一篇文章点「分析本文写作风格」,AI 提炼作者的性格侧写、
  用词/句式/结构习惯等画像,一键写入助手人设——之后让它「按我的风格写 / 续写 / 润色」都会模仿你的文风
- **对话创作**:流式聊天(打字机效果),支持实时停止;快捷动作:续写本文 / 列大纲 / 起 5 个标题 /
  润色全文 / 写 TL;DR / 挑错别字;回复可一键「插入正文」
- **主流 API Key 配置**:DeepSeek / OpenAI / Claude / Gemini / Kimi / 通义千问 / 智谱 GLM /
  火山方舟(豆包) / Grok / Groq / Mistral / 硅基流动 / Ollama(本地免 Key) / 任意 OpenAI 兼容端点;
  可「拉取该厂商真实模型列表」并做连通性测试
- 统一接入 [unillm-sdk](https://github.com/DanZai233/unillm-sdk)(14 家厂商一个包)

### 原有 AI 工具箱
- 一键生成 Hugo Front Matter(标题方案/摘要/分类/标签/slug)
- 标题灵感工坊、导语摘要提炼、Markdown 排版润色 —— 同样已切换到 unillm-sdk,跟随你的模型配置

### 部署联动
- Actions 运行状态实时监控(轮询 GitHub API);「同步并部署」一键提交并触发流水线

---

## ⚡ 一键部署到 Vercel

**先回答一个常见疑问:这个项目「有后端吗」?**

> 有,但很轻——根目录 `app.ts` 是一个 Express 应用,只负责两类事情:
> ① 代理 AI 大模型请求(浏览器直连 DeepSeek/OpenAI 等会被 CORS 拦截,且 Key 会暴露);
> ② GitHub 仓库连通性探测。其余(文章读写、Git 提交、Actions 监控)都是浏览器直连 GitHub API。
>
> 部署到 Vercel 后,这个 Express 后端会自动变成一个 **Serverless Function**
> (`api/index.ts` 导出整个应用),前端 Vite 产物由 Vercel CDN 托管,完全免费可用。
> 不建议改成纯静态方案:那样 AI Key 只能放进浏览器,既暴露又过不了 CORS。

### 方式一:一键按钮(推荐)

点击 README 顶部的 **Deploy with Vercel** 按钮(或下面的链接),用 GitHub 账号授权即可:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDanZai233%2FHugo-Post-Manager&project-name=hugo-post-manager&repository-name=Hugo-Post-Manager)

它会自动:导入本仓库 → 识别 `vercel.json` → 安装依赖(bun)→ 构建前端(`vite build`)→
把 `dist/` 发布为静态站点、把 `api/index.ts` 发布为 Serverless Function。

> 仓库为**私有**时按钮无法直接导入,请在 [Vercel 控制台](https://vercel.com/new) 选择
> GitHub 仓库导入(首次需安装 Vercel GitHub App 并授权该仓库),或直接用下方 CLI。

### 方式二:命令行(Vercel CLI)

```bash
npm i -g vercel
vercel login
vercel          # 首次运行按提示关联项目;以后 vercel --prod 直接发布
```

### 部署后需要做的 3 件事

1. **配置 AI 环境变量**(推荐):进入 Vercel 项目
   `Settings → Environment Variables`,按需添加(任选一种风格):

   | 变量 | 示例值 | 说明 |
   |---|---|---|
   | `HPM_AI_PROVIDER` | `deepseek` | 厂商 ID(openai/anthropic/gemini/deepseek/moonshot/qwen/zhipu/xai/groq/mistral/siliconflow/ollama/custom) |
   | `HPM_AI_API_KEY` | `sk-xxxx` | 对应厂商的 Key |
   | `HPM_AI_MODEL` | `deepseek-chat` | 默认模型(可留空) |
   | `UNILLM_PROVIDER` / `UNILLM_API_KEY` | 同上 | unillm 通用变量,效果等价 |
   | `DEEPSEEK_API_KEY` 等厂商变量 | `sk-xxxx` | 直接写厂商变量也行 |

   不配环境变量也能用:部署后在网页「写作助手 → 模型服务」里手动填 Key
   (只存在你浏览器 localStorage)——适合个人自用。
2. **重跑一次部署**(环境变量改动后 `Redeploy`,或下次 push 自动生效)。
3. 打开 Vercel 分配的域名(形如 `hugo-post-manager.vercel.app`)即可使用;
   点右上角「仓库配置」连接你的 Hugo 博客仓库。

### 架构与注意事项

- **前后端同仓**:`app.ts`(路由)+ `api/index.ts`(Vercel 函数入口,`export default app`)。
  本地开发不受影响:`bun run dev` 走 `server.ts` 的 Vite 中间件;`bun run build && bun run start`
  走本地静态托管;Vercel 上 Express 的静态服务不生效(由 CDN 托管),这是设计使然。
- **函数时长**:Vercel Hobby 单函数最长 **60s**(已写进 `vercel.json` 的 `functions.maxDuration`),
  助手流式对话在 60s 内可返回;更长生成可升级 Pro 或改用非流式(服务端会自动兜底为普通 JSON)。
- **SSE 流式**:Vercel Node 函数支持流式响应,聊天打字机效果可用;
  若个别网络环境下流被缓冲,客户端会等完整响应后一次性展示,不影响使用。
- **GitHub Token / AI Key 安全性**:存放于浏览器 localStorage 的 Key 仅随请求发给**你自己的**
  部署(HTTPS);多人共用部署时建议改用 Vercel 环境变量,网页端留空。
- **本应用的部署 ≠ 你的博客部署**:这里部署的是「管理工具」;你的 Hugo 博客仍部署在 GitHub
  Pages(见 [部署指南](docs/hugo-blog-deploy-guide.md)),两者互相独立。

---

## 🚀 本地快速开始

```bash
# 需要 bun(或 npm)与 Node >= 18
bun install

# 本地开发(http://localhost:3000)
bun run dev

# 生产构建与启动(自托管用)
bun run build
bun run start
```

打开 http://localhost:3000 后:

1. 点顶栏 **写作助手** → 配置助手名字/性格/对你的称呼;
2. 同窗口「模型服务」标签页:选择厂商、填 API Key、点「测试连接」(或直接用环境变量);
3. 点 **仓库配置** 连接你的博客仓库(可先点示例仓库 `DanZai233/DanZai233.github.io` 体验);
4. 选中一篇文章,让助手「分析本文写作风格」,然后尽情聊天写作。

### AI Key 的三种配置方式(任选其一,优先级从高到低)

| 方式 | 适用场景 |
|---|---|
| 设置页「手动填写 API Key」 | 个人自用,Key 只存浏览器 localStorage |
| 服务器 `.env`(本地)/ Vercel 环境变量(HPM_AI_* / UNILLM_* / 厂商变量) | 部署后全站共用一份 Key |
| 旧版 `GEMINI_API_KEY` | 存量部署零改名迁移(自动识别为 Gemini 厂商) |

`.env` 变量说明见 `.env.example`;厂商与优先级细节见 [unillm-sdk](https://github.com/DanZai233/unillm-sdk)。

## 📖 文档

| 文档 | 内容 |
|---|---|
| [docs/hugo-blog-deploy-guide.md](docs/hugo-blog-deploy-guide.md) | **详细指南**:从零初始化空 Hugo 仓库 → 配置 GitHub Actions → GitHub Pages 上线 → 自定义域名(以 DanZai233.github.io 真实博客为实例) |
| [docs/hugo-theme-guide.md](docs/hugo-theme-guide.md) | **主题配置详解**(Stack):外观/侧边栏/头像/导航菜单/社交链接/代码高亮/评论 giscus/自定义样式逐字段讲解 |
| [docs/new-hugo-blog-template/](docs/new-hugo-blog-template/) | **开箱即用的空 Hugo 仓库脚手架**:hugo.yaml + Actions workflow + 示例文章,拷贝即可起步 |
| [.env.example](.env.example) | AI 服务与端口等全部环境变量说明 |
| [unillm-sdk](https://github.com/DanZai233/unillm-sdk) | 底层统一大模型接入包,含 Dashboard 可视化配置 |

## 🔑 连接你的博客仓库

1. 点顶栏 **仓库配置**(或右上角「连接 GitHub」);
2. 填写 Owner(你的 GitHub 用户名)、Repo(如 `DanZai233.github.io`)、分支(默认 `main`)、
   文章目录(Page Bundle 仓库填 `content/post`,普通仓库填 `content/posts`);
3. 只读体验公开仓库可留空 Token;要提交文章触发部署,需要生成一个带 `repo` + `workflow` 权限的
   [Personal Access Token](https://github.com/settings/tokens/new?scopes=repo,workflow&description=Hugo%20Studio)
   (仓库是私有则必须);
4. 点「测试连接」确认,保存后自动拉取文章列表。

> 博客仓库要能自动部署,需要先在里面配置 `.github/workflows/deploy.yaml` 并在 GitHub Pages
> 设置里开启——照 [部署指南](docs/hugo-blog-deploy-guide.md) 一步步做即可,两分钟搞定。

## 🛠 技术栈与工程结构

React 19 + TypeScript + Vite 6 + TailwindCSS 4 · Express 4 · js-yaml · react-markdown ·
lucide-react · [unillm-sdk](https://github.com/DanZai233/unillm-sdk)(零依赖统一大模型接入)

```
app.ts               # Express 应用本体(所有 /api 路由,本地与 Vercel 共用)
server.ts            # 本地启动器:Vite 开发中间件 / dist 静态托管 + 监听端口
api/index.ts         # Vercel Serverless Function 入口(导出 app.ts)
ai-backend.ts        # 统一大模型接入层(unillm-sdk,14 家厂商)
vercel.json          # Vercel 部署配置(构建命令 / 函数时长 / API 重写)
src/                 # React 前端(编辑器 / 写作助手 / 各类面板)
docs/                # Hugo 博客部署指南 + 空仓库脚手架
```

## ✅ 验证命令

```bash
bun run lint         # tsc --noEmit 类型检查
bun run build        # vite build + esbuild 打包本地服务端
bun run build:vercel # 仅 vite build(Vercel 使用的构建命令)
```

## 📝 许可

MIT — 自由使用、修改与分发。文章内容版权归作者本人所有。
