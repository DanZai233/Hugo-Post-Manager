import React, { useState, useEffect } from 'react';
import {
  X,
  FilePlus,
  Folder,
  Tag,
  FolderTree,
  FileText,
  FolderArchive,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { HugoFrontMatter, HugoPost } from '../types';
import { generateHugoDate } from '../services/hugoParser';

interface NewPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  postsDir: string;
  onCreate: (newPost: HugoPost) => void;
}

export const NewPostModal: React.FC<NewPostModalProps> = ({
  isOpen,
  onClose,
  postsDir,
  onCreate,
}) => {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [structureType, setStructureType] = useState<'bundle' | 'single'>('bundle');
  const [targetDir, setTargetDir] = useState(postsDir || 'content/post');
  const [draft, setDraft] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [categoriesInput, setCategoriesInput] = useState('');
  const [summary, setSummary] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTargetDir(postsDir || 'content/post');
      setTitle('');
      setSlug('');
      setDraft(false);
      setTagsInput('');
      setCategoriesInput('');
      setSummary('');
    }
  }, [isOpen, postsDir]);

  if (!isOpen) return null;

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slug || slug === title.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-')) {
      const generated = val
        .trim()
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generated);
    }
  };

  const cleanSlug = (slug || 'untitled-post')
    .trim()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const cleanDir = targetDir.replace(/^\/+|\/+$/g, '');

  // Calculate final file path
  const finalFilePath =
    structureType === 'bundle'
      ? `${cleanDir}/${cleanSlug}/index.md`
      : `${cleanDir}/${cleanSlug}.md`;

  const finalFileName =
    structureType === 'bundle'
      ? 'index.md'
      : `${cleanSlug}.md`;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsInput
      .split(/[,，\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    const categories = categoriesInput
      .split(/[,，\s]+/)
      .map((c) => c.trim())
      .filter(Boolean);

    const frontMatter: HugoFrontMatter = {
      title: title.trim(),
      date: generateHugoDate(),
      draft,
      slug: cleanSlug,
      tags,
      categories,
      summary: summary.trim() || undefined,
      toc: true,
    };

    const initialContent = `## 引言

在这里开始书写文章内容...

<!--more-->

### 章节一

详细阐述你的技术见解或生活记录。
`;

    const newPost: HugoPost = {
      id: finalFilePath,
      name: finalFileName,
      path: finalFilePath,
      frontMatter,
      content: initialContent,
      rawContent: '',
      isModified: true,
      isNew: true,
      lastModified: frontMatter.date,
    };

    onCreate(newPost);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#0b1120] rounded-2xl shadow-2xl border border-slate-800 text-slate-300 max-w-lg w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <FilePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-white text-base">新建 Hugo 文章</h2>
              <p className="text-xs text-slate-400">支持 Hugo 页面束 (Page Bundle) 与单文件格式，自动生成 Front Matter</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleCreate} className="py-4 space-y-4 text-xs">
          {/* Structure Format Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>文章组织结构 (Structure Format)</span>
              <span className="text-[11px] text-indigo-400 font-normal">根据您的博客主题规范选择</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStructureType('bundle')}
                className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  structureType === 'bundle'
                    ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-200'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <FolderArchive className="w-4 h-4 mt-0.5 shrink-0 text-indigo-400" />
                <div>
                  <div className="font-semibold text-xs flex items-center gap-1">
                    <span>页面束 (Page Bundle)</span>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1 py-0.2 rounded font-normal">推荐</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">目录/index.md，支持文章同级放配图</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStructureType('single')}
                className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  structureType === 'single'
                    ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-200'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <FileText className="w-4 h-4 mt-0.5 shrink-0 text-indigo-400" />
                <div>
                  <div className="font-semibold text-xs">单文件 (Single Markdown)</div>
                  <p className="text-[10px] text-slate-500 mt-0.5">目录/slug.md 传统单一文章</p>
                </div>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              文章标题 <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="例如: 探索 Hugo Page Bundle 最佳实践"
              className="w-full px-3 py-2 text-xs bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Directory and Slug */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                <Folder className="w-3.5 h-3.5 text-slate-400" />
                <span>目标文章目录</span>
              </label>
              <input
                type="text"
                value={targetDir}
                onChange={(e) => setTargetDir(e.target.value)}
                placeholder="content/post"
                className="w-full px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 font-mono text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                <span>Slug 别名</span>
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="my-new-post"
                className="w-full px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 font-mono text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Real-time Path preview box */}
          <div className="p-2.5 rounded-lg bg-indigo-500/5 border border-indigo-500/20 text-[11px] font-mono flex items-center gap-2">
            <span className="text-indigo-400 shrink-0">预计生成路径:</span>
            <span className="text-slate-200 truncate">{finalFilePath}</span>
          </div>

          {/* Tags and Categories */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                <Tag className="w-3 h-3 text-slate-500" />
                <span>标签 (逗号分隔)</span>
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Hugo, Frontend, Web"
                className="w-full px-2.5 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                <FolderTree className="w-3 h-3 text-slate-500" />
                <span>分类</span>
              </label>
              <input
                type="text"
                value={categoriesInput}
                onChange={(e) => setCategoriesInput(e.target.value)}
                placeholder="技术分享"
                className="w-full px-2.5 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Draft Toggle */}
          <div className="flex items-center justify-between p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
            <div>
              <span className="font-medium text-white block text-xs">设为草稿 (draft: true)</span>
              <span className="text-[10px] text-slate-400">正式构建部署时草稿默认不会公开</span>
            </div>
            <input
              type="checkbox"
              checked={draft}
              onChange={(e) => setDraft(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          {/* Summary */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              文章简述 (可选，用于卡片预览)
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              placeholder="简要概括本篇文章核心要点..."
              className="w-full px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              id="btn-confirm-create-post"
              type="submit"
              disabled={!title.trim()}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-600/20 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>创建并开始写作</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
