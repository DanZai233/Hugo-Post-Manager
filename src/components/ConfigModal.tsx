import React, { useState, useEffect } from 'react';
import {
  X,
  Github,
  Key,
  FolderGit2,
  GitBranch,
  Folder,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Info,
  Radio
} from 'lucide-react';
import { GitHubConfig } from '../types';
import { testGitHubConnection } from '../services/githubApi';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GitHubConfig;
  onSaveConfig: (newConfig: GitHubConfig) => void;
  onResetToDemo: () => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onResetToDemo,
}) => {
  const [formData, setFormData] = useState<GitHubConfig>({ ...config });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
    details?: any;
  } | null>(null);

  // Sync formData whenever modal opens or external config changes
  useEffect(() => {
    if (isOpen) {
      setFormData({ ...config });
      setTestResult(null);
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    // 1. Try server-side validation first
    try {
      const serverRes = await fetch('/api/github/test-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: formData.owner?.trim(),
          repo: formData.repo?.trim(),
          branch: formData.branch?.trim() || 'main',
          token: formData.token?.trim(),
          postsDir: formData.postsDir?.trim() || 'content/posts',
        }),
      });

      if (serverRes.ok) {
        const data = await serverRes.json();
        if (data.success) {
          setTestResult({
            success: true,
            message: `连接成功！已找到仓库 ${data.repo} (${data.isPrivate ? '私有仓库' : '公开仓库'})，在 "${data.cleanPostsDir}" 目录下发现 ${data.postsCount} 篇 Hugo 文章。${data.hasWorkflowRuns ? ` 探测到 ${data.runsCount} 次 Actions 部署记录。` : ''}`,
            details: data,
          });
          setTesting(false);
          return;
        } else {
          setTestResult({
            success: false,
            message: data.error || '连接测试未通过',
          });
          setTesting(false);
          return;
        }
      }
    } catch {
      // Fallback to client-side test
    }

    // 2. Client-side fallback test
    const res = await testGitHubConnection(formData);
    if (res.success) {
      setTestResult({
        success: true,
        message: `连接成功！已找到仓库 ${res.repoName}，在 "${formData.postsDir}" 目录下发现 ${res.postsCount} 篇 Markdown 文章。`,
      });
    } else {
      setTestResult({
        success: false,
        message: res.error || '连接测试失败，请检查 Owner/Repo 或 Token 权限。',
      });
    }
    setTesting(false);
  };

  const handleSave = () => {
    const hasRepo = Boolean(formData.owner?.trim() && formData.repo?.trim());
    const isConfigured = hasRepo;
    const useMock = !hasRepo;

    onSaveConfig({
      ...formData,
      owner: formData.owner?.trim() || '',
      repo: formData.repo?.trim() || '',
      branch: formData.branch?.trim() || 'main',
      postsDir: formData.postsDir?.trim() || 'content/posts',
      staticDir: formData.staticDir?.trim() || 'static/images',
      token: formData.token?.trim() || '',
      isConfigured,
      useMock,
    });
    onClose();
  };

  // Quick preset loader
  const handleLoadHugoExample = (
    owner: string,
    repo: string,
    branch: string,
    postsDir: string,
    staticDir: string = 'static/images'
  ) => {
    setFormData((prev) => ({
      ...prev,
      owner,
      repo,
      branch,
      postsDir,
      staticDir,
    }));
    setTestResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-[#0b1120] rounded-2xl shadow-2xl border border-slate-800 text-slate-300 max-w-xl w-full p-6 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-white text-base">配置真实 GitHub 仓库</h2>
              <p className="text-xs text-slate-400">
                支持连接个人 Hugo 博客仓库，实时读取并编辑 Markdown 文章，并触发 Actions 自动化部署
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <div className="py-4 space-y-4 text-sm max-h-[70vh] overflow-y-auto pr-1">
          {/* Quick presets for testing */}
          <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-3 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>快速填入示例仓库进行真实体验：</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleLoadHugoExample('DanZai233', 'DanZai233.github.io', 'main', 'content/post', 'static/img')}
                className="px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 font-mono text-[11px] transition-colors flex items-center gap-1"
              >
                <span>⭐ DanZai233 博客 (Page Bundle)</span>
              </button>
              <button
                type="button"
                onClick={() => handleLoadHugoExample('gohugoio', 'hugoDocs', 'master', 'content/en', 'static/images')}
                className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-mono text-[11px] transition-colors"
              >
                Hugo 官方文档 (gohugoio/hugoDocs)
              </button>
              <button
                type="button"
                onClick={() => handleLoadHugoExample('adityatelange', 'hugo-PaperMod', 'exampleSite', 'exampleSite/content/posts', 'exampleSite/static/images')}
                className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-mono text-[11px] transition-colors"
              >
                PaperMod 示例站 (adityatelange/hugo-PaperMod)
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Github className="w-3.5 h-3.5 text-slate-400" />
                  <span>仓库拥有者 (Owner / User)</span>
                  <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="例如: your-github-username"
                  value={formData.owner}
                  onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <FolderGit2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>仓库名称 (Repository)</span>
                  <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="例如: my-hugo-blog"
                  value={formData.repo}
                  onChange={(e) => setFormData({ ...formData, repo: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-400" />
                  <span>GitHub Personal Access Token (PAT)</span>
                  <span className="text-slate-500 text-[11px] font-normal">(私有仓库或提交需填写)</span>
                </label>
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo,workflow&description=Hugo%20Studio"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 underline inline-flex items-center gap-1"
                >
                  <span>获取 Token</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <input
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxx (公开仓库可留空直接体验)"
                value={formData.token}
                onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                若为空且仓库为公开，系统将以只读模式实时拉取并预览；若配置 Token（勾选 <code className="bg-slate-900 px-1 py-0.5 rounded text-indigo-300">repo</code> 权限），可直接同步提交并触发 GitHub Actions 部署。
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-slate-400" />
                  <span>分支 (Branch)</span>
                </label>
                <input
                  type="text"
                  placeholder="main"
                  value={formData.branch}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-slate-400" />
                  <span>文章所在目录 (Posts Dir)</span>
                </label>
                <input
                  type="text"
                  placeholder="content/posts"
                  value={formData.postsDir}
                  onChange={(e) => setFormData({ ...formData, postsDir: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">默认 content/posts 或 content/blog</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-slate-400" />
                <span>图片静态资源目录 (Static Dir)</span>
              </label>
              <input
                type="text"
                placeholder="static/images"
                value={formData.staticDir}
                onChange={(e) => setFormData({ ...formData, staticDir: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Test connection result */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-fade-in ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
              )}
              <div className="space-y-1">
                <p className="font-semibold text-xs">{testResult.success ? 'GitHub 仓库验证成功！' : '仓库连接失败'}</p>
                <p className="leading-relaxed text-[11px]">{testResult.message}</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onResetToDemo();
              onClose();
            }}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-300 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>恢复内置演示数据</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={testing || !formData.owner || !formData.repo}
              onClick={handleTest}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 disabled:opacity-50 transition-colors"
            >
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />}
              <span>{testing ? '正在检测...' : '测试连接'}</span>
            </button>

            <button
              type="button"
              disabled={!formData.owner || !formData.repo}
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>保存并立即加载仓库文章</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
