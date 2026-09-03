import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Calendar,
  Clock,
  User,
  Tag,
  FolderTree,
  ListTree,
  Monitor,
  Tablet,
  Smartphone,
  Copy,
  Check,
  BookOpen,
  Eye
} from 'lucide-react';
import { HugoFrontMatter } from '../../types';
import {
  calculateReadingStats,
  extractTableOfContents,
  processHugoShortcodesForPreview,
} from '../../services/hugoParser';

interface HugoPreviewProps {
  frontMatter: HugoFrontMatter;
  content: string;
}

export const HugoPreview: React.FC<HugoPreviewProps> = ({ frontMatter, content }) => {
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const readingStats = useMemo(() => calculateReadingStats(content), [content]);
  const tableOfContents = useMemo(() => extractTableOfContents(content), [content]);
  const processedMarkdown = useMemo(() => processHugoShortcodesForPreview(content), [content]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    } catch {
      return dateStr;
    }
  };

  const copyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const viewportWidthClass = {
    desktop: 'w-full',
    tablet: 'max-w-[768px] mx-auto shadow-2xl border border-slate-800 rounded-xl my-4',
    mobile: 'max-w-[390px] mx-auto shadow-2xl border border-slate-800 rounded-2xl my-4',
  }[viewport];

  return (
    <div id="hugo-preview-container" className="h-full flex flex-col bg-[#020617] overflow-hidden select-text">
      {/* Top Preview Status Bar */}
      <div className="h-9 border-b border-slate-800 bg-[#0f172a] px-4 flex items-center justify-between text-xs text-slate-400 shrink-0">
        <div className="flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-medium text-slate-200">Hugo 博客主题实时渲染</span>
          <span className="text-[11px] text-slate-500">· 约 {readingStats.wordCount} 字 · {readingStats.readingTimeMin} 分钟阅读</span>
        </div>

        {/* Viewport controls */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => setViewport('desktop')}
            className={`p-1 rounded-md transition-colors ${viewport === 'desktop' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'}`}
            title="电脑宽屏视图"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewport('tablet')}
            className={`p-1 rounded-md transition-colors ${viewport === 'tablet' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'}`}
            title="平板视图 (768px)"
          >
            <Tablet className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewport('mobile')}
            className={`p-1 rounded-md transition-colors ${viewport === 'mobile' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'}`}
            title="手机端视图 (390px)"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Preview Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#020617]/90">
        <div className={`bg-[#0b1120] border border-slate-800/80 rounded-xl min-h-[600px] p-6 md:p-10 transition-all ${viewportWidthClass} shadow-xl shadow-black/40`}>
          {/* Cover image */}
          {frontMatter.cover?.image && (
            <div className="mb-6 -mx-6 md:-mx-10 -mt-6 md:-mt-10 overflow-hidden rounded-t-xl max-h-80 border-b border-slate-800">
              <img
                src={frontMatter.cover.image}
                alt={frontMatter.cover.alt || frontMatter.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Categories */}
          {frontMatter.categories && frontMatter.categories.length > 0 && (
            <div className="flex items-center gap-1.5 mb-2">
              {frontMatter.categories.map((cat) => (
                <span
                  key={cat}
                  className="text-xs font-semibold uppercase tracking-wider text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded font-mono"
                >
                  {cat}
                </span>
              ))}
            </div>
          )}

          {/* Article Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-snug mb-3">
            {frontMatter.title || '无标题文章'}
          </h1>

          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-400 pb-5 mb-6 border-b border-slate-800/80">
            {frontMatter.date && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>{formatDate(frontMatter.date)}</span>
              </div>
            )}

            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{readingStats.readingTimeMin} 分钟阅读</span>
            </div>

            {frontMatter.author && (
              <div className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>{frontMatter.author}</span>
              </div>
            )}

            {frontMatter.draft ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                草稿 (Draft)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                正式发布
              </span>
            )}
          </div>

          {/* Table of contents block (Hugo TOC) */}
          {frontMatter.toc !== false && tableOfContents.length > 1 && (
            <div className="my-6 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 mb-2.5">
                <ListTree className="w-3.5 h-3.5 text-indigo-400" />
                <span>文章目录 (Table of Contents)</span>
              </div>
              <ul className="space-y-1 text-xs">
                {tableOfContents.map((item, idx) => (
                  <li
                    key={idx}
                    className="text-slate-400 hover:text-indigo-300 transition-colors"
                    style={{ paddingLeft: `${Math.max(0, item.level - 2) * 16}px` }}
                  >
                    <a
                      href={`#${item.id}`}
                      className="hover:underline flex items-center gap-1.5"
                    >
                      <span className="text-slate-600 text-[10px]">#</span>
                      <span>{item.text}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Article Markdown Body */}
          <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed text-sm md:text-base space-y-4">
            <ReactMarkdown
              components={{
                h1: ({ node, ...props }) => (
                  <h1 className="text-xl md:text-2xl font-bold text-white mt-8 mb-4 border-b border-slate-800 pb-2" {...props} />
                ),
                h2: ({ node, ...props }) => {
                  const text = String(props.children);
                  const id = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, '');
                  return <h2 id={id} className="text-lg md:text-xl font-bold text-white mt-7 mb-3" {...props} />;
                },
                h3: ({ node, ...props }) => {
                  const text = String(props.children);
                  const id = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, '');
                  return <h3 id={id} className="text-base md:text-lg font-semibold text-slate-100 mt-5 mb-2" {...props} />;
                },
                p: ({ node, ...props }) => (
                  <p className="my-3 text-slate-300 leading-relaxed" {...props} />
                ),
                blockquote: ({ node, ...props }) => (
                  <blockquote className="border-l-4 border-indigo-500 bg-indigo-500/10 pl-4 py-2 italic text-slate-300 my-4 rounded-r-lg" {...props} />
                ),
                ul: ({ node, ...props }) => (
                  <ul className="list-disc list-inside my-3 space-y-1 pl-2 text-slate-300" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal list-inside my-3 space-y-1 pl-2 text-slate-300" {...props} />
                ),
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto my-6 border border-slate-800 rounded-lg">
                    <table className="w-full border-collapse text-left text-xs md:text-sm text-slate-300" {...props} />
                  </div>
                ),
                th: ({ node, ...props }) => (
                  <th className="bg-slate-900 px-3 py-2 font-semibold text-slate-200 border-b border-slate-800" {...props} />
                ),
                td: ({ node, ...props }) => (
                  <td className="px-3 py-2 border-b border-slate-800/60 text-slate-300" {...props} />
                ),
                code: ({ node, className, children, ...props }: any) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');
                  const isInline = !match && !String(children).includes('\n');

                  if (isInline) {
                    return (
                      <code className="bg-slate-900 text-indigo-300 px-1.5 py-0.5 rounded font-mono text-xs border border-slate-800" {...props}>
                        {children}
                      </code>
                    );
                  }

                  const lang = match ? match[1] : '';
                  const codeId = `code-${Math.random().toString(36).slice(2, 7)}`;

                  return (
                    <div className="my-4 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100 shadow-lg">
                      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/80 text-[11px] font-mono text-slate-400 border-b border-slate-800">
                        <span>{lang || 'code'}</span>
                        <button
                          onClick={() => copyCode(codeString, codeId)}
                          className="flex items-center gap-1 hover:text-white transition-colors"
                        >
                          {copiedCodeId === codeId ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">已复制</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>复制</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-4 overflow-x-auto text-xs font-mono leading-relaxed text-slate-200">
                        <code>{children}</code>
                      </pre>
                    </div>
                  );
                },
              }}
            >
              {processedMarkdown}
            </ReactMarkdown>
          </div>

          {/* Tags list footer */}
          {frontMatter.tags && frontMatter.tags.length > 0 && (
            <div className="mt-10 pt-6 border-t border-slate-800/80 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <Tag className="w-3 h-3" /> 标签:
              </span>
              {frontMatter.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 text-xs rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors font-mono"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
