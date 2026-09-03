import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  UploadCloud,
  GitCommit,
  GitBranch,
  FileText,
  Loader2,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
  GitCompare,
  Plus,
  Minus,
  FileCode,
  Layers,
  Sparkles,
  Check,
  Copy,
  ChevronRight,
  FolderArchive,
  RotateCcw
} from 'lucide-react';
import { GitHubConfig, HugoPost } from '../types';
import { savePostToGitHub } from '../services/githubApi';
import { parseHugoContent, serializeHugoContent } from '../services/hugoParser';
import { computeLineDiff, compareFrontMatter, DiffLine } from '../utils/diff';

interface CommitDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: HugoPost | null;
  allPosts?: HugoPost[];
  config: GitHubConfig;
  onCommitSuccess: (updatedPost: HugoPost, commitUrl?: string) => void;
  onSelectPost?: (post: HugoPost) => void;
  onRequestResetPost?: (post: HugoPost) => void;
}

export const CommitDeployModal: React.FC<CommitDeployModalProps> = ({
  isOpen,
  onClose,
  post,
  allPosts = [],
  config,
  onCommitSuccess,
  onSelectPost,
  onRequestResetPost,
}) => {
  // Current active post being previewed
  const [selectedPostId, setSelectedPostId] = useState<string>(post?.id || '');
  const [activeTab, setActiveTab] = useState<'diff' | 'raw' | 'frontmatter'>('diff');
  const [onlyChangedLines, setOnlyChangedLines] = useState(false);
  const [copiedDiff, setCopiedDiff] = useState(false);

  // Sync selected post whenever modal opens or post prop changes
  useEffect(() => {
    if (isOpen && post) {
      setSelectedPostId(post.id);
      setCommitResult(null);
      setCopiedDiff(false);
    }
  }, [isOpen, post]);

  // List of all modified or newly created posts
  const modifiedPosts = useMemo(() => {
    const list = allPosts.filter((p) => p.isModified || p.isNew);
    if (post && !list.some((p) => p.id === post.id)) {
      list.unshift(post);
    }
    return list;
  }, [allPosts, post]);

  const currentPreviewPost = useMemo(() => {
    return modifiedPosts.find((p) => p.id === selectedPostId) || post;
  }, [modifiedPosts, selectedPostId, post]);

  // Generate serialized new content for current post
  const newRawContent = useMemo(() => {
    if (!currentPreviewPost) return '';
    return serializeHugoContent(currentPreviewPost.frontMatter, currentPreviewPost.content);
  }, [currentPreviewPost]);

  // Original content
  const oldRawContent = useMemo(() => {
    if (!currentPreviewPost) return '';
    return currentPreviewPost.rawContent || '';
  }, [currentPreviewPost]);

  // Compute line diff
  const diffResult = useMemo(() => {
    if (!currentPreviewPost) return { additions: 0, deletions: 0, lines: [], hasChanges: false };
    return computeLineDiff(oldRawContent, newRawContent);
  }, [oldRawContent, newRawContent, currentPreviewPost]);

  // Front matter differences
  const frontMatterChanges = useMemo(() => {
    if (!currentPreviewPost) return [];
    const oldParsed = oldRawContent ? parseHugoContent(oldRawContent).frontMatter : {};
    return compareFrontMatter(oldParsed as any, currentPreviewPost.frontMatter as any);
  }, [oldRawContent, currentPreviewPost]);

  const hasFMChanges = useMemo(() => {
    return frontMatterChanges.some((c) => c.hasChanged);
  }, [frontMatterChanges]);

  // Commit message state
  const defaultMessage = useMemo(() => {
    if (!currentPreviewPost) return 'content(posts): update post';
    return currentPreviewPost.isNew
      ? `content(posts): add "${currentPreviewPost.frontMatter.title || currentPreviewPost.name}"`
      : `content(posts): update "${currentPreviewPost.frontMatter.title || currentPreviewPost.name}"`;
  }, [currentPreviewPost]);

  const [commitMessage, setCommitMessage] = useState(defaultMessage);
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<{
    success: boolean;
    sha?: string;
    commitUrl?: string;
    error?: string;
  } | null>(null);

  // Update default commit message when changing selected post
  useEffect(() => {
    setCommitMessage(defaultMessage);
  }, [defaultMessage]);

  if (!isOpen || !currentPreviewPost) return null;

  const handleCopyDiff = () => {
    const diffText = diffResult.lines
      .map((l) => {
        const prefix = l.type === 'add' ? '+ ' : l.type === 'delete' ? '- ' : '  ';
        return `${prefix}${l.content}`;
      })
      .join('\n');

    navigator.clipboard.writeText(diffText);
    setCopiedDiff(true);
    setTimeout(() => setCopiedDiff(false), 2000);
  };

  const handleCommit = async () => {
    setCommitting(true);
    setCommitResult(null);

    // If using mock mode or no token
    if (config.useMock || !config.token) {
      setTimeout(() => {
        const mockSha = 'commit-' + Math.random().toString(36).substring(2, 9);
        const updatedPost: HugoPost = {
          ...currentPreviewPost,
          sha: mockSha,
          isModified: false,
          isNew: false,
          rawContent: newRawContent,
          lastModified: new Date().toISOString(),
        };

        setCommitResult({
          success: true,
          sha: mockSha,
        });
        setCommitting(false);
        onCommitSuccess(updatedPost);
      }, 900);
      return;
    }

    // Real GitHub API commit
    try {
      const res = await savePostToGitHub(config, currentPreviewPost, commitMessage);
      const updatedPost: HugoPost = {
        ...currentPreviewPost,
        sha: res.sha,
        isModified: false,
        isNew: false,
        rawContent: newRawContent,
        lastModified: new Date().toISOString(),
      };

      setCommitResult({
        success: true,
        sha: res.sha,
        commitUrl: res.commitUrl,
      });
      setCommitting(false);
      onCommitSuccess(updatedPost, res.commitUrl);
    } catch (err: any) {
      setCommitResult({
        success: false,
        error: err.message || '提交失败，请检查网络或 GitHub 权限。',
      });
      setCommitting(false);
    }
  };

  // Filter lines if user chooses "only changed lines"
  const displayedLines = useMemo(() => {
    if (!onlyChangedLines) return diffResult.lines;
    // Show changed lines plus 2 context lines before and after
    const changedIndices = new Set<number>();
    diffResult.lines.forEach((l, idx) => {
      if (l.type !== 'normal') {
        for (let offset = -2; offset <= 2; offset++) {
          const target = idx + offset;
          if (target >= 0 && target < diffResult.lines.length) {
            changedIndices.add(target);
          }
        }
      }
    });

    return diffResult.lines.filter((_, idx) => changedIndices.has(idx));
  }, [diffResult.lines, onlyChangedLines]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 animate-fade-in">
      <div className="bg-[#0b1120] rounded-2xl shadow-2xl border border-slate-800 text-slate-300 max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 md:px-6 md:py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-[#0f172a]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-white text-base">提交预览与 Git 差异对比</h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  {modifiedPosts.length} 个文件待同步
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                在将代码推送到 GitHub 远程仓库前，仔细预览改动的文件清单及逐行代码差异
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Changed Files Selector Bar */}
        <div className="px-4 md:px-6 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0">
          <span className="text-xs text-slate-400 shrink-0 font-medium flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span>改动文件列表:</span>
          </span>

          <div className="flex items-center gap-2 flex-nowrap">
            {modifiedPosts.map((p) => {
              const isSelected = p.id === currentPreviewPost.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedPostId(p.id);
                    if (onSelectPost) onSelectPost(p);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all shrink-0 border ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200 font-semibold shadow-xs'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      p.isNew ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  <span className="truncate max-w-[200px]" title={p.path}>
                    {p.name === 'index.md' ? p.path.split('/').slice(-2).join('/') : p.name}
                  </span>
                  <span
                    className={`text-[10px] px-1 py-0.2 rounded font-sans ${
                      p.isNew
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {p.isNew ? '新增' : '修改'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:px-6 space-y-3.5">
          {/* File Meta Details & Stats */}
          <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <div className="flex items-center gap-1 text-slate-400">
                <span className="text-slate-500">文件:</span>
                <span className="text-slate-200 font-semibold">{currentPreviewPost.path}</span>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1 text-slate-400">
                <GitBranch className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-indigo-300">{config.branch || 'main'}</span>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                    currentPreviewPost.frontMatter.draft
                      ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                  }`}
                >
                  {currentPreviewPost.frontMatter.draft ? '草稿模式 (Draft)' : '正式发布 (Publish)'}
                </span>
              </div>
            </div>

            {/* Diff Stats Badges & Reset action */}
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Plus className="w-3 h-3" />
                <span>{diffResult.additions} 行新增</span>
              </span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Minus className="w-3 h-3" />
                <span>{diffResult.deletions} 行删除</span>
              </span>

              {onRequestResetPost && (
                <button
                  type="button"
                  onClick={() => onRequestResetPost(currentPreviewPost)}
                  className="ml-1 font-sans flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-medium text-slate-400 hover:text-rose-300 bg-slate-950 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 transition-colors"
                  title="放弃本篇所有未同步修改，一键恢复与线上远程版本一致"
                >
                  <RotateCcw className="w-3 h-3 text-slate-400" />
                  <span>放弃修改 / 重置本篇</span>
                </button>
              )}
            </div>
          </div>

          {/* Front Matter Metadata Changes Callout (if any changes) */}
          {hasFMChanges && (
            <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/20 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-indigo-300 text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Hugo Front Matter 属性变更检测</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
                {frontMatterChanges
                  .filter((c) => c.hasChanged)
                  .map((c) => (
                    <div
                      key={c.key}
                      className="p-2 rounded bg-slate-950/70 border border-slate-800 flex items-center justify-between"
                    >
                      <span className="text-slate-400 font-sans">{c.label}:</span>
                      <div className="flex items-center gap-1.5 truncate max-w-[65%] text-right">
                        <span className="text-rose-400 line-through opacity-80 truncate">
                          {c.oldVal}
                        </span>
                        <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
                        <span className="text-emerald-400 font-semibold truncate">{c.newVal}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Diff View Tabs & Controls */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/90">
            {/* View Tab Bar */}
            <div className="bg-[#0f172a] px-3 py-2 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('diff')}
                  className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                    activeTab === 'diff'
                      ? 'bg-indigo-600 text-white font-medium shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  <span>Git Diff 差异对比</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('raw')}
                  className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                    activeTab === 'raw'
                      ? 'bg-indigo-600 text-white font-medium shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>最终完整文件</span>
                </button>
              </div>

              {activeTab === 'diff' && (
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-slate-400 flex items-center gap-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={onlyChangedLines}
                      onChange={(e) => setOnlyChangedLines(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-indigo-600"
                    />
                    <span>仅看改动上下文</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleCopyDiff}
                    className="px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 flex items-center gap-1 transition-colors"
                    title="复制 Diff 文本"
                  >
                    {copiedDiff ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">已复制</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>复制 Diff</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Tab 1: Diff View */}
            {activeTab === 'diff' && (
              <div className="max-h-[360px] overflow-auto font-mono text-[11px] leading-relaxed select-text">
                {currentPreviewPost.isNew && (
                  <div className="p-3 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-300 flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    <span className="font-semibold">这是新建的 Hugo 文章文件，所有行均为新增内容</span>
                  </div>
                )}

                {!diffResult.hasChanges && !currentPreviewPost.isNew ? (
                  <div className="p-8 text-center text-slate-500 space-y-1">
                    <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-500/70" />
                    <p className="font-sans text-xs text-slate-300">
                      当前文件内容与远程版本完全一致，暂无未保存的修改。
                    </p>
                  </div>
                ) : (
                  <table className="w-full border-collapse">
                    <tbody>
                      {displayedLines.map((line, idx) => {
                        const isAdd = line.type === 'add';
                        const isDel = line.type === 'delete';

                        return (
                          <tr
                            key={idx}
                            className={`group ${
                              isAdd
                                ? 'bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500'
                                : isDel
                                ? 'bg-rose-950/40 text-rose-300 border-l-2 border-rose-500'
                                : 'text-slate-400 hover:bg-slate-900/50'
                            }`}
                          >
                            {/* Old line number */}
                            <td className="w-10 text-right pr-2 py-0.5 text-[10px] text-slate-600 select-none shrink-0 font-mono border-r border-slate-800/60">
                              {line.oldLineNumber || ''}
                            </td>
                            {/* New line number */}
                            <td className="w-10 text-right pr-2 py-0.5 text-[10px] text-slate-600 select-none shrink-0 font-mono border-r border-slate-800/60">
                              {line.newLineNumber || ''}
                            </td>
                            {/* Marker */}
                            <td className="w-5 text-center select-none py-0.5 font-bold shrink-0">
                              {isAdd ? '+' : isDel ? '-' : ' '}
                            </td>
                            {/* Line content */}
                            <td className="py-0.5 px-2 whitespace-pre-wrap break-all font-mono">
                              {line.content || ' '}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Tab 2: Raw Final File Content */}
            {activeTab === 'raw' && (
              <div className="max-h-[360px] overflow-auto p-4 font-mono text-[11px] leading-relaxed text-slate-200 bg-[#070d18] whitespace-pre-wrap select-text">
                {newRawContent}
              </div>
            )}
          </div>

          {/* Token & Repo Notice */}
          {(!config.token || config.useMock) && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-amber-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-amber-200">
                  {!config.token && config.owner && config.repo
                    ? '未提供 GitHub Token（将以本地沙盒模拟提交）'
                    : '当前处于演示模拟模式'}
                </p>
                <p className="text-[11px] text-amber-300/80 mt-0.5 leading-relaxed">
                  {!config.token && config.owner && config.repo
                    ? '已成功关联远程仓库。如需将本次改动真正 Push 到 GitHub 仓库并自动触发 GitHub Actions 部署，请在右上角“仓库配置”中填入您的 Personal Access Token。'
                    : '在沙盒演示模式下，提交将在本地模拟 Commit 并触发模拟 Actions 部署流水线。'}
                </p>
              </div>
            </div>
          )}

          {/* Commit Message Box */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <GitCommit className="w-3.5 h-3.5 text-indigo-400" />
                <span>Git Commit 提交说明信息</span>
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                将记录在 GitHub 的提交历史中
              </span>
            </label>

            <input
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="例如: content(posts): update post title"
            />

            {/* Quick preset templates */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-500">常用预设:</span>
              <button
                type="button"
                onClick={() =>
                  setCommitMessage(`content(posts): update "${currentPreviewPost.frontMatter.title}"`)
                }
                className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
              >
                更新文章
              </button>
              <button
                type="button"
                onClick={() =>
                  setCommitMessage(`content(posts): publish "${currentPreviewPost.frontMatter.title}"`)
                }
                className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
              >
                正式发布
              </button>
              <button
                type="button"
                onClick={() =>
                  setCommitMessage(`content(posts): fix formatting and metadata`)
                }
                className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
              >
                修正排版
              </button>
            </div>
          </div>

          {/* Commit Result Message */}
          {commitResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                commitResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              }`}
            >
              {commitResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
              )}
              <div className="space-y-1">
                <p className="font-semibold">
                  {commitResult.success
                    ? 'Git 提交成功！已自动触发 GitHub Actions 部署流水线'
                    : '提交失败'}
                </p>
                {commitResult.sha && (
                  <p className="font-mono text-[11px] text-slate-400">
                    Commit SHA:{' '}
                    <span className="text-emerald-300 underline font-bold">
                      {commitResult.sha.substring(0, 10)}
                    </span>
                  </p>
                )}
                {commitResult.commitUrl && (
                  <a
                    href={commitResult.commitUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 underline font-medium mt-0.5"
                  >
                    <span>在 GitHub 上查看此提交与文件变动</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {commitResult.error && <p className="text-rose-300">{commitResult.error}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 md:px-6 border-t border-slate-800 flex items-center justify-between shrink-0 bg-[#0f172a]">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>目标落点:</span>
            <span className="font-mono text-[11px] text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              {config.owner || 'demo'}/{config.repo || 'repo'}@{config.branch || 'main'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors"
            >
              {commitResult?.success ? '完成' : '取消'}
            </button>

            {!commitResult?.success && (
              <button
                id="btn-confirm-commit-deploy"
                type="button"
                disabled={committing || !commitMessage.trim()}
                onClick={handleCommit}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-600/25"
              >
                {committing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>正在提交到 GitHub...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>确认无误，立即提交并部署</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
