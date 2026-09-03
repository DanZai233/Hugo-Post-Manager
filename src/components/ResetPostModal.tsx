import React, { useState, useMemo } from 'react';
import {
  X,
  RotateCcw,
  AlertTriangle,
  GitBranch,
  Plus,
  Minus,
  Loader2,
  CheckCircle2,
  CloudDownload,
  History,
  Trash2,
  FileText
} from 'lucide-react';
import { GitHubConfig, HugoPost } from '../types';
import { parseHugoContent, serializeHugoContent } from '../services/hugoParser';
import { fetchSinglePostContent } from '../services/githubApi';
import { computeLineDiff, compareFrontMatter } from '../utils/diff';

interface ResetPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: HugoPost | null;
  config: GitHubConfig;
  onResetSuccess: (revertedPost: HugoPost) => void;
  onDiscardNewPost?: (postId: string) => void;
}

export const ResetPostModal: React.FC<ResetPostModalProps> = ({
  isOpen,
  onClose,
  post,
  config,
  onResetSuccess,
  onDiscardNewPost,
}) => {
  const [fetchFromRemote, setFetchFromRemote] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Compute diff against original rawContent
  const newRawContent = useMemo(() => {
    if (!post) return '';
    return serializeHugoContent(post.frontMatter, post.content);
  }, [post]);

  const oldRawContent = useMemo(() => {
    return post?.rawContent || '';
  }, [post]);

  const diffResult = useMemo(() => {
    if (!post) return { additions: 0, deletions: 0, lines: [], hasChanges: false };
    return computeLineDiff(oldRawContent, newRawContent);
  }, [oldRawContent, newRawContent, post]);

  const frontMatterChanges = useMemo(() => {
    if (!post) return [];
    const oldParsed = oldRawContent ? parseHugoContent(oldRawContent).frontMatter : {};
    return compareFrontMatter(oldParsed as any, post.frontMatter as any);
  }, [oldRawContent, post]);

  const changedFMCount = useMemo(() => {
    return frontMatterChanges.filter((c) => c.hasChanged).length;
  }, [frontMatterChanges]);

  if (!isOpen || !post) return null;

  const isNewPost = Boolean(post.isNew);
  const hasRemoteRepo = Boolean(config.owner && config.repo && !config.useMock);

  const handleResetExistingPost = async () => {
    setResetting(true);
    setErrorMessage(null);

    let targetRawText = post.rawContent;

    // If configured to fetch real latest from GitHub remote
    if (fetchFromRemote && hasRemoteRepo) {
      try {
        targetRawText = await fetchSinglePostContent(config, post.path);
      } catch (err: any) {
        console.warn('Failed to fetch from remote, falling back to local snapshot:', err);
        // If remote fails, fallback to local raw snapshot
        if (!targetRawText) {
          setErrorMessage(err.message || '从远程仓库拉取失败且本地无备份快照');
          setResetting(false);
          return;
        }
      }
    }

    try {
      const { frontMatter, content } = parseHugoContent(targetRawText);

      const revertedPost: HugoPost = {
        ...post,
        frontMatter,
        content,
        rawContent: targetRawText,
        isModified: false,
        isNew: false,
        lastModified: frontMatter.date || post.lastModified,
      };

      onResetSuccess(revertedPost);
      onClose();
    } catch (err: any) {
      setErrorMessage(`解析重置内容失败: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  const handleDiscardNewPost = () => {
    if (onDiscardNewPost) {
      onDiscardNewPost(post.id);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#0b1120] rounded-2xl shadow-2xl border border-slate-800 text-slate-300 max-w-lg w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-white text-base">重置文章修改</h2>
              <p className="text-xs text-slate-400">放弃所有未同步的改动，恢复与线上远程版本一致</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-4 space-y-4 text-xs">
          {/* Target Article Card */}
          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white text-xs truncate max-w-[280px]">
                {post.frontMatter.title || post.name}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  isNewPost
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {isNewPost ? '新建草稿文件' : '已修改待同步'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400 truncate">
              <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="truncate">{post.path}</span>
            </div>
          </div>

          {/* New Post Special Case */}
          {isNewPost ? (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2 text-amber-300">
              <div className="flex items-center gap-2 font-semibold text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>此文章为本地新建草稿</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-300/90">
                该文章尚未在 GitHub 远程仓库建立文件。如果您想放弃创作本篇，可以选择彻底丢弃该新建草稿；或者重新重置为初始空白模板。
              </p>
            </div>
          ) : (
            <>
              {/* Changes Summary Pill */}
              <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
                <span className="text-slate-400">本次放弃的修改统计:</span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Plus className="w-3 h-3" />
                  <span>{diffResult.additions} 行新增</span>
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Minus className="w-3 h-3" />
                  <span>{diffResult.deletions} 行删除</span>
                </span>
                {changedFMCount > 0 && (
                  <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    {changedFMCount} 项 Front Matter 变更
                  </span>
                )}
              </div>

              {/* Source Strategy Selector */}
              {hasRemoteRepo && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    重置数据来源方式
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFetchFromRemote(true)}
                      className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                        fetchFromRemote
                          ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-200'
                          : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <CloudDownload className="w-4 h-4 mt-0.5 shrink-0 text-indigo-400" />
                      <div>
                        <div className="font-semibold text-xs flex items-center gap-1">
                          <span>从 GitHub 远程拉取</span>
                          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1 py-0.2 rounded font-normal">推荐</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          直接请求线上仓库最新文件，保证与远程实时严格同步
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFetchFromRemote(false)}
                      className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                        !fetchFromRemote
                          ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-200'
                          : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <History className="w-4 h-4 mt-0.5 shrink-0 text-indigo-400" />
                      <div>
                        <div className="font-semibold text-xs">恢复打开时快照</div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          使用当前编辑前所加载的原始快照，无需联网极速还原
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Danger Warning Alert */}
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-rose-200">警告：此操作不可撤销</p>
                  <p className="text-[11px] text-rose-300/80 mt-0.5 leading-relaxed">
                    重置后，您在本次会话中对本篇文章所做的所有正文编辑、排版与 Front Matter 元数据变更将被完全清除，直接恢复为线上仓库的版本。
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Error notice */}
          {errorMessage && (
            <div className="p-2.5 bg-rose-500/20 border border-rose-500/30 text-rose-200 rounded-lg text-xs">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3.5 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-colors"
          >
            取消
          </button>

          <div className="flex items-center gap-2">
            {isNewPost ? (
              <button
                type="button"
                onClick={handleDiscardNewPost}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-500 transition-colors shadow-lg shadow-rose-600/25 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>丢弃该新建草稿</span>
              </button>
            ) : (
              <button
                id="btn-confirm-reset-post"
                type="button"
                disabled={resetting}
                onClick={handleResetExistingPost}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-50 transition-colors shadow-lg shadow-rose-600/25 flex items-center gap-1.5"
              >
                {resetting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>正在恢复线上版本...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>确认重置，恢复线上版本</span>
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
