# 新 Hugo 博客仓库脚手架

用这套文件 + 几步命令,就能从零初始化一个「Hugo + Stack 主题 + GitHub Actions 自动部署 +
GitHub Pages」的博客仓库。详细图文教程请看仓库根目录的 `docs/hugo-blog-deploy-guide.md`。

## 使用步骤

```bash
# 1. 建目录并初始化(仓库名建议 <你的GitHub用户名>.github.io)
mkdir <你的GitHub用户名>.github.io && cd <你的GitHub用户名>.github.io
git init -b main

# 2. 把本模板所有文件拷贝进来(注意包含隐藏文件 .github/ 与 .gitignore)
cp -R path/to/docs/new-hugo-blog-template/. .

# 3. 拉取主题(git submodule)
git submodule add https://github.com/CaiJimmy/hugo-theme-stack.git themes/hugo-theme-stack

# 4. 全局替换占位符:<你的GitHub用户名>
#    - hugo.yaml 的 baseURL
#    - .github/workflows/deploy.yaml 的 --baseURL

# 5. 本地预览验证
hugo server -D      # http://localhost:1313

# 6. 首次提交并推送(需要先在 GitHub 建同名空仓库)
git add -A
git commit -m "feat: init hugo blog"
git remote add origin git@github.com:<你的GitHub用户名>/<你的GitHub用户名>.github.io.git
git push -u origin main
```

## 推送后的三步收尾

1. 等 Actions 第一次跑完(仓库 Actions 页面看到绿色)。
   - 若失败,先到 `Settings → Actions → General → Workflow permissions` 改为 **Read and write**。
2. `Settings → Pages` → Source 选 **Deploy from a branch** → 分支选 `gh-pages` / `(root)`。
3. 打开 `https://<你的GitHub用户名>.github.io` 验收(首次可能有 1~2 分钟延迟)。

自定义域名:`static/CNAME` 写一行域名(如 `blog.example.com`),DNS 加 CNAME 记录指向
`<你的GitHub用户名>.github.io`,再把 deploy.yaml 的 `--baseURL` 改成你的域名。

## 文件说明

| 文件 | 作用 |
|---|---|
| `hugo.yaml` | 站点基础配置(Hugo ≥0.128 结构,可拆成 config/_default/) |
| `archetypes/default.md` | `hugo new` 的文章模板 |
| `.github/workflows/deploy.yaml` | GitHub Actions:构建并推送到 gh-pages 分支 |
| `content/post/hello-world/index.md` | 第一篇示例文章(Page Bundle 写法) |
| `.gitignore` | 忽略 Hugo 构建产物 |

之后把本仓库接入 Hugo Post Manager 在线管理:
仓库配置里填 Owner / Repo / 分支 main / 文章目录 `content/post`,即可在线编辑与一键部署。
