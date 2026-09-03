import React from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Code,
  FileCode,
  Quote,
  List,
  ListOrdered,
  ListTodo,
  Link,
  Image as ImageIcon,
  Table,
  Minus,
  SplitSquareVertical,
  Columns,
  Maximize2,
  Minimize2,
  Sparkles,
  Layers,
  Scissors
} from 'lucide-react';

interface MarkdownToolbarProps {
  onInsertText: (before: string, after?: string, defaultContent?: string) => void;
  viewMode: 'split' | 'edit' | 'preview';
  onChangeViewMode: (mode: 'split' | 'edit' | 'preview') => void;
  onOpenImageModal: () => void;
  onOpenAIAssistant?: (tab?: 'all' | 'titles' | 'summary' | 'polish') => void;
}

export const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({
  onInsertText,
  viewMode,
  onChangeViewMode,
  onOpenImageModal,
  onOpenAIAssistant,
}) => {
  return (
    <div
      id="markdown-toolbar"
      className="border-b border-slate-800 bg-slate-900/80 px-3 py-1.5 flex items-center justify-between gap-1 select-none overflow-x-auto shrink-0"
    >
      {/* Formatting buttons */}
      <div className="flex items-center gap-0.5 text-slate-400">
        <button
          type="button"
          onClick={() => onInsertText('# ', '', '一级标题')}
          className="p-1.5 hover:bg-slate-800 hover:text-white rounded transition-colors"
          title="一级标题 (H1)"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onInsertText('## ', '', '二级标题')}
          className="p-1.5 hover:bg-slate-800 hover:text-white rounded transition-colors"
          title="二级标题 (H2)"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onInsertText('### ', '', '三级标题')}
          className="p-1.5 hover:bg-slate-800 hover:text-white rounded transition-colors"
          title="三级标题 (H3)"
        >
          <Heading3 className="w-4 h-4" />
        </button>

        <span className="h-4 w-px bg-slate-800 mx-1" />

        <button
          type="button"
          onClick={() => onInsertText('**', '**', '粗体文本')}
          className="p-1.5 hover:bg-slate-800 hover:text-white rounded transition-colors"
          title="粗体 (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onInsertText('*', '*', '斜体文本')}
          className="p-1.5 hover:bg-slate-800 hover:text-white rounded transition-colors"
          title="斜体 (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onInsertText('~~', '~~', '删除线文本')}
          className="p-1.5 hover:bg-slate-800 hover:text-white rounded transition-colors"
          title="删除线"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <span className="h-4 w-px bg-slate-800 mx-1" />

        <button
          type="button"
          onClick={() => onInsertText('`', '`', 'code')}
          className="p-1.5 hover:bg-slate-800 hover:text-white rounded transition-colors"
          title="行内代码"
        >
          <Code className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onInsertText('```go\n', '\n```', '// 代码内容')}
          className="p-1.5 hover:bg-slate-800 hover:text-white rounded transition-colors"
          title="代码块"
        >
          <FileCode className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onInsertText('> ', '', '引用内容')}
          className="p-1.5 hover:bg-slate-800 hover:text-white rounded transition-colors"
          title="引用区块"
        >
          <Quote className="w-4 h-4" />
        </button>

        <span className="h-4 w-px bg-slate-800 mx-1" />

        <button
          type="button"
          onClick={() => onInsertText('- ', '', '无序列表项')}
          className="p-1.5 hover:bg-slate-800 hover:text-white rounded transition-colors"
          title="无序列表"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onInsertText('1. ', '', '有序列表项')}
          className="p-1.5 hover:bg-slate-800 hover:text-white rounded transition-colors"
          title="有序列表"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onInsertText('- [ ] ', '', '待办事项')}
          className="p-1.5 hover:bg-slate-800 hover:text-white rounded transition-colors"
          title="任务清单"
        >
          <ListTodo className="w-4 h-4" />
        </button>

        <span className="h-4 w-px bg-slate-800 mx-1" />

        <button
          type="button"
          onClick={() => onInsertText('[', '](https://example.com)', '链接描述')}
          className="p-1.5 hover:bg-slate-800 hover:text-white rounded transition-colors"
          title="插入链接"
        >
          <Link className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onOpenImageModal}
          className="p-1.5 hover:bg-slate-800 hover:text-indigo-300 rounded text-indigo-400 transition-colors"
          title="上传/插入静态资源图片"
        >
          <ImageIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() =>
            onInsertText(
              '\n| 表头 1 | 表头 2 | 表头 3 |\n| :--- | :--- | :--- |\n| 内容 A | 内容 B | 内容 C |\n'
            )
          }
          className="p-1.5 hover:bg-slate-800 hover:text-white rounded transition-colors"
          title="插入表格"
        >
          <Table className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onInsertText('\n\n---\n\n')}
          className="p-1.5 hover:bg-slate-800 hover:text-white rounded transition-colors"
          title="分割线"
        >
          <Minus className="w-4 h-4" />
        </button>

        <span className="h-4 w-px bg-slate-800 mx-1" />

        {/* Hugo Shortcodes Group */}
        <div className="flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 rounded-md px-2 py-0.5">
          <span className="text-[10px] font-mono text-indigo-300 font-semibold flex items-center gap-1">
            <Layers className="w-3 h-3 text-indigo-400" />
            <span>Hugo:</span>
          </span>

          <button
            type="button"
            onClick={() => onInsertText('\n\n<!--more-->\n\n')}
            className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-900 hover:bg-indigo-600 hover:text-white text-slate-300 border border-slate-700/60 transition-colors flex items-center gap-0.5"
            title="插入 Hugo 摘要截断点 (more)"
          >
            <Scissors className="w-2.5 h-2.5" />
            <span>&lt;!--more--&gt;</span>
          </button>

          <button
            type="button"
            onClick={() =>
              onInsertText(
                '{{< alert "info" >}}\n',
                '\n{{< /alert >}}',
                '提示信息内容'
              )
            }
            className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-900 hover:bg-indigo-600 hover:text-white text-slate-300 border border-slate-700/60 transition-colors"
            title="插入 Hugo Alert 提示框"
          >
            &#123;&#123;&lt; alert &gt;&#125;&#125;
          </button>

          <button
            type="button"
            onClick={() =>
              onInsertText(
                '{{< figure src="/images/example.png" title="图注说明" alt="说明" >}}\n'
              )
            }
            className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-900 hover:bg-indigo-600 hover:text-white text-slate-300 border border-slate-700/60 transition-colors"
            title="插入 Hugo Figure 原生图片短代码"
          >
            &#123;&#123;&lt; figure &gt;&#125;&#125;
          </button>

          {onOpenAIAssistant && (
            <button
              type="button"
              onClick={() => onOpenAIAssistant('polish')}
              className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-colors ml-1"
              title="使用 Gemini AI 润色优化文章结构与文字表达"
            >
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>AI 润色提炼</span>
            </button>
          )}
        </div>
      </div>

      {/* Right: Layout Switcher */}
      <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 text-xs">
        <button
          type="button"
          onClick={() => onChangeViewMode('edit')}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            viewMode === 'edit'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="纯编辑模式"
        >
          编辑
        </button>
        <button
          type="button"
          onClick={() => onChangeViewMode('split')}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors hidden sm:inline-flex items-center gap-1 ${
            viewMode === 'split'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="双栏分屏预览"
        >
          <Columns className="w-3 h-3" />
          <span>双栏</span>
        </button>
        <button
          type="button"
          onClick={() => onChangeViewMode('preview')}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            viewMode === 'preview'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="纯预览模式"
        >
          预览
        </button>
      </div>
    </div>
  );
};
