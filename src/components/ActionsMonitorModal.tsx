import React, { useState } from 'react';
import {
  X,
  Radio,
  CheckCircle2,
  AlertCircle,
  Clock,
  Play,
  RotateCw,
  ExternalLink,
  GitCommit,
  Layers,
  Code2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { GitHubConfig, GitHubWorkflowRun } from '../types';
import { triggerWorkflowDispatch } from '../services/githubApi';

interface ActionsMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowRuns: GitHubWorkflowRun[];
  config: GitHubConfig;
  onRefresh: () => void;
  isLoading: boolean;
}

export const ActionsMonitorModal: React.FC<ActionsMonitorModalProps> = ({
  isOpen,
  onClose,
  workflowRuns,
  config,
  onRefresh,
  isLoading,
}) => {
  const [dispatching, setDispatching] = useState(false);
  const [dispatchMsg, setDispatchMsg] = useState<string | null>(null);
  const [showWorkflowSample, setShowWorkflowSample] = useState(false);

  if (!isOpen) return null;

  const handleManualDispatch = async () => {
    if (config.useMock) {
      setDispatching(true);
      setTimeout(() => {
        setDispatching(false);
        setDispatchMsg('模拟触发工作流成功！流水线已进入排队队列。');
        setTimeout(() => setDispatchMsg(null), 4000);
      }, 1000);
      return;
    }

    setDispatching(true);
    try {
      // Typically 'hugo.yml' or workflow id
      await triggerWorkflowDispatch(config, 'hugo.yml');
      setDispatchMsg('成功发送 workflow_dispatch 触发事件！');
      onRefresh();
    } catch (e: any) {
      setDispatchMsg(`触发失败: ${e.message || '请确认工作流包含 workflow_dispatch 触发器'}`);
    }
    setDispatching(false);
    setTimeout(() => setDispatchMsg(null), 5000);
  };

  const getStatusIcon = (run: GitHubWorkflowRun) => {
    if (run.status === 'in_progress' || run.status === 'queued') {
      return <Clock className="w-4 h-4 text-amber-500 animate-spin" />;
    }
    if (run.conclusion === 'success') {
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    }
    if (run.conclusion === 'failure') {
      return <AlertCircle className="w-4 h-4 text-rose-500" />;
    }
    return <Clock className="w-4 h-4 text-stone-400" />;
  };

  const formatRunDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#0b1120] rounded-2xl shadow-2xl border border-slate-800 text-slate-300 max-w-2xl w-full p-6 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-white text-sm">GitHub Actions 持续部署监控</h2>
              <p className="text-[11px] text-slate-400">
                实时追踪 Hugo 静态站构建及发布到 GitHub Pages / CDN 的流水线执行状态
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
              title="刷新工作流状态"
            >
              <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action bar */}
        <div className="py-2.5 flex items-center justify-between border-b border-slate-800/80 shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>监控分支:</span>
            <span className="font-mono font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
              {config.branch || 'main'}
            </span>
            {config.useMock && (
              <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20">
                演示数据
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowWorkflowSample(!showWorkflowSample)}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
            >
              <Code2 className="w-3.5 h-3.5 text-slate-500" />
              <span>CI 配置范例</span>
              {showWorkflowSample ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
            </button>

            <button
              disabled={dispatching}
              onClick={handleManualDispatch}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-sm"
              title="手动触发 GitHub Actions 编译部署 (workflow_dispatch)"
            >
              <Play className="w-3 h-3 text-indigo-200" />
              <span>手动触发部署</span>
            </button>
          </div>
        </div>

        {/* Toast Dispatch Msg */}
        {dispatchMsg && (
          <div className="my-2 p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs shrink-0 font-mono">
            {dispatchMsg}
          </div>
        )}

        {/* Optional Workflow YAML Config Helper */}
        {showWorkflowSample && (
          <div className="my-2 p-3.5 bg-slate-950 text-slate-300 border border-slate-800 rounded-xl text-xs font-mono shrink-0 overflow-x-auto">
            <div className="flex items-center justify-between mb-1.5 text-slate-400 text-[11px]">
              <span>.github/workflows/hugo.yml 推荐配置:</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`name: Deploy Hugo site to Pages
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
      - uses: actions/checkout@v4
      - uses: peaceiris/actions-hugo@v3
        with:
          hugo-version: 'latest'
          extended: true
      - run: hugo --minify
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./public
  deploy:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/deploy-pages@v4`);
                  setDispatchMsg('已复制工作流 YAML 配置到剪贴板！');
                  setTimeout(() => setDispatchMsg(null), 3000);
                }}
                className="text-indigo-400 hover:text-indigo-300 underline"
              >
                复制代码
              </button>
            </div>
            <pre className="text-[11px] leading-relaxed text-indigo-200/90">
{`name: Deploy Hugo site to Pages
on:
  push:
    branches: ["${config.branch || 'main'}"]
  workflow_dispatch:
# 完整脚本包含 checkout、peaceiris/actions-hugo 及 deploy-pages`}
            </pre>
          </div>
        )}

        {/* Runs List */}
        <div className="flex-1 overflow-y-auto py-2 space-y-2">
          {workflowRuns.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              <Layers className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="text-slate-400 font-medium">暂无 Actions 工作流运行记录</p>
              <p className="text-[11px] text-slate-500 mt-1">
                提交文章后，GitHub 会自动启动构建流水线并在此处同步展示。
              </p>
            </div>
          ) : (
            workflowRuns.map((run) => (
              <div
                key={run.id}
                className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:bg-slate-900 transition-colors flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5">{getStatusIcon(run)}</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{run.name}</span>
                      <span className="font-mono text-[11px] text-indigo-400">#{run.run_number}</span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {run.event}
                      </span>
                    </div>

                    {run.head_commit && (
                      <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                        <GitCommit className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate max-w-md font-mono text-slate-300">{run.head_commit.message}</span>
                      </div>
                    )}

                    <div className="text-[10px] text-slate-500 flex items-center gap-2">
                      <span>触发时间: {formatRunDate(run.created_at)}</span>
                      {run.head_commit?.author?.name && (
                        <span>· 提交者: {run.head_commit.author.name}</span>
                      )}
                    </div>
                  </div>
                </div>

                {run.html_url && (
                  <a
                    href={run.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 underline shrink-0 mt-1"
                  >
                    <span>查看日志</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs shrink-0">
          <span className="text-[11px] text-slate-500">
            {config.isConfigured && !config.useMock
              ? `已连接 ${config.owner}/${config.repo}`
              : '提示：连接 GitHub 仓库后可直接读取实时 Actions 状态'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
