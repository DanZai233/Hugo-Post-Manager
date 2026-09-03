import React, { useState, useRef } from 'react';
import {
  FileText,
  Save,
  Check,
  ChevronDown,
  ChevronUp,
  FileCode,
  Eye,
  SlidersHorizontal,
  Clock,
  Sparkles,
  Layers,
  Wand2,
  GitCompare,
  RotateCcw
} from 'lucide-react';
import { HugoFrontMatter, HugoPost } from '../../types';
import { FrontMatterPanel } from './FrontMatterPanel';
import { MarkdownToolbar } from './MarkdownToolbar';
import { HugoPreview } from './HugoPreview';
import { AIAssistantModal } from './AIAssistantModal';

interface PostEditorProps {
  post: HugoPost;
  onChangePost: (updated: HugoPost) => void;
  onOpenCommitModal: () => void;
  onOpenResetModal?: () => void;
  onOpenImageModal: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const PostEditor: React.FC<PostEditorProps> = ({
  post,
  onChangePost,
  onOpenCommitModal,
  onOpenResetModal,
  onOpenImageModal,
  onShowToast,
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [isFrontMatterOpen, setIsFrontMatterOpen] = useState(true);
  const [rawYamlMode, setRawYamlMode] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiInitialTab, setAiInitialTab] = useState<'all' | 'titles' | 'summary' | 'polish'>('all');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Synchronize front matter changes
  const handleFrontMatterChange = (updatedFrontMatter: HugoFrontMatter) => {
    onChangePost({
      ...post,
      frontMatter: updatedFrontMatter,
      isModified: true,
    });
  };

  // Synchronize content changes
  const handleContentChange = (newContent: string) => {
    onChangePost({
      ...post,
      content: newContent,
      isModified: true,
    });
  };

  // Open AI modal with designated tab
  const handleOpenAIAssistant = (tab: 'all' | 'titles' | 'summary' | 'polish' = 'all') => {
    setAiInitialTab(tab);
    setIsAIModalOpen(true);
  };

  // Insert markdown text at cursor position
  const handleInsertText = (before: string, after: string = '', defaultContent: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = post.content;
    const selectedText = currentText.substring(start, end) || defaultContent;

    const replacement = `${before}${selectedText}${after}`;
    const newText = currentText.substring(0, start) + replacement + currentText.substring(end);

    handleContentChange(newText);

    // Reposition cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      );
    }, 0);
  };

  // Keyboard shortcut handlers
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      handleInsertText('**', '**', '粗体');
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      handleInsertText('*', '*', '斜体');
    } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      onOpenCommitModal();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleInsertText('  ');
    }
  };

  return (
    <main id="post-editor-main" className="flex-1 flex flex-col h-full overflow-hidden bg-[#0f172a]">
      {/* Article Bar */}
      <div className="h-11 border-b border-slate-800 bg-slate-900/70 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <FileText className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-mono font-medium text-white">{post.name}</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400 truncate max-w-[200px] md:max-w-md">
            {post.frontMatter.title}
          </span>

          {post.isModified && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onOpenCommitModal}
                className="text-[10px] font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1 cursor-pointer transition-colors"
                title="点击查看改动文件与 Git Diff 差异对比"
              >
                <GitCompare className="w-3 h-3" />
                <span>未同步修改 · 提交预览</span>
              </button>

              {onOpenResetModal && (
                <button
                  id="btn-open-reset-post"
                  type="button"
                  onClick={onOpenResetModal}
                  className="text-[10px] font-medium text-slate-400 hover:text-rose-300 bg-slate-800/80 hover:bg-rose-500/10 px-2 py-0.5 rounded border border-slate-700/60 hover:border-rose-500/30 flex items-center gap-1 cursor-pointer transition-colors"
                  title="放弃本篇所有未同步修改，一键恢复与线上远程版本一致"
                >
                  <RotateCcw className="w-3 h-3 text-slate-400" />
                  <span>重置文章</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* AI Assistant Button */}
          <button
            onClick={() => handleOpenAIAssistant('all')}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all border border-indigo-400/30 active:scale-95"
            title="AI 智能生成标题、正文摘要、分类、标签及文案润色"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-300" />
            <span>Hugo AI 创作助手</span>
          </button>

          {/* Toggle Front Matter Collapse */}
          <button
            onClick={() => setIsFrontMatterOpen(!isFrontMatterOpen)}
            className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-white px-2.5 py-1 rounded-md hover:bg-slate-800/80 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span>Front Matter 配置</span>
            {isFrontMatterOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Front Matter Collapsible Panel */}
      {isFrontMatterOpen && (
        <FrontMatterPanel
          frontMatter={post.frontMatter}
          onChange={handleFrontMatterChange}
          rawYamlMode={rawYamlMode}
          onToggleRawYamlMode={() => setRawYamlMode(!rawYamlMode)}
          onOpenAIAssistant={handleOpenAIAssistant}
        />
      )}

      {/* Markdown Toolbar */}
      <MarkdownToolbar
        onInsertText={handleInsertText}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        onOpenImageModal={onOpenImageModal}
        onOpenAIAssistant={handleOpenAIAssistant}
      />

      {/* Main Editing & Preview Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Markdown Editor */}
        {(viewMode === 'split' || viewMode === 'edit') && (
          <div className={`h-full flex flex-col bg-[#0b1120] ${viewMode === 'split' ? 'w-1/2 border-r border-slate-800' : 'w-full'}`}>
            <textarea
              id="markdown-textarea"
              ref={textareaRef}
              value={post.content}
              onChange={(e) => handleContentChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="在这里输入 Hugo 文章的 Markdown 正文内容..."
              className="flex-1 p-5 w-full resize-none font-mono text-xs md:text-sm leading-relaxed text-slate-200 bg-[#0b1120] focus:outline-none focus:ring-0 selection:bg-indigo-600/30 placeholder:text-slate-600"
              spellCheck={false}
            />

            {/* Bottom Status Bar with Bento style indicator */}
            <div className="h-8 border-t border-slate-800 bg-[#0f172a] px-4 flex items-center justify-between text-[11px] text-slate-500 font-mono shrink-0">
              <div className="flex items-center gap-4">
                <span>字符数: <strong className="text-slate-300 font-normal">{post.content.length}</strong></span>
                <span>行数: <strong className="text-slate-300 font-normal">{post.content.split('\n').length}</strong></span>
                <span className="hidden sm:inline text-slate-600">|</span>
                <span className="hidden sm:inline">UTF-8 · Markdown</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-slate-950/80 px-2.5 py-0.5 rounded-full text-[10px] text-slate-400 border border-slate-800">
                  Ctrl+B 粗体 · Ctrl+S 同步
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Right Column: Hugo Live Preview */}
        {(viewMode === 'split' || viewMode === 'preview') && (
          <div className={`h-full ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
            <HugoPreview frontMatter={post.frontMatter} content={post.content} />
          </div>
        )}
      </div>

      {/* AI Assistant Modal */}
      <AIAssistantModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        post={post}
        onUpdateFrontMatter={handleFrontMatterChange}
        onUpdateContent={handleContentChange}
        onShowToast={onShowToast}
        initialTab={aiInitialTab}
      />
    </main>
  );
};
