import React from 'react';
import {
  FileText,
  Github,
  Play,
  Settings,
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertCircle,
  Image as ImageIcon,
  ExternalLink,
  Radio,
  Bot
} from 'lucide-react';
import { GitHubConfig, GitHubWorkflowRun, HugoPost } from '../types';

interface HeaderProps {
  config: GitHubConfig;
  activePost: HugoPost | null;
  hasUnsavedChanges: boolean;
  latestWorkflowRun: GitHubWorkflowRun | null;
  onOpenSettings: () => void;
  onOpenCommitModal: () => void;
  onOpenActionsModal: () => void;
  onOpenImageModal: () => void;
  onOpenAssistant: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  activePost,
  hasUnsavedChanges,
  latestWorkflowRun,
  onOpenSettings,
  onOpenCommitModal,
  onOpenActionsModal,
  onOpenImageModal,
  onOpenAssistant,
}) => {
  const getWorkflowStatusBadge = () => {
    if (!latestWorkflowRun) {
      return (
        <button
          id="btn-actions-status-empty"
          onClick={onOpenActionsModal}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors"
          title="查看 GitHub Actions 部署状态"
        >
          <Radio className="w-3.5 h-3.5 text-stone-400" />
          <span>Actions 监控</span>
        </button>
      );
    }

    if (latestWorkflowRun.status === 'in_progress' || latestWorkflowRun.status === 'queued') {
      return (
        <button
          id="btn-actions-status-running"
          onClick={onOpenActionsModal}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors animate-pulse"
          title={`GitHub Actions 构建中 (#${latestWorkflowRun.run_number})`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          <span>构建部署中 #{latestWorkflowRun.run_number}</span>
        </button>
      );
    }

    if (latestWorkflowRun.conclusion === 'success') {
      return (
        <button
          id="btn-actions-status-success"
          onClick={onOpenActionsModal}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          title={`最新部署成功 (#${latestWorkflowRun.run_number})`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>部署就绪 #{latestWorkflowRun.run_number}</span>
        </button>
      );
    }

    if (latestWorkflowRun.conclusion === 'failure') {
      return (
        <button
          id="btn-actions-status-failure"
          onClick={onOpenActionsModal}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-colors"
          title={`最新部署失败 (#${latestWorkflowRun.run_number})`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          <span>部署失败 #{latestWorkflowRun.run_number}</span>
        </button>
      );
    }

    return (
      <button
        id="btn-actions-status-default"
        onClick={onOpenActionsModal}
        className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
      >
        <Radio className="w-3.5 h-3.5 text-slate-400" />
        <span>Actions #{latestWorkflowRun.run_number}</span>
      </button>
    );
  };

  return (
    <header id="app-header" className="h-16 border-b border-slate-800 bg-[#0f172a]/90 backdrop-blur px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shrink-0">
      {/* Brand & Project info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-600/20">
            H
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-white text-sm tracking-tight">Hugo Studio</h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Bento v2.2
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Hugo 静态博客在线管理 · 本地实时预览 · GitHub Actions 自动化部署
            </p>
          </div>
        </div>

        {/* Repository status badge */}
        <div className="hidden md:flex items-center ml-2 pl-4 border-l border-slate-800 gap-2">
          {config.isConfigured && !config.useMock ? (
            <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800 font-mono shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <Github className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium text-slate-200">{config.owner}/{config.repo}</span>
              <span className="text-slate-600">/</span>
              <span className="text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded text-[11px] font-semibold">{config.branch}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span>演示示例模式</span>
              <button
                onClick={onOpenSettings}
                className="ml-1 text-indigo-400 hover:text-indigo-300 underline font-mono text-[11px]"
              >
                连接 GitHub
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Actions build monitor badge */}
        {getWorkflowStatusBadge()}

        {/* Upload Static Asset */}
        <button
          id="btn-upload-image-header"
          onClick={onOpenImageModal}
          className="px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-xs flex items-center gap-1.5 border border-transparent hover:border-slate-700"
          title="上传静态资源 (static/images)"
        >
          <ImageIcon className="w-4 h-4 text-slate-400" />
          <span className="hidden lg:inline text-xs font-medium">媒体资源</span>
        </button>

        {/* AI Writing Assistant */}
        <button
          id="btn-open-assistant"
          onClick={onOpenAssistant}
          className="px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 font-medium bg-gradient-to-r from-fuchsia-600/20 via-indigo-600/20 to-fuchsia-600/20 text-fuchsia-200 border border-fuchsia-500/30 hover:from-fuchsia-600/40 hover:to-indigo-600/40 hover:border-fuchsia-400/50 transition-all"
          title="AI 写作助手:配置专属人设与模型 API Key,聊天帮你写文章、分析文风"
        >
          <Bot className="w-4 h-4 text-fuchsia-400" />
          <span className="hidden lg:inline text-xs font-semibold">写作助手</span>
        </button>

        {/* GitHub Settings */}
        <button
          id="btn-open-settings"
          onClick={onOpenSettings}
          className="px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-xs flex items-center gap-1.5 border border-transparent hover:border-slate-700"
          title="配置 GitHub 仓库与 Token"
        >
          <Settings className="w-4 h-4 text-slate-400" />
          <span className="hidden lg:inline text-xs font-medium">仓库配置</span>
        </button>

        {/* Commit & Deploy button */}
        <button
          id="btn-commit-and-deploy"
          onClick={onOpenCommitModal}
          disabled={!activePost}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-xs shadow-lg transition-all ${
            hasUnsavedChanges
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 ring-2 ring-indigo-400/40'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
          title="提交文章至 GitHub 仓库并触发 Actions 部署流水线"
        >
          <UploadCloud className="w-4 h-4" />
          <span>同步并部署</span>
          {hasUnsavedChanges && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
          )}
        </button>
      </div>
    </header>
  );
};
