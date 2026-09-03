import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Bot,
  X,
  Settings,
  Trash2,
  Send,
  Square,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Sparkles,
  Wand2,
  FileText,
  Link,
  Link2Off,
  PenLine,
  ListTree,
  BadgePlus,
  Highlighter,
  ListChecks,
  SpellCheck,
  ChevronRight,
  Key,
} from 'lucide-react';
import { HugoPost } from '../../types';
import {
  AssistantChatMessage,
  AssistantLLMConfig,
  AssistantPersona,
  StyleAnalysisResult,
} from '../../types/assistant';
import {
  DEFAULT_PERSONA,
  DEFAULT_LLM_CONFIG,
  loadPersona,
  savePersona,
  hasSavedPersona,
  loadLLMConfig,
  saveLLMConfig,
  loadChatHistory,
  saveChatHistory,
  clearChatHistory,
  analyzeWritingStyle,
  streamAssistantChat,
} from '../../services/assistantApi';
import { AssistantSetupModal } from './AssistantSetupModal';

interface WritingAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  post: HugoPost | null;
  onInsertContent: (markdown: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  prompt: (title: string) => string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'continue',
    label: '续写本文',
    icon: PenLine,
    prompt: (title) => `请顺着文章《${title}》当前的结尾继续往下写 2~4 个自然段,沿用原标题口径与行文节奏,不要重复已有内容,直接输出新增段落(Markdown)。`,
  },
  {
    id: 'outline',
    label: '列写作大纲',
    icon: ListTree,
    prompt: (title) => `为文章《${title}》梳理一份清晰的写作大纲:先一句话点明主线,再用 Markdown 的 ##/### 列出各节标题,每节附 1~2 句要展开的角度,方便我按图索骥把正文填出来。`,
  },
  {
    id: 'titles',
    label: '起 5 个标题',
    icon: BadgePlus,
    prompt: (title) => `基于文章《${title}》的内容,给我 5 个不同风格的中文标题(爆款悬念 / 专业严谨 / 实战教程 / 避坑心得 / 文艺一点),每条附一行推荐理由,适合直接填入 Hugo Front Matter 的 title。`,
  },
  {
    id: 'polish',
    label: '润色全文',
    icon: Highlighter,
    prompt: (title) => `请对文章《${title}》做一次整体润色:修正错别字与病句、优化语言流畅度、理顺段落过渡,保留原意、Markdown 格式与代码块,直接输出润色后的全文。`,
  },
  {
    id: 'tldr',
    label: '写 TL;DR 摘要',
    icon: ListChecks,
    prompt: (title) => `为文章《${title}》写一段精辟的 TL;DR 核心速览(用 Markdown 引用块 > 呈现),再顺带建议 description 与 3~5 个 tags,便于放在 Hugo Front Matter。`,
  },
  {
    id: 'proofread',
    label: '挑错别字病句',
    icon: SpellCheck,
    prompt: (title) => `通读文章《${title}》,挑出错别字、病句、用词不当与表述生硬的地方,按「原文 → 建议修改」的列表输出,不要重写全文。`,
  },
];

/** 极简 Markdown 样式组件(适配深色聊天气泡) */
const MarkdownBody: React.FC<{ content: string }> = ({ content }) => (
  <div className="markdown-body text-slate-200 text-xs leading-relaxed [&_p]:my-1.5 [&_h1]:text-sm [&_h1]:font-semibold [&_h1]:text-white [&_h2]:text-[13px] [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-indigo-200 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5 [&_blockquote]:border-l-2 [&_blockquote]:border-indigo-500/60 [&_blockquote]:pl-2.5 [&_blockquote]:text-slate-400 [&_blockquote]:italic [&_a]:text-indigo-400 [&_a]:underline [&_code]:bg-slate-950 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-[10px] [&_code]:text-amber-200 [&_pre]:bg-slate-950 [&_pre]:border [&_pre]:border-slate-800 [&_pre]:rounded-lg [&_pre]:p-2.5 [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[10.5px] [&_pre_code]:text-emerald-200 [&_table]:border-collapse [&_th]:border [&_th]:border-slate-700 [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-slate-800 [&_td]:px-2 [&_td]:py-1 [&_hr]:border-slate-800 [&_strong]:text-white">
    <ReactMarkdown>{content}</ReactMarkdown>
  </div>
);

const TypingDots: React.FC = () => (
  <div className="flex items-center gap-1 py-1">
    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:120ms]" />
    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:240ms]" />
  </div>
);

export const WritingAssistantPanel: React.FC<WritingAssistantPanelProps> = ({
  isOpen,
  onClose,
  post,
  onInsertContent,
  onShowToast,
}) => {
  const [persona, setPersona] = useState<AssistantPersona>(() => loadPersona());
  const [configured, setConfigured] = useState<boolean>(() => hasSavedPersona());
  const [llmConfig, setLlmConfig] = useState<AssistantLLMConfig>(() => loadLLMConfig());
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [setupInitialTab, setSetupInitialTab] = useState<'persona' | 'model'>('persona');

  const [history, setHistory] = useState<AssistantChatMessage[]>(() => loadChatHistory());
  const [streaming, setStreaming] = useState<{ content: string } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [attachPost, setAttachPost] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 风格分析
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<StyleAnalysisResult | null>(null);
  const [profileDraft, setProfileDraft] = useState('');
  const [profileApplied, setProfileApplied] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const postContext = useMemo(() => {
    if (!post) return null;
    return {
      title: post.frontMatter.title || post.name,
      name: post.name,
      content: post.content.slice(0, 10000),
    };
  }, [post]);

  // 持久化聊天记录
  useEffect(() => {
    saveChatHistory(history);
  }, [history]);

  // 打开面板时聚焦输入框
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // 自动滚动到底部
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [history, streaming, isOpen]);

  if (!isOpen) return null;

  const displayName = persona.name?.trim() || '写作助手';
  const callUser = persona.callUser?.trim() || '你';

  const welcomeBubble =
    !configured || history.length === 0
      ? null
      : `你好呀,${callUser}～我是**${displayName}**,你的专属写作搭子。\n\n把你想写的主题丢给我,或者选中左侧文章后试试下方的快捷动作:续写、列大纲、起标题、润色、写摘要……我都能干。也可以点「风格分析」,读几篇你的旧文章,学学你的文风。`;

  const handleSetupSaved = (p: AssistantPersona, llm: AssistantLLMConfig) => {
    setPersona(p);
    savePersona(p);
    setConfigured(true);
    setLlmConfig(llm);
    saveLLMConfig(llm);
  };

  /** 打开设置弹窗并定位到指定标签('model' = 厂商与 API Key 配置) */
  const openSetup = (tab: 'persona' | 'model' = 'persona') => {
    setSetupInitialTab(tab);
    setIsSetupOpen(true);
  };

  const finalizeStreaming = (text: string) => {
    const trimmed = text.trim();
    if (trimmed) {
      const msg: AssistantChatMessage = { role: 'assistant', content: trimmed, ts: Date.now() };
      setHistory((h) => [...h, msg]);
    }
    setStreaming(null);
    setIsSending(false);
  };

  const sendMessage = async (rawText: string, opts?: { attach?: boolean }) => {
    const text = rawText.trim();
    if (!text || isSending) return;
    setErrorMsg(null);

    // 首次发送视为接受当前(默认)人设,避免下次打开再弹引导卡
    if (!configured) {
      savePersona(persona);
      setConfigured(true);
    }

    const attach = opts?.attach !== undefined ? opts.attach : attachPost;
    const ctx = attach && postContext ? postContext : null;

    const userMsg: AssistantChatMessage = { role: 'user', content: text, ts: Date.now() };
    setHistory((h) => [...h, userMsg]);
    setInput('');
    setIsSending(true);
    setStreaming({ content: '' });

    const controller = new AbortController();
    abortRef.current = controller;

    let acc = '';
    try {
      const historyForRequest = [...history, userMsg];
      await streamAssistantChat({
        messages: historyForRequest,
        persona,
        post: ctx,
        signal: controller.signal,
        callbacks: {
          onDelta: (delta) => {
            acc += delta;
            setStreaming({ content: acc });
          },
        },
      });
      finalizeStreaming(acc);
    } catch (err: any) {
      if (err && (err.name === 'AbortError' || controller.signal.aborted)) {
        // 用户手动停止:保留已生成的部分
        finalizeStreaming(acc);
        onShowToast('已停止生成', 'info');
        return;
      }
      if (acc.trim()) {
        finalizeStreaming(acc);
        setErrorMsg(err?.message || '生成中断,请重试。');
      } else {
        setStreaming(null);
        setIsSending(false);
        setErrorMsg(err?.message || '对话失败,请检查模型服务配置后重试。');
      }
    } finally {
      abortRef.current = null;
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    if (!post) return;
    const title = post.frontMatter.title || post.name;
    sendMessage(action.prompt(title), { attach: true });
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleAnalyzeStyle = async () => {
    if (!post || analyzing) return;
    setAnalyzing(true);
    setErrorMsg(null);
    setProfileApplied(false);
    try {
      const res = await analyzeWritingStyle({
        title: post.frontMatter.title || post.name,
        content: post.content.slice(0, 12000),
      });
      setAnalysis(res.data);
      setProfileDraft(res.data.profileText || '');
      onShowToast('风格分析完成,已提炼写作特点', 'success');
    } catch (e: any) {
      setErrorMsg(e?.message || '风格分析失败,请检查模型服务配置。');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplyProfile = () => {
    if (!profileDraft.trim()) return;
    const next = { ...persona, styleProfile: profileDraft.trim() };
    setPersona(next);
    savePersona(next);
    setConfigured(true);
    setProfileApplied(true);
    onShowToast(`已将写作风格画像写入「${displayName}」的人设,之后让它按你的文风写就有据可依了`, 'success');
  };

  const handleCopy = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      onShowToast('复制失败,请手动选择文本', 'error');
    }
  };

  const handleInsert = (content: string) => {
    onInsertContent(content);
    onShowToast('已将助手回复插入当前文章正文末尾(记得继续编辑排版)', 'success');
  };

  const handleClearChat = () => {
    if (history.length === 0) return;
    if (!window.confirm('确定清空与助手的全部聊天记录吗?')) return;
    setHistory([]);
    clearChatHistory();
    setErrorMsg(null);
  };

  const modelStatus =
    llmConfig.mode === 'manual' && llmConfig.provider
      ? `${llmConfig.provider}${llmConfig.model ? '/' + llmConfig.model : ''}`
      : '服务器环境变量';

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px]" onClick={onClose} />

      {/* 右侧抽屉 */}
      <aside className="fixed top-0 right-0 z-40 h-full w-full sm:w-[460px] bg-[#0b1120] border-l border-slate-800 shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="h-14 shrink-0 border-b border-slate-800 px-4 flex items-center justify-between bg-[#0f172a]/90 backdrop-blur">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-fuchsia-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-fuchsia-600/20">
              <Bot className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-sm truncate">{displayName}</span>
                {configured && (
                  <button
                    onClick={() => openSetup('model')}
                    title="点击配置模型厂商与 API Key(当前:环境变量或手动配置)"
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-indigo-300 hover:border-indigo-500/60 hover:text-indigo-200 truncate max-w-[130px] cursor-pointer transition-colors flex items-center gap-1"
                  >
                    <Key className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">{modelStatus}</span>
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-500 truncate">
                {post ? (
                  <span className="flex items-center gap-1">
                    <FileText className="w-2.5 h-2.5 shrink-0 text-indigo-400" />
                    <span className="truncate">{post.name} · 可关联上下文</span>
                  </span>
                ) : (
                  '未选中文章,自由头脑风暴模式'
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIsSetupOpen(true)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="配置助手名字 / 性格 / 称呼 / 模型 API Key"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={handleClearChat}
              disabled={history.length === 0}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors disabled:opacity-30"
              title="清空聊天记录"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="关闭助手"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 风格分析条 */}
        {post && (
          <div className="shrink-0 px-4 py-2 border-b border-slate-800/70 bg-[#0b1120]/60 flex items-center gap-2">
            <button
              onClick={handleAnalyzeStyle}
              disabled={analyzing || Boolean(analysis)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
                analysis
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-300 hover:bg-fuchsia-500/20'
              } disabled:opacity-60`}
              title="分析当前选中文章,提炼作者的写作性格与文风,写入助手人设"
            >
              {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
              {analyzing ? '正在提炼写作风格...' : analysis ? '风格画像已生成' : '分析本文写作风格'}
            </button>
            <p className="text-[10px] text-slate-500 truncate">
              {persona.styleProfile
                ? '已有人设画像(点击左侧可重新生成)'
                : '让助手读这篇文章,学你的性格与文风'}
            </p>
          </div>
        )}

        {/* 聊天消息区 */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5">
          {/* 引导卡片(未配置人设) */}
          {!configured && (
            <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-indigo-950/60 via-[#0f172a] to-fuchsia-950/40 p-5 space-y-3 text-center animate-fade-in">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-fuchsia-600 to-indigo-600 text-white flex items-center justify-center shadow-xl shadow-fuchsia-600/25">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">先认识一下你的写作搭档</p>
                <p className="text-slate-400 text-[11px] leading-relaxed mt-1">
                  给它起个名字、设定性格、告诉它怎么称呼你;再选一家主流大模型(DeepSeek / OpenAI / Gemini / Claude
                  / Kimi / 通义 / GLM / Groq…),填上 API Key 就能开聊,帮你写文章、续写、润色、拟标题。
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                  onClick={() => openSetup('persona')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-1.5"
                >
                  <Settings className="w-3.5 h-3.5" />
                  配置助手人设
                </button>
                <button
                  onClick={() => openSetup('model')}
                  className="px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 hover:bg-amber-500/25 text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5" />
                  配置模型与 API Key
                </button>
                <button
                  onClick={() => handleSetupSaved(DEFAULT_PERSONA, DEFAULT_LLM_CONFIG)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-medium transition-colors"
                >
                  直接开聊(默认人设)
                </button>
              </div>
            </div>
          )}

          {/* 风格分析结果卡片 */}
          {analysis && (
            <div className="rounded-2xl border border-fuchsia-500/25 bg-fuchsia-950/10 p-3.5 space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <p className="text-fuchsia-300 font-semibold text-xs flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5" />
                  写作风格分析 · 《{post?.frontMatter.title || post?.name}》
                </p>
                <button onClick={() => setAnalysis(null)} className="text-slate-500 hover:text-slate-300 text-[11px]">
                  收起
                </button>
              </div>
              <div className="space-y-1.5 text-[11px] leading-relaxed">
                <p><span className="text-slate-500">整体语气:</span> <span className="text-slate-200">{analysis.tone}</span></p>
                <p><span className="text-slate-500">用词:</span> <span className="text-slate-200">{analysis.vocabulary}</span></p>
                <p><span className="text-slate-500">句式节奏:</span> <span className="text-slate-200">{analysis.sentence}</span></p>
                <p><span className="text-slate-500">结构习惯:</span> <span className="text-slate-200">{analysis.structure}</span></p>
                {analysis.habits && analysis.habits.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {analysis.habits.map((h, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 text-[10px]">
                        {h}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-slate-500 mb-1">可直接交付给 AI 模仿的风格画像(可编辑):</p>
                <textarea
                  value={profileDraft}
                  onChange={(e) => setProfileDraft(e.target.value)}
                  rows={5}
                  className="w-full px-2.5 py-2 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-200 text-[11px] leading-relaxed focus:outline-none focus:border-fuchsia-500 font-mono resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                {profileApplied && (
                  <span className="text-emerald-400 text-[11px] flex items-center gap-1 mr-auto">
                    <Check className="w-3.5 h-3.5" /> 已应用为人设风格画像
                  </span>
                )}
                <button
                  onClick={handleApplyProfile}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white text-[11px] font-semibold transition-all shadow-md shadow-fuchsia-600/20"
                >
                  应用到助手人设
                </button>
              </div>
            </div>
          )}

          {/* 欢迎消息 */}
          {configured && history.length === 0 && welcomeBubble && (
            <div className="flex items-start gap-2.5 animate-fade-in">
              <Avatar name={displayName} />
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl rounded-tl-md px-3.5 py-2.5 max-w-[85%]">
                <MarkdownBody content={welcomeBubble} />
              </div>
            </div>
          )}

          {/* 历史消息 */}
          {history.map((m, i) => (
            <div key={m.ts + '-' + i} className={`flex items-start gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {m.role === 'assistant' && <Avatar name={displayName} />}
              {m.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300 shrink-0">
                  {callUser.slice(0, 1)}
                </div>
              )}
              <div
                className={`group relative rounded-2xl px-3.5 py-2.5 max-w-[85%] ${
                  m.role === 'user'
                    ? 'bg-indigo-600/90 text-white rounded-tr-md'
                    : 'bg-slate-900/70 border border-slate-800 rounded-tl-md'
                }`}
              >
                {m.role === 'assistant' ? (
                  <MarkdownBody content={m.content} />
                ) : (
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{m.content}</p>
                )}
                {/* 消息操作 */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1.5 justify-end">
                  {m.role === 'assistant' && (
                    <button
                      onClick={() => handleInsert(m.content)}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] text-indigo-300 hover:bg-indigo-500/15 transition-colors"
                      title="将这条回复插入当前文章正文末尾"
                    >
                      <PenLine className="w-2.5 h-2.5" /> 插入正文
                    </button>
                  )}
                  <button
                    onClick={() => handleCopy(m.content, String(m.ts))}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] text-slate-400 hover:bg-slate-800 transition-colors"
                    title="复制内容"
                  >
                    {copiedId === String(m.ts) ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                    {copiedId === String(m.ts) ? '已复制' : '复制'}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* 流式回复 */}
          {streaming && (
            <div className="flex items-start gap-2.5 animate-fade-in">
              <Avatar name={displayName} />
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl rounded-tl-md px-3.5 py-2.5 max-w-[85%] min-w-[60px]">
                {streaming.content ? <MarkdownBody content={streaming.content} /> : <TypingDots />}
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {errorMsg && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-300 flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">出错了</p>
                <p className="mt-0.5 break-all leading-relaxed">{errorMsg}</p>
                <button
                  onClick={() => openSetup('model')}
                  className="mt-1 text-indigo-300 underline hover:text-indigo-200"
                >
                  检查模型服务配置 →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 快捷动作 + 输入区 */}
        <div className="shrink-0 border-t border-slate-800 bg-[#0f172a]/80 backdrop-blur px-3 pt-2.5 pb-3 space-y-2.5">
          {/* 快捷动作 */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            <span className="text-[9.5px] text-slate-600 shrink-0 px-1">快捷:</span>
            {QUICK_ACTIONS.map((a) => {
              const Icon = a.icon;
              const disabled = !post;
              return (
                <button
                  key={a.id}
                  onClick={() => handleQuickAction(a)}
                  disabled={disabled}
                  title={disabled ? '请先在左侧选中/新建一篇 Hugo 文章' : a.label}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-800 bg-slate-900/80 text-slate-300 hover:border-indigo-500/50 hover:text-indigo-200 text-[10.5px] font-medium shrink-0 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                >
                  <Icon className="w-3 h-3" />
                  {a.label}
                </button>
              );
            })}
          </div>

          {/* 输入区 */}
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              rows={Math.min(5, Math.max(1, input.split('\n').length))}
              placeholder={`和${displayName}聊聊怎么写这篇文章…(Enter 发送 / Shift+Enter 换行)`}
              className="flex-1 px-3 py-2.5 text-xs bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all resize-none leading-relaxed max-h-32"
            />
            {isSending ? (
              <button
                onClick={handleStop}
                className="w-9 h-9 shrink-0 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 hover:bg-rose-500/25 flex items-center justify-center transition-colors"
                title="停止生成"
              >
                <Square className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim()}
                className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-tr from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/25 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="发送 (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 底部辅助行 */}
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <button
              onClick={() => setAttachPost(!attachPost)}
              disabled={!post}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-colors disabled:opacity-35 ${attachPost && post ? 'text-emerald-400 hover:text-emerald-300' : 'hover:text-slate-300'}`}
              title={attachPost ? '当前消息会自动带上文章上下文(最多前 1 万字)' : '不与文章关联,自由对话'}
            >
              {attachPost && post ? <Link className="w-3 h-3" /> : <Link2Off className="w-3 h-3" />}
              引用当前文章 {attachPost && post ? '开' : '关'}
            </button>
            <span className="flex items-center gap-1">
              {llmConfig.mode === 'manual' && llmConfig.provider ? (
                <>
                  {llmConfig.provider}/{llmConfig.model || '默认模型'}
                </>
              ) : (
                '模型由服务器 .env 提供(HPM_AI_*/UNILLM_*)'
              )}
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </aside>

      {/* 设置弹窗 */}
      <AssistantSetupModal
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        persona={persona}
        llmConfig={llmConfig}
        onSave={handleSetupSaved}
        onShowToast={onShowToast}
        initialTab={setupInitialTab}
      />
    </>
  );
};

/** 助手头像 */
const Avatar: React.FC<{ name: string }> = ({ name }) => (
  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-fuchsia-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-fuchsia-600/20 shrink-0 text-[13px] font-bold">
    {(name || '助').slice(0, 1)}
  </div>
);
