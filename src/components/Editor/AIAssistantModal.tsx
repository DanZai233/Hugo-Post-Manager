import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Check,
  RefreshCw,
  Copy,
  SlidersHorizontal,
  FileText,
  Tag,
  FolderTree,
  ArrowRight,
  Zap,
  Wand2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock
} from 'lucide-react';
import { HugoFrontMatter, HugoPost } from '../../types';
import {
  requestFrontMatterGeneration,
  requestTitleSuggestions,
  requestContentPolishing,
  AIFullFrontMatterResult,
  TitleSuggestion,
} from '../../services/aiService';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: HugoPost;
  onUpdateFrontMatter: (frontMatter: HugoFrontMatter) => void;
  onUpdateContent: (newContent: string) => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  initialTab?: 'all' | 'titles' | 'summary' | 'polish';
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  post,
  onUpdateFrontMatter,
  onUpdateContent,
  onShowToast,
  initialTab = 'all',
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'titles' | 'summary' | 'polish'>(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Tab 1: Full Front Matter state
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [allResult, setAllResult] = useState<AIFullFrontMatterResult | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string>('');

  // Tab 2: Titles state
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState<TitleSuggestion[]>([]);

  // Tab 3: Summary state
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState<string>('');

  // Tab 4: Polish state
  const [isPolishing, setIsPolishing] = useState(false);
  const [polishAction, setPolishAction] = useState<'polish' | 'structure' | 'tldr'>('polish');
  const [polishedOutput, setPolishedOutput] = useState<string>('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handler: Generate full front matter
  const handleGenerateAll = async () => {
    setIsGeneratingAll(true);
    setErrorMessage(null);
    try {
      const res = await requestFrontMatterGeneration({
        title: post.frontMatter.title || post.name,
        content: post.content,
        currentCategories: post.frontMatter.categories,
        currentTags: post.frontMatter.tags,
      });
      setAllResult(res);
      setSelectedTitle(res.recommendedTitle || (res.suggestedTitles && res.suggestedTitles[0]) || '');
    } catch (err: any) {
      setErrorMessage(err.message || '生成失败');
    } finally {
      setIsGeneratingAll(false);
    }
  };

  // Handler: Apply full front matter
  const handleApplyAll = () => {
    if (!allResult) return;
    const updated: HugoFrontMatter = {
      ...post.frontMatter,
      title: selectedTitle || allResult.recommendedTitle || post.frontMatter.title,
      summary: allResult.summary || post.frontMatter.summary,
      description: allResult.summary || post.frontMatter.description,
      categories: allResult.categories && allResult.categories.length > 0 ? allResult.categories : post.frontMatter.categories,
      tags: allResult.tags && allResult.tags.length > 0 ? allResult.tags : post.frontMatter.tags,
      slug: allResult.slug || post.frontMatter.slug,
    };
    onUpdateFrontMatter(updated);
    onShowToast('✨ 已成功将 AI 生成的标题、摘要、分类、标签与别名应用至文章 Front Matter！');
    onClose();
  };

  // Handler: Generate titles
  const handleGenerateTitles = async () => {
    setIsGeneratingTitles(true);
    setErrorMessage(null);
    try {
      const titles = await requestTitleSuggestions({
        title: post.frontMatter.title || post.name,
        content: post.content,
      });
      setTitleSuggestions(titles);
    } catch (err: any) {
      setErrorMessage(err.message || '生成标题失败');
    } finally {
      setIsGeneratingTitles(false);
    }
  };

  // Apply single title
  const handleApplyTitle = (newTitle: string) => {
    onUpdateFrontMatter({
      ...post.frontMatter,
      title: newTitle,
    });
    onShowToast(`已更新标题为: "${newTitle}"`);
  };

  // Handler: Generate summary
  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    setErrorMessage(null);
    try {
      const res = await requestFrontMatterGeneration({
        title: post.frontMatter.title,
        content: post.content,
      });
      setGeneratedSummary(res.summary);
    } catch (err: any) {
      setErrorMessage(err.message || '生成摘要失败');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleApplySummary = () => {
    if (!generatedSummary) return;
    onUpdateFrontMatter({
      ...post.frontMatter,
      summary: generatedSummary,
      description: generatedSummary,
    });
    onShowToast('已将 AI 摘要更新至文章配置！');
  };

  // Handler: Polish Markdown
  const handlePolish = async () => {
    setIsPolishing(true);
    setErrorMessage(null);
    try {
      const result = await requestContentPolishing({
        content: post.content,
        action: polishAction,
      });
      setPolishedOutput(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'AI 润色优化失败');
    } finally {
      setIsPolishing(false);
    }
  };

  const handleApplyPolishedContent = () => {
    if (!polishedOutput) return;
    onUpdateContent(polishedOutput);
    onShowToast('已将 AI 润色排版结果应用到正文编辑器！');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-[#0b1120] rounded-2xl shadow-2xl border border-slate-800 text-slate-300 max-w-2xl w-full p-6 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-600/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-white text-base">Hugo AI 创作与元数据助手</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-xs text-slate-400">
                深度理解 Markdown 正文，智能提炼标题、导语摘要、Hugo 分类标签与排版优化
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

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 py-3 border-b border-slate-800 shrink-0 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>一键全套元数据生成</span>
          </button>

          <button
            onClick={() => setActiveTab('titles')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'titles'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>标题灵感工坊</span>
          </button>

          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'summary'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>导语与摘要提炼</span>
          </button>

          <button
            onClick={() => setActiveTab('polish')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'polish'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Markdown 排版润色</span>
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="my-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs pr-1">
          {/* TAB 1: ALL-IN-ONE */}
          {activeTab === 'all' && (
            <div className="space-y-4">
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-200 text-sm">一键分析文章并生成规范 Hugo Front Matter</p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    基于当前草稿内容（当前字数：{post.content.length}），智能生成爆款标题方案、精炼导语、Hugo 分类、精准标签及 Slug。
                  </p>
                </div>
                <button
                  onClick={handleGenerateAll}
                  disabled={isGeneratingAll}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-600/30 disabled:opacity-50 transition-all shrink-0 ml-4"
                >
                  <Sparkles className={`w-4 h-4 ${isGeneratingAll ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingAll ? 'AI 分析生成中...' : '开始生成'}</span>
                </button>
              </div>

              {allResult && (
                <div className="space-y-3 animate-fade-in">
                  {/* Title candidates */}
                  <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl space-y-2">
                    <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      <span>建议标题方案（点击勾选作为最终标题）：</span>
                    </label>
                    <div className="space-y-1.5">
                      {(allResult.suggestedTitles || [allResult.recommendedTitle]).map((t, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedTitle(t)}
                          className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                            selectedTitle === t
                              ? 'bg-indigo-500/10 border-indigo-500/40 text-white font-medium'
                              : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/40'
                          }`}
                        >
                          <span className="text-xs">{t}</span>
                          {selectedTitle === t && <Check className="w-4 h-4 text-indigo-400 shrink-0 ml-2" />}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary / Description */}
                  <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                      <span>精炼摘要与导语 (Summary & Description)：</span>
                    </label>
                    <p className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-lg text-slate-200 text-xs leading-relaxed">
                      {allResult.summary}
                    </p>
                  </div>

                  {/* Categories and Tags */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                        <FolderTree className="w-3.5 h-3.5 text-indigo-400" />
                        <span>推荐分类 (Categories)：</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {(allResult.categories || []).map((cat) => (
                          <span
                            key={cat}
                            className="px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-mono"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 text-indigo-400" />
                        <span>推荐标签 (Tags)：</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {(allResult.tags || []).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-mono"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Slug */}
                  <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-xs">规范链接别名 (Slug):</span>
                      <code className="text-indigo-300 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {allResult.slug}
                      </code>
                    </div>
                  </div>

                  {/* Apply action bar */}
                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      onClick={handleApplyAll}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>一键应用全部配置至文章 Front Matter</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TITLES */}
          {activeTab === 'titles' && (
            <div className="space-y-4">
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-200">生成 5 个高曝光科技博客标题</p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    涵盖专业指南、避坑实践、架构深入浅出等多种风格，点击任意一行即可替换文章标题。
                  </p>
                </div>
                <button
                  onClick={handleGenerateTitles}
                  disabled={isGeneratingTitles}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md disabled:opacity-50 transition-colors shrink-0 ml-3"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isGeneratingTitles ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingTitles ? '构思中...' : '生成标题建议'}</span>
                </button>
              </div>

              {titleSuggestions.length > 0 && (
                <div className="space-y-2 animate-fade-in">
                  {titleSuggestions.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between hover:border-indigo-500/40 transition-colors"
                    >
                      <div className="space-y-1">
                        <span className="text-white text-xs font-medium block">{item.title}</span>
                        <span className="text-[10px] text-indigo-400 font-mono bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                          {item.style}
                        </span>
                      </div>
                      <button
                        onClick={() => handleApplyTitle(item.title)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 text-xs font-medium transition-colors shrink-0 ml-3"
                      >
                        <Check className="w-3 h-3" />
                        <span>采纳此标题</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SUMMARY */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-200">智能提炼文章摘要与导言</p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    提取文章核心观点，生成符合 Hugo 列表卡片预览与 SEO Meta Description 规范的导读文本。
                  </p>
                </div>
                <button
                  onClick={handleGenerateSummary}
                  disabled={isGeneratingSummary}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md disabled:opacity-50 transition-colors shrink-0 ml-3"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isGeneratingSummary ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingSummary ? '提炼中...' : '提取摘要'}</span>
                </button>
              </div>

              {generatedSummary && (
                <div className="space-y-3 animate-fade-in">
                  <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl space-y-2">
                    <label className="text-[11px] font-semibold text-slate-400">生成的摘要文本：</label>
                    <textarea
                      value={generatedSummary}
                      onChange={(e) => setGeneratedSummary(e.target.value)}
                      rows={3}
                      className="w-full p-2.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={handleApplySummary}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>应用到文章 description & summary</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: POLISH */}
          {activeTab === 'polish' && (
            <div className="space-y-4">
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-3">
                <p className="font-semibold text-slate-200">Markdown 正文结构与语言排版优化</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPolishAction('polish')}
                    className={`p-2 rounded-lg text-left border transition-all ${
                      polishAction === 'polish'
                        ? 'bg-indigo-500/10 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <div className="font-semibold text-xs">排版美化</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">纠正标点错别字与技术用词</div>
                  </button>

                  <button
                    onClick={() => setPolishAction('structure')}
                    className={`p-2 rounded-lg text-left border transition-all ${
                      polishAction === 'structure'
                        ? 'bg-indigo-500/10 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <div className="font-semibold text-xs">层级结构化</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">梳理 H2/H3 目录及核心要点</div>
                  </button>

                  <button
                    onClick={() => setPolishAction('tldr')}
                    className={`p-2 rounded-lg text-left border transition-all ${
                      polishAction === 'tldr'
                        ? 'bg-indigo-500/10 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <div className="font-semibold text-xs">生成 TL;DR</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">正文顶部插入核心速览引用块</div>
                  </button>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handlePolish}
                    disabled={isPolishing}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md disabled:opacity-50 transition-colors"
                  >
                    <Wand2 className={`w-3.5 h-3.5 ${isPolishing ? 'animate-spin' : ''}`} />
                    <span>{isPolishing ? '正在优化排版...' : '执行排版优化'}</span>
                  </button>
                </div>
              </div>

              {polishedOutput && (
                <div className="space-y-3 animate-fade-in">
                  <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl space-y-2">
                    <label className="text-[11px] font-semibold text-slate-400">处理后的 Markdown 正文预览：</label>
                    <textarea
                      value={polishedOutput}
                      onChange={(e) => setPolishedOutput(e.target.value)}
                      rows={8}
                      className="w-full p-3 font-mono text-xs bg-slate-950/90 text-slate-200 border border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={handleApplyPolishedContent}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>应用优化结果至编辑器</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500 text-[11px]">
            提示：随时可在编辑器中进行二次编辑与撤销
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
