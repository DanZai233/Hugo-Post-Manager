import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { PostList } from './components/PostList';
import { PostEditor } from './components/Editor/PostEditor';
import { ConfigModal } from './components/ConfigModal';
import { CommitDeployModal } from './components/CommitDeployModal';
import { ActionsMonitorModal } from './components/ActionsMonitorModal';
import { ImageUploadModal } from './components/ImageUploadModal';
import { NewPostModal } from './components/NewPostModal';
import { ResetPostModal } from './components/ResetPostModal';
import { GitHubConfig, GitHubWorkflowRun, HugoPost } from './types';
import {
  loadGitHubConfig,
  saveGitHubConfig,
  loadCachedPosts,
  saveCachedPosts,
  loadActivePostId,
  saveActivePostId,
} from './services/storage';
import {
  fetchGitHubPosts,
  fetchGitHubWorkflowRuns,
  deletePostFromGitHub,
} from './services/githubApi';
import { DEFAULT_CONFIG, INITIAL_MOCK_POSTS, MOCK_WORKFLOW_RUNS } from './services/mockData';
import { generateHugoDate } from './services/hugoParser';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  RotateCw,
  Sparkles,
  Wifi,
  WifiOff
} from 'lucide-react';

export default function App() {
  const [config, setConfig] = useState<GitHubConfig>(loadGitHubConfig);
  const [posts, setPosts] = useState<HugoPost[]>(loadCachedPosts);
  const [activePostId, setActivePostId] = useState<string | null>(loadActivePostId);
  const [workflowRuns, setWorkflowRuns] = useState<GitHubWorkflowRun[]>(MOCK_WORKFLOW_RUNS);

  // Loading states
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);

  // Modals state
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isCommitOpen, setIsCommitOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [postToReset, setPostToReset] = useState<HugoPost | null>(null);

  // Toast notifications
  const [toast, setToast] = useState<{
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString();
    setToast({ id, type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 4500);
  };

  // Active Post selector
  const activePost = posts.find((p) => p.id === activePostId) || posts[0] || null;

  // Persist config
  const handleSaveConfig = (newConfig: GitHubConfig) => {
    setConfig(newConfig);
    saveGitHubConfig(newConfig);
    if (!newConfig.useMock && newConfig.owner && newConfig.repo) {
      showToast(`已连接 ${newConfig.owner}/${newConfig.repo}，正在读取文章...`, 'info');
      loadPostsFromRemote(newConfig);
      loadWorkflowsFromRemote(newConfig);
    } else {
      showToast('GitHub 配置已保存', 'info');
    }
  };

  // Reset to demo
  const handleResetToDemo = () => {
    const demoConfig = { ...DEFAULT_CONFIG, useMock: true };
    setConfig(demoConfig);
    saveGitHubConfig(demoConfig);
    setPosts(INITIAL_MOCK_POSTS);
    saveCachedPosts(INITIAL_MOCK_POSTS);
    setWorkflowRuns(MOCK_WORKFLOW_RUNS);
    setActivePostId(INITIAL_MOCK_POSTS[0].id);
    showToast('已重置为演示模式', 'info');
  };

  // Fetch posts from GitHub when configured
  const loadPostsFromRemote = useCallback(async (currentConfig: GitHubConfig) => {
    if (currentConfig.useMock || !currentConfig.owner || !currentConfig.repo) {
      return;
    }

    setIsLoadingPosts(true);
    try {
      const remotePosts = await fetchGitHubPosts(currentConfig);
      if (remotePosts.length > 0) {
        setPosts(remotePosts);
        saveCachedPosts(remotePosts);
        if (!activePostId || !remotePosts.some((p) => p.id === activePostId)) {
          setActivePostId(remotePosts[0].id);
          saveActivePostId(remotePosts[0].id);
        }
        showToast(`成功从 ${currentConfig.owner}/${currentConfig.repo} 加载 ${remotePosts.length} 篇 Hugo 文章`);
      } else {
        showToast(`在目录 ${currentConfig.postsDir} 下未找到文章，可新建一篇。`, 'info');
      }
    } catch (err: any) {
      console.warn('Failed to load posts from GitHub:', err);
      showToast(`读取 GitHub 仓库失败: ${err.message}`, 'error');
    } finally {
      setIsLoadingPosts(false);
    }
  }, [activePostId]);

  // Fetch workflow runs
  const loadWorkflowsFromRemote = useCallback(async (currentConfig: GitHubConfig) => {
    if (currentConfig.useMock || !currentConfig.owner || !currentConfig.repo) {
      return;
    }

    setIsLoadingWorkflows(true);
    try {
      const runs = await fetchGitHubWorkflowRuns(currentConfig);
      if (runs.length > 0) {
        setWorkflowRuns(runs);
      }
    } catch (e) {
      console.warn('Failed to fetch workflow runs:', e);
    } finally {
      setIsLoadingWorkflows(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (config.isConfigured && !config.useMock) {
      loadPostsFromRemote(config);
      loadWorkflowsFromRemote(config);
    }
  }, [config.isConfigured, config.useMock]);

  // Periodic check for Actions if running
  useEffect(() => {
    const latest = workflowRuns[0];
    if (latest && (latest.status === 'in_progress' || latest.status === 'queued')) {
      const timer = setInterval(() => {
        if (!config.useMock) {
          loadWorkflowsFromRemote(config);
        }
      }, 10000);
      return () => clearInterval(timer);
    }
  }, [workflowRuns, config, loadWorkflowsFromRemote]);

  // Select active post
  const handleSelectPost = (post: HugoPost) => {
    setActivePostId(post.id);
    saveActivePostId(post.id);
  };

  // Modify active post in memory
  const handleUpdatePost = (updated: HugoPost) => {
    const updatedList = posts.map((p) => (p.id === updated.id ? updated : p));
    setPosts(updatedList);
    saveCachedPosts(updatedList);
  };

  // New post created
  const handleCreatePost = (newPost: HugoPost) => {
    const updated = [newPost, ...posts];
    setPosts(updated);
    saveCachedPosts(updated);
    setActivePostId(newPost.id);
    saveActivePostId(newPost.id);
    showToast(`新文章「${newPost.frontMatter.title}」已创建`);
  };

  // Duplicate post
  const handleDuplicatePost = (post: HugoPost) => {
    const newSlug = `${post.frontMatter.slug || 'post'}-copy-${Math.random().toString(36).substring(2, 6)}`;
    const newName = `${newSlug}.md`;
    const cleanDir = config.postsDir.replace(/^\/+|\/+$/g, '');
    const newPath = `${cleanDir}/${newName}`;

    const duplicated: HugoPost = {
      ...post,
      id: newPath,
      name: newName,
      path: newPath,
      sha: undefined,
      isNew: true,
      isModified: true,
      frontMatter: {
        ...post.frontMatter,
        title: `${post.frontMatter.title} (副本)`,
        slug: newSlug,
        date: generateHugoDate(),
      },
    };

    const updated = [duplicated, ...posts];
    setPosts(updated);
    saveCachedPosts(updated);
    setActivePostId(duplicated.id);
    showToast(`已复制文章为「${duplicated.frontMatter.title}」`);
  };

  // Delete post
  const handleDeletePost = async (post: HugoPost) => {
    const confirmDelete = window.confirm(`确定要从仓库中删除文章「${post.frontMatter.title || post.name}」吗？`);
    if (!confirmDelete) return;

    if (!config.useMock && post.sha) {
      try {
        await deletePostFromGitHub(config, post);
        showToast('已从 GitHub 仓库提交删除并触发部署');
        loadWorkflowsFromRemote(config);
      } catch (err: any) {
        showToast(`删除失败: ${err.message}`, 'error');
        return;
      }
    } else {
      showToast(`已删除文章「${post.frontMatter.title}」`);
    }

    const updated = posts.filter((p) => p.id !== post.id);
    setPosts(updated);
    saveCachedPosts(updated);
    if (activePostId === post.id && updated.length > 0) {
      setActivePostId(updated[0].id);
      saveActivePostId(updated[0].id);
    }
  };

  // Open reset post modal
  const handleOpenResetModal = (targetPost?: HugoPost) => {
    const p = targetPost || activePost;
    if (!p) return;
    setPostToReset(p);
    setIsResetOpen(true);
  };

  // Revert / Reset post back to remote state
  const handleResetSuccess = (revertedPost: HugoPost) => {
    const updatedList = posts.map((p) => (p.id === revertedPost.id ? revertedPost : p));
    setPosts(updatedList);
    saveCachedPosts(updatedList);
    showToast(`已成功重置文章「${revertedPost.frontMatter.title || revertedPost.name}」，已恢复与线上远程版本一致`);
  };

  // Discard newly created post draft
  const handleDiscardNewPost = (postId: string) => {
    const updatedList = posts.filter((p) => p.id !== postId);
    setPosts(updatedList);
    saveCachedPosts(updatedList);
    if (activePostId === postId && updatedList.length > 0) {
      setActivePostId(updatedList[0].id);
      saveActivePostId(updatedList[0].id);
    }
    showToast('已放弃该新建文章草稿');
  };

  // Commit and deploy success handler
  const handleCommitSuccess = (updatedPost: HugoPost, commitUrl?: string) => {
    const updatedList = posts.map((p) => (p.id === updatedPost.id ? updatedPost : p));
    setPosts(updatedList);
    saveCachedPosts(updatedList);

    // Update workflow runs list
    const newRun: GitHubWorkflowRun = {
      id: Date.now(),
      name: 'Deploy Hugo site to Pages',
      status: 'in_progress',
      conclusion: null,
      html_url: commitUrl || 'https://github.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      run_number: (workflowRuns[0]?.run_number || 42) + 1,
      event: 'push',
      head_branch: config.branch || 'main',
      head_commit: {
        id: updatedPost.sha?.substring(0, 7) || 'commit',
        message: `content(posts): update "${updatedPost.frontMatter.title}"`,
        timestamp: new Date().toISOString(),
        author: {
          name: config.owner || 'Hugo Publisher',
          email: 'chz2001@126.com',
        },
      },
    };

    setWorkflowRuns([newRun, ...workflowRuns]);
    showToast('文章已成功推送到 GitHub，自动化部署流水线已启动！');

    // Simulate completion in mock mode after 6 seconds
    if (config.useMock) {
      setTimeout(() => {
        setWorkflowRuns((prev) =>
          prev.map((r) => (r.id === newRun.id ? { ...r, status: 'completed', conclusion: 'success' } : r))
        );
        showToast('GitHub Actions 部署完成！线上站点已同步更新。');
      }, 6000);
    } else {
      // Re-fetch from GitHub
      setTimeout(() => {
        loadWorkflowsFromRemote(config);
      }, 3000);
    }
  };

  // Insert markdown from image upload modal
  const handleInsertImageMarkdown = (text: string) => {
    if (!activePost) return;
    const updatedContent = `${activePost.content}\n${text}`;
    handleUpdatePost({
      ...activePost,
      content: updatedContent,
      isModified: true,
    });
    showToast('已插入图片短代码至文章中');
  };

  const latestWorkflowRun = workflowRuns[0] || null;

  return (
    <div className="h-screen w-screen bg-[#020617] flex flex-col font-sans text-slate-300 antialiased selection:bg-indigo-500/30 selection:text-indigo-200 overflow-hidden">
      {/* Top Navigation Header */}
      <Header
        config={config}
        activePost={activePost}
        hasUnsavedChanges={Boolean(activePost?.isModified)}
        latestWorkflowRun={latestWorkflowRun}
        onOpenSettings={() => setIsConfigOpen(true)}
        onOpenCommitModal={() => setIsCommitOpen(true)}
        onOpenActionsModal={() => setIsActionsOpen(true)}
        onOpenImageModal={() => setIsImageOpen(true)}
      />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Hugo Posts Explorer */}
        <PostList
          posts={posts}
          activePost={activePost}
          onSelectPost={handleSelectPost}
          onCreatePost={() => setIsNewPostOpen(true)}
          onDeletePost={handleDeletePost}
          onDuplicatePost={handleDuplicatePost}
          onResetPost={handleOpenResetModal}
          postsDir={config.postsDir}
        />

        {/* Central & Right: Markdown Editor + Live Preview */}
        {activePost ? (
          <PostEditor
            post={activePost}
            onChangePost={handleUpdatePost}
            onOpenCommitModal={() => setIsCommitOpen(true)}
            onOpenResetModal={() => handleOpenResetModal(activePost)}
            onOpenImageModal={() => setIsImageOpen(true)}
            onShowToast={showToast}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#020617] p-8 text-center text-slate-500">
            <div>
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-700" />
              <p className="text-sm font-medium text-slate-300">尚未选择或创建任何 Hugo 文章</p>
              <button
                onClick={() => setIsNewPostOpen(true)}
                className="mt-3 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-colors"
              >
                新建文章
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl shadow-2xl border text-xs flex items-center gap-2.5 animate-bounce-in backdrop-blur-md ${
            toast.type === 'success'
              ? 'bg-[#0b1120]/95 text-indigo-200 border-indigo-500/30'
              : toast.type === 'error'
              ? 'bg-rose-950/95 text-rose-200 border-rose-800/50'
              : 'bg-slate-900/95 text-slate-200 border-slate-800'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          {toast.type === 'info' && <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Modals */}
      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={config}
        onSaveConfig={handleSaveConfig}
        onResetToDemo={handleResetToDemo}
      />

      <CommitDeployModal
        isOpen={isCommitOpen}
        onClose={() => setIsCommitOpen(false)}
        post={activePost}
        allPosts={posts}
        config={config}
        onCommitSuccess={handleCommitSuccess}
        onSelectPost={handleSelectPost}
        onRequestResetPost={(p) => {
          setIsCommitOpen(false);
          handleOpenResetModal(p);
        }}
      />

      <ResetPostModal
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        post={postToReset}
        config={config}
        onResetSuccess={handleResetSuccess}
        onDiscardNewPost={handleDiscardNewPost}
      />

      <ActionsMonitorModal
        isOpen={isActionsOpen}
        onClose={() => setIsActionsOpen(false)}
        workflowRuns={workflowRuns}
        config={config}
        onRefresh={() => loadWorkflowsFromRemote(config)}
        isLoading={isLoadingWorkflows}
      />

      <ImageUploadModal
        isOpen={isImageOpen}
        onClose={() => setIsImageOpen(false)}
        config={config}
        currentPost={activePost}
        onInsertMarkdown={handleInsertImageMarkdown}
      />

      <NewPostModal
        isOpen={isNewPostOpen}
        onClose={() => setIsNewPostOpen(false)}
        postsDir={config.postsDir}
        onCreate={handleCreatePost}
      />
    </div>
  );
}
