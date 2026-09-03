import React, { useEffect, useState } from 'react';
import {
  X,
  Rocket,
  Github,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  ArrowRight,
  Sparkles,
  FolderGit2,
} from 'lucide-react';
import { GitHubConfig } from '../types';
import {
  getAuthenticatedUser,
  createGitHubRepository,
  commitFilesToRepository,
  CreatedRepoInfo,
} from '../services/githubApi';
import { buildBlogScaffoldFiles, computeBaseURL } from '../services/blogScaffold';

interface BlogWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  onSaveConfig: (newConfig: GitHubConfig) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const DOC_GUIDE_URL =
  'https://github.com/DanZai233/Hugo-Post-Manager/blob/main/docs/hugo-blog-deploy-guide.md';
const DOC_THEME_URL =
  'https://github.com/DanZai233/Hugo-Post-Manager/blob/main/docs/hugo-theme-guide.md';

type Phase = 'form' | 'creating' | 'done';

export const BlogWizardModal: React.FC<BlogWizardModalProps> = ({
  isOpen,
  onClose,
  token,
  onSaveConfig,
  onShowToast,
}) => {
  const [phase, setPhase] = useState<Phase>('form');
  const [owner, setOwner] = useState<string>('');
  const [accountLoading, setAccountLoading] = useState(false);

  const [repoName, setRepoName] = useState('');
  const [siteTitle, setSiteTitle] = useState('我的博客');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [created, setCreated] = useState<CreatedRepoInfo | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPhase('form');
      setError(null);
      setCreated(null);
      // 用 Token 拉取账号名(用于提示默认域名)
      if (token && token.trim()) {
        setAccountLoading(true);
        getAuthenticatedUser(token)
          .then((u) => {
            setOwner(u.login);
            setRepoName((prev) => prev || `${u.login}.github.io`);
          })
          .catch(() => {
            /* 拉取失败不阻塞,创建时再报错 */
          })
          .finally(() => setAccountLoading(false));
      } else {
        setOwner('');
      }
    }
  }, [isOpen, token]);

  if (!isOpen) return null;

  const hasToken = Boolean(token && token.trim());

  const handleCreate = async () => {
    if (!hasToken) {
      setError('请先在右上角「仓库配置」中填写带 repo 权限的 GitHub Token,再使用本向导。');
      return;
    }
    const name = repoName.trim();
    if (!name) {
      setError('请填写仓库名。');
      return;
    }
    if (!/^[A-Za-z0-9_.-]+$/.test(name)) {
      setError('仓库名只能包含字母、数字、点、下划线与连字符。');
      return;
    }
    setError(null);
    setPhase('creating');
    try {
      const createdRepo = await createGitHubRepository({
        token,
        name,
        description: description.trim(),
        isPrivate,
      });
      const files = buildBlogScaffoldFiles({
        owner: createdRepo.owner,
        repoName: createdRepo.repo,
        siteTitle: siteTitle.trim() || '我的博客',
        description: description.trim(),
      });
      await commitFilesToRepository(
        {
          token,
          owner: createdRepo.owner,
          repo: createdRepo.repo,
          branch: createdRepo.defaultBranch,
          postsDir: 'content/post',
          staticDir: 'static/images',
          isConfigured: true,
          useMock: false,
        },
        files,
        'chore: initialize Hugo blog (Stack theme + GitHub Pages)'
      );
      setCreated(createdRepo);
      setPhase('done');
      onShowToast(`博客仓库 ${createdRepo.fullName} 已创建并写入脚手架!`, 'success');
    } catch (e: any) {
      setPhase('form');
      setError(e?.message || '创建失败,请检查网络后重试。');
    }
  };

  const handleConnect = () => {
    if (!created) return;
    onSaveConfig({
      token,
      owner: created.owner,
      repo: created.repo,
      branch: created.defaultBranch,
      postsDir: 'content/post',
      staticDir: 'static/images',
      isConfigured: true,
      useMock: false,
    });
    onShowToast(`已连接 ${created.fullName},正在读取示例文章...`, 'info');
    onClose();
  };

  const pagesUrl = created ? `${created.htmlUrl}/settings/pages` : '';
  const actionsUrl = created ? `${created.htmlUrl}/actions` : '';
  const siteUrl = created ? computeBaseURL(created.owner, created.repo) : '';
  const isUserSite = created ? created.repo.toLowerCase() === `${created.owner.toLowerCase()}.github.io` : false;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-[#0b1120] rounded-2xl shadow-2xl border border-slate-800 text-slate-300 w-full max-w-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 text-white shadow-lg shadow-emerald-600/20">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-white text-base">从零创建 Hugo 博客仓库</h2>
              <p className="text-xs text-slate-400">3 步完成:建仓库 → 写入脚手架 → 连接本管理器,主题与自动部署全部配好</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 text-xs space-y-4 pr-3">
          {!hasToken && phase === 'form' && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3.5 text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">还没配置 GitHub Token</p>
                <p className="mt-0.5 text-rose-200/80">
                  创建仓库需要带 <code className="font-mono">repo</code> 权限的 Token。请先关闭本窗口,点右上角「仓库配置」填入 Token 后再来。
                </p>
              </div>
            </div>
          )}

          {phase === 'form' && (
            <>
              {/* 步骤说明 */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { n: '1', t: '填信息创建仓库' },
                  { n: '2', t: '自动写入 Hugo 脚手架' },
                  { n: '3', t: '开启 Pages 即可上线' },
                ].map((s) => (
                  <div key={s.n} className="bg-slate-900/70 border border-slate-800 rounded-xl p-2.5 text-center">
                    <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-bold">{s.n}</span>
                    <p className="mt-1 text-[11px] text-slate-300">{s.t}</p>
                  </div>
                ))}
              </div>

              {/* 表单 */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <FolderGit2 className="w-3.5 h-3.5 text-indigo-400" />
                    仓库名(GitHub 上显示的访问地址)
                  </label>
                  <input
                    type="text"
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    placeholder={owner ? `${owner}.github.io` : 'your-blog'}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                    💡 想要 <code className="font-mono text-indigo-300">{owner ? `${owner}.github.io` : '<用户名>.github.io'}</code>{' '}
                    这样的主域名,仓库名就填它;否则站点会挂在 <code className="font-mono">/仓库名/</code> 子路径下。
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">博客标题</label>
                    <input
                      type="text"
                      value={siteTitle}
                      onChange={(e) => setSiteTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">一句话简介(可选)</label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="分享技术、生活与想法"
                      className="w-full px-3 py-2 text-xs bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2">
                  <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="accent-indigo-500" />
                  <span className="text-xs">
                    创建为私有仓库
                    <span className="text-slate-500 ml-1">(免费版 GitHub Pages 只支持公开仓库;私有博客需要 Vercel/其他托管)</span>
                  </span>
                </label>

                {/* 生成内容预览 */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-[11px] leading-relaxed text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    会自动写入以下文件(单个 commit):
                  </p>
                  <p className="font-mono text-slate-400">
                    hugo.yaml · config/_default/params.yaml · archetypes/default.md · content/post/hello-world/index.md ·
                    .github/workflows/deploy.yaml(自动部署)· README.md
                  </p>
                  <p>
                    主题内置 <b className="text-slate-200">hugo-theme-stack</b>(与你同款),CI 构建时自动拉取;
                    部署走 GitHub Pages 官方 Actions,只需手动开启一次 Pages。
                  </p>
                </div>

                {error && (
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2.5 text-rose-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="break-all leading-relaxed">{error}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {phase === 'creating' && (
            <div className="py-10 flex flex-col items-center justify-center gap-3 animate-fade-in">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
              <p className="text-slate-300 font-medium text-sm">正在创建仓库并写入脚手架...</p>
              <p className="text-slate-500 text-[11px]">创建仓库 → 写入 Hugo 配置/示例文章/Actions 工作流</p>
            </div>
          )}

          {phase === 'done' && created && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-emerald-300 font-semibold text-sm">仓库已创建: {created.fullName}</p>
                  <p className="text-slate-400 text-[11px] mt-1">
                    脚手架已写入,仓库推送已触发 Actions;站点地址预计为 <span className="font-mono text-indigo-300">{siteUrl}</span>
                    {isUserSite ? '(用户主页)' : '(项目子路径)'}
                  </p>
                </div>
              </div>

              {/* 部署清单 */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <p className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                  <Rocket className="w-4 h-4 text-emerald-400" />
                  部署前请完成这 2 步(第一次才需要)
                </p>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center shrink-0 font-bold">1</span>
                    <div className="text-[11px] leading-relaxed flex-1">
                      <p className="text-slate-200">
                        打开{' '}
                        <a href={pagesUrl} target="_blank" rel="noreferrer" className="text-indigo-300 underline inline-flex items-center gap-0.5">
                          Settings → Pages <ExternalLink className="w-3 h-3" />
                        </a>{' '}
                        把 <b className="text-amber-300">Build and deployment → Source</b> 设为{' '}
                        <b className="text-amber-300">GitHub Actions</b>,保存
                      </p>
                      <p className="text-slate-500 mt-0.5">不设这一步,Actions 会一直失败(configure-pages 需要 Pages 已开启)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center shrink-0 font-bold">2</span>
                    <div className="text-[11px] leading-relaxed flex-1">
                      <p className="text-slate-200">
                        到{' '}
                        <a href={actionsUrl} target="_blank" rel="noreferrer" className="text-indigo-300 underline inline-flex items-center gap-0.5">
                          Actions <ExternalLink className="w-3 h-3" />
                        </a>{' '}
                        等「Deploy Hugo site to Pages」变绿(首次若已失败,设置完 Pages 后点
                        <b className="text-amber-300"> Re-run jobs</b> 重跑一次即可)
                      </p>
                      <p className="text-slate-500 mt-0.5">之后每次「同步并部署」都会自动重新构建发布</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 配置入口速查 */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <p className="font-semibold text-slate-200 text-xs mb-2 flex items-center gap-1.5">
                  <Github className="w-4 h-4 text-indigo-400" />
                  搭建好了,去哪里改样式与主题?(都在仓库 config/ 目录)
                </p>
                <div className="text-[11px] space-y-1.5">
                  <p><span className="font-mono text-indigo-300">hugo.yaml</span> — 站点标题 / 域名(baseURL) / 语言 / 链接格式</p>
                  <p><span className="font-mono text-indigo-300">config/_default/params.yaml</span> — 描述 / 侧边栏头像与昵称 / 首页小组件 / 明暗主题 / 评论</p>
                  <p><span className="font-mono text-indigo-300">config/_default/menu.yaml</span> — 导航菜单与社交链接(可新建)</p>
                  <p><span className="font-mono text-indigo-300">.github/workflows/deploy.yaml</span> — 自动部署流水线(Hugo 版本等)</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={DOC_GUIDE_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600/15 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/25 transition-colors">
                    完整部署教程(建站 → Actions → Pages) <ExternalLink className="w-3 h-3" />
                  </a>
                  <a href={DOC_THEME_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-fuchsia-600/15 border border-fuchsia-500/30 text-fuchsia-300 hover:bg-fuchsia-600/25 transition-colors">
                    主题配置教程(Stack:外观/头像/菜单/评论) <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
          {phase === 'form' && (
            <>
              <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-200 transition-colors">
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={!hasToken || !repoName.trim()}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 disabled:opacity-40 transition-all"
              >
                <Rocket className="w-4 h-4" />
                创建仓库并写入脚手架
              </button>
            </>
          )}
          {phase === 'creating' && <span className="text-xs text-slate-500 mx-auto">{accountLoading ? '' : '请稍候,通常几秒完成...'}</span>}
          {phase === 'done' && created && (
            <>
              <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-200 transition-colors">
                稍后再说
              </button>
              <button
                onClick={handleConnect}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
              >
                连接此仓库到管理器 <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
