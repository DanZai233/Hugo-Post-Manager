import React, { useState } from 'react';
import {
  Calendar,
  Tag,
  FolderTree,
  FileCode,
  SlidersHorizontal,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  Check,
  Image as ImageIcon,
  HelpCircle,
  Code,
  Sparkles,
  Wand2
} from 'lucide-react';
import * as yaml from 'js-yaml';
import { HugoFrontMatter } from '../../types';
import { generateHugoDate } from '../../services/hugoParser';

interface FrontMatterPanelProps {
  frontMatter: HugoFrontMatter;
  onChange: (updated: HugoFrontMatter) => void;
  rawYamlMode: boolean;
  onToggleRawYamlMode: () => void;
  onOpenAIAssistant?: (tab?: 'all' | 'titles' | 'summary' | 'polish') => void;
}

export const FrontMatterPanel: React.FC<FrontMatterPanelProps> = ({
  frontMatter,
  onChange,
  rawYamlMode,
  onToggleRawYamlMode,
  onOpenAIAssistant,
}) => {
  const [tagInput, setTagInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [newParamKey, setNewParamKey] = useState('');
  const [newParamValue, setNewParamValue] = useState('');
  const [rawYamlText, setRawYamlText] = useState('');
  const [yamlError, setYamlError] = useState<string | null>(null);

  // Sync to raw YAML when entering raw mode
  const handleToggleRaw = () => {
    if (!rawYamlMode) {
      try {
        const dump = yaml.dump(frontMatter, { indent: 2 });
        setRawYamlText(dump);
        setYamlError(null);
      } catch (e: any) {
        setYamlError('无法序列化 YAML: ' + e.message);
      }
    }
    onToggleRawYamlMode();
  };

  const handleApplyRawYaml = (text: string) => {
    setRawYamlText(text);
    try {
      const parsed = yaml.load(text) as any;
      if (typeof parsed === 'object' && parsed !== null) {
        onChange({
          ...frontMatter,
          ...parsed,
          title: parsed.title || frontMatter.title,
          date: parsed.date ? String(parsed.date) : frontMatter.date,
          draft: typeof parsed.draft === 'boolean' ? parsed.draft : frontMatter.draft,
        });
        setYamlError(null);
      }
    } catch (e: any) {
      setYamlError('YAML 语法错误: ' + e.message);
    }
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    const currentTags = frontMatter.tags || [];
    if (!currentTags.includes(tagInput.trim())) {
      onChange({
        ...frontMatter,
        tags: [...currentTags, tagInput.trim()],
      });
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange({
      ...frontMatter,
      tags: (frontMatter.tags || []).filter((t) => t !== tagToRemove),
    });
  };

  const handleAddCategory = () => {
    if (!categoryInput.trim()) return;
    const currentCats = frontMatter.categories || [];
    if (!currentCats.includes(categoryInput.trim())) {
      onChange({
        ...frontMatter,
        categories: [...currentCats, categoryInput.trim()],
      });
    }
    setCategoryInput('');
  };

  const handleRemoveCategory = (catToRemove: string) => {
    onChange({
      ...frontMatter,
      categories: (frontMatter.categories || []).filter((c) => c !== catToRemove),
    });
  };

  const handleSetCurrentDate = () => {
    onChange({
      ...frontMatter,
      date: generateHugoDate(),
    });
  };

  const handleAddCustomParam = () => {
    if (!newParamKey.trim()) return;
    const custom = { ...(frontMatter.customParams || {}) };
    let val: any = newParamValue.trim();
    if (val === 'true') val = true;
    else if (val === 'false') val = false;
    else if (!isNaN(Number(val)) && val !== '') val = Number(val);

    custom[newParamKey.trim()] = val;
    onChange({
      ...frontMatter,
      customParams: custom,
    });
    setNewParamKey('');
    setNewParamValue('');
  };

  const handleRemoveCustomParam = (key: string) => {
    const custom = { ...(frontMatter.customParams || {}) };
    delete custom[key];
    onChange({
      ...frontMatter,
      customParams: custom,
    });
  };

  return (
    <div id="front-matter-panel" className="bg-[#0b1120] border-b border-slate-800 p-4 transition-all text-slate-300 shrink-0">
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Hugo Front Matter (文章元配置)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenAIAssistant && (
            <button
              type="button"
              onClick={() => onOpenAIAssistant('all')}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-sm shadow-indigo-600/30 transition-all"
              title="使用 Gemini AI 一键生成全套 Front Matter 元数据"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI 全套生成</span>
            </button>
          )}

          <button
            onClick={handleToggleRaw}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
            title="切换可视表单与原始 YAML 编辑模式"
          >
            <Code className="w-3.5 h-3.5 text-slate-400" />
            <span>{rawYamlMode ? '切换为表单模式' : '原始 YAML 代码'}</span>
          </button>
        </div>
      </div>

      {rawYamlMode ? (
        <div className="space-y-2">
          <textarea
            value={rawYamlText}
            onChange={(e) => handleApplyRawYaml(e.target.value)}
            rows={8}
            className="w-full p-3 font-mono text-xs bg-slate-950/90 text-slate-100 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            placeholder="---&#10;title: 'Post Title'&#10;date: 2026-09-02T20:00:00+08:00&#10;draft: false&#10;---"
          />
          {yamlError ? (
            <p className="text-xs text-rose-400 font-mono">{yamlError}</p>
          ) : (
            <p className="text-[11px] text-slate-500">已启用双向实时同步，编辑 YAML 将即时更新文章属性</p>
          )}
        </div>
      ) : (
        <div className="space-y-3 text-xs">
          {/* Top row: Title & Draft toggle */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-8">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-slate-400">
                  文章标题 (title) <span className="text-rose-400">*</span>
                </label>
                {onOpenAIAssistant && (
                  <button
                    type="button"
                    onClick={() => onOpenAIAssistant('titles')}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium hover:underline transition-colors"
                    title="根据正文让 AI 生成 5 个爆款或专业技术标题"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                    <span>AI 标题灵感</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                value={frontMatter.title}
                onChange={(e) => onChange({ ...frontMatter, title: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-950/70 border border-slate-800 rounded-lg font-medium text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="输入文章标题..."
              />
            </div>

            {/* Draft status switcher */}
            <div className="md:col-span-4 flex items-center justify-between bg-slate-900/80 border border-slate-800 px-3 py-2 rounded-lg">
              <div>
                <span className="font-medium text-white block text-xs">草稿状态 (draft)</span>
                <span className="text-[10px] text-slate-400">
                  {frontMatter.draft ? '草稿 (线上部署时不渲染)' : '已发布 (正式可见)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onChange({ ...frontMatter, draft: !frontMatter.draft })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  frontMatter.draft ? 'bg-amber-500' : 'bg-emerald-600'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    frontMatter.draft ? 'translate-x-0' : 'translate-x-4'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Second row: Date, Slug, Author */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  <span>发布时间 (date)</span>
                </label>
                <button
                  onClick={handleSetCurrentDate}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                  title="更新为当前时间"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>现在</span>
                </button>
              </div>
              <input
                type="text"
                value={frontMatter.date}
                onChange={(e) => onChange({ ...frontMatter, date: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-950/70 border border-slate-800 rounded-lg font-mono text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                永久链接别名 (slug)
              </label>
              <input
                type="text"
                value={frontMatter.slug || ''}
                onChange={(e) => onChange({ ...frontMatter, slug: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-950/70 border border-slate-800 rounded-lg font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="例如: my-first-post"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                作者 (author)
              </label>
              <input
                type="text"
                value={frontMatter.author || ''}
                onChange={(e) => onChange({ ...frontMatter, author: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-950/70 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="博主昵称..."
              />
            </div>
          </div>

          {/* Third row: Tags and Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Tags */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-slate-500" />
                  <span>标签 (tags)</span>
                </label>
                {onOpenAIAssistant && (
                  <button
                    type="button"
                    onClick={() => onOpenAIAssistant('all')}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium hover:underline transition-colors"
                    title="AI 提取正文关键词标签"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                    <span>AI 推荐标签</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="输入标签按回车..."
                  className="flex-1 px-2.5 py-1.5 bg-slate-950/70 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
                >
                  添加
                </button>
              </div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {(frontMatter.tags || []).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-mono"
                  >
                    <span>#{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-slate-500 hover:text-slate-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
                <FolderTree className="w-3 h-3 text-slate-500" />
                <span>分类 (categories)</span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                  placeholder="输入分类按回车..."
                  className="flex-1 px-2.5 py-1.5 bg-slate-950/70 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
                >
                  添加
                </button>
              </div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {(frontMatter.categories || []).map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] font-mono"
                  >
                    <span>{cat}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(cat)}
                      className="text-indigo-400 hover:text-indigo-200 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Description & Cover */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-slate-400">
                  文章摘要 / 描述 (description / summary)
                </label>
                {onOpenAIAssistant && (
                  <button
                    type="button"
                    onClick={() => onOpenAIAssistant('summary')}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium hover:underline transition-colors"
                    title="由 AI 提炼 1-2 句精炼导语用于 Hugo 卡片摘要及 SEO"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                    <span>AI 提炼摘要</span>
                  </button>
                )}
              </div>
              <textarea
                value={frontMatter.description || frontMatter.summary || ''}
                onChange={(e) => onChange({ ...frontMatter, description: e.target.value, summary: e.target.value })}
                rows={2}
                className="w-full px-2.5 py-1.5 bg-slate-950/70 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="简述文章要点，用于博客列表和 SEO 描述..."
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
                <ImageIcon className="w-3 h-3 text-slate-500" />
                <span>文章封面图 URL (cover.image)</span>
              </label>
              <input
                type="text"
                value={frontMatter.cover?.image || ''}
                onChange={(e) =>
                  onChange({
                    ...frontMatter,
                    cover: {
                      ...(frontMatter.cover || {}),
                      image: e.target.value,
                    },
                  })
                }
                className="w-full px-2.5 py-1.5 bg-slate-950/70 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 mb-1.5"
                placeholder="https://... 或 /images/cover.png"
              />
              <div className="flex items-center gap-4 text-[11px] text-slate-400">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={frontMatter.toc !== false}
                    onChange={(e) => onChange({ ...frontMatter, toc: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>显示目录 (toc)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(frontMatter.math)}
                    onChange={(e) => onChange({ ...frontMatter, math: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>启用数学公式 (math)</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
