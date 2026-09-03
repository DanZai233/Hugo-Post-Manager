import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  FileText,
  Clock,
  Tag,
  Trash2,
  Copy,
  FolderOpen,
  Filter,
  CheckCircle2,
  FileEdit,
  ChevronRight,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { HugoPost } from '../types';

interface PostListProps {
  posts: HugoPost[];
  activePost: HugoPost | null;
  onSelectPost: (post: HugoPost) => void;
  onCreatePost: () => void;
  onDeletePost: (post: HugoPost) => void;
  onDuplicatePost: (post: HugoPost) => void;
  onResetPost?: (post: HugoPost) => void;
  postsDir: string;
}

export const PostList: React.FC<PostListProps> = ({
  posts,
  activePost,
  onSelectPost,
  onCreatePost,
  onDeletePost,
  onDuplicatePost,
  onResetPost,
  postsDir,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    posts.forEach((p) => {
      p.frontMatter.tags?.forEach((t) => tagsSet.add(t));
    });
    return Array.from(tagsSet);
  }, [posts]);

  // Filtered posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      // Status filter
      if (statusFilter === 'published' && post.frontMatter.draft) return false;
      if (statusFilter === 'draft' && !post.frontMatter.draft) return false;

      // Tag filter
      if (selectedTag && !post.frontMatter.tags?.includes(selectedTag)) return false;

      // Query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = post.frontMatter.title?.toLowerCase().includes(query);
        const slugMatch = post.frontMatter.slug?.toLowerCase().includes(query);
        const nameMatch = post.name.toLowerCase().includes(query);
        const tagMatch = post.frontMatter.tags?.some((t) => t.toLowerCase().includes(query));
        const contentMatch = post.content?.toLowerCase().includes(query);
        return titleMatch || slugMatch || nameMatch || tagMatch || contentMatch;
      }

      return true;
    });
  }, [posts, statusFilter, selectedTag, searchQuery]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } catch {
      return dateStr.slice(0, 10);
    }
  };

  return (
    <aside
      id="post-list-sidebar"
      className="w-80 md:w-88 h-full bg-[#0f172a] border-r border-slate-800 flex flex-col shrink-0 select-none overflow-hidden"
    >
      {/* Top action bar: Search & New post button */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-900/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span className="truncate max-w-[140px]" title={postsDir}>{postsDir}</span>
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">
              {posts.length} 篇
            </span>
          </div>

          <button
            id="btn-create-new-post"
            onClick={onCreatePost}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新建</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            id="input-search-posts"
            type="text"
            placeholder="搜索标题、标签、内容..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950/70 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              statusFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            全部 ({posts.length})
          </button>
          <button
            onClick={() => setStatusFilter('published')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              statusFilter === 'published'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            已发布 ({posts.filter((p) => !p.frontMatter.draft).length})
          </button>
          <button
            onClick={() => setStatusFilter('draft')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              statusFilter === 'draft'
                ? 'bg-amber-600 text-white'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            草稿 ({posts.filter((p) => p.frontMatter.draft).length})
          </button>
        </div>

        {/* Tag filter pills (scrollable) */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs no-scrollbar">
            <span className="text-slate-500 shrink-0 flex items-center gap-1 text-[11px]">
              <Tag className="w-3 h-3 text-slate-500" />
            </span>
            {selectedTag && (
              <button
                onClick={() => setSelectedTag(null)}
                className="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-medium shrink-0 hover:bg-indigo-500/30 text-[11px]"
              >
                重置
              </button>
            )}
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-2 py-0.5 rounded-md shrink-0 border transition-all text-[11px] font-mono ${
                  selectedTag === tag
                    ? 'bg-indigo-600 border-indigo-500 text-white font-medium shadow-xs'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Posts List Body */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {filteredPosts.length === 0 ? (
          <div className="text-center py-12 px-4">
            <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-400">没有匹配的文章</p>
            <p className="text-[11px] text-slate-600 mt-1">尝试调整搜索关键词或状态过滤器</p>
            <button
              onClick={onCreatePost}
              className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新建第一篇</span>
            </button>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const isSelected = activePost?.id === post.id;
            const isDraft = Boolean(post.frontMatter.draft);

            return (
              <div
                key={post.id}
                onClick={() => onSelectPost(post)}
                className={`group relative p-3 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-500/10 border-l-2 border-indigo-500 border-slate-700 shadow-md'
                    : 'bg-slate-900/40 hover:bg-slate-800/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header: Status and Date */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isDraft
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isDraft ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                      {isDraft ? '草稿' : '已发布'}
                    </span>

                    {post.isModified && (
                      <span className="text-[10px] font-medium text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                        未同步
                      </span>
                    )}

                    {post.isNew && (
                      <span className="text-[10px] font-medium text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded border border-indigo-500/30">
                        新文章
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-500 font-mono">
                    {formatDate(post.frontMatter.date)}
                  </span>
                </div>

                {/* Title */}
                <h3 className={`text-xs font-semibold leading-snug line-clamp-2 ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                  {post.frontMatter.title || post.name}
                </h3>

                {/* Tags preview */}
                {post.frontMatter.tags && post.frontMatter.tags.length > 0 && (
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    {post.frontMatter.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] bg-slate-800/80 text-slate-400 border border-slate-700/50 px-1.5 py-0.5 rounded font-mono"
                      >
                        #{tag}
                      </span>
                    ))}
                    {post.frontMatter.tags.length > 3 && (
                      <span className="text-[10px] text-slate-500 font-mono">+{post.frontMatter.tags.length - 3}</span>
                    )}
                  </div>
                )}

                {/* Path and actions row */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
                  <span className="font-mono truncate max-w-[170px]" title={post.path}>
                    {post.name === 'index.md'
                      ? post.path.split('/').slice(-2).join('/')
                      : post.name}
                  </span>

                  {/* Quick actions hover */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {(post.isModified || post.isNew) && onResetPost && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onResetPost(post);
                        }}
                        className="p-1 hover:text-amber-300 hover:bg-amber-500/15 rounded text-slate-400 transition-colors"
                        title="放弃修改，重置并恢复与线上一致"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicatePost(post);
                      }}
                      className="p-1 hover:text-white hover:bg-slate-800 rounded text-slate-400 transition-colors"
                      title="复制文章"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePost(post);
                      }}
                      className="p-1 hover:text-rose-400 hover:bg-rose-500/10 rounded text-slate-400 transition-colors"
                      title="删除文章"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
