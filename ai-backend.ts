/**
 * ai-backend.ts — 统一大模型接入层(基于 unillm-sdk)
 *
 * 一个配置文件/一套 API Key 即可驱动 OpenAI、Anthropic Claude、Google Gemini、
 * DeepSeek、Kimi、通义千问、智谱 GLM、Grok、Groq、Mistral、硅基流动、Ollama
 * 以及任意 OpenAI 兼容端点(14 家主流厂商)。
 *
 * 配置优先级(高 → 低):
 *   前端下发的 modelConfig(localStorage,随请求体传参)
 *   > HPM_AI_* 环境变量(本应用专用前缀)
 *   > UNILLM_* 通用变量 / 厂商专用变量(OPENAI_API_KEY、DEEPSEEK_API_KEY…)
 *   > 旧版 AI_* 变量 / GEMINI_API_KEY(存量 AI Studio 部署零改名迁移)
 *
 * 历史 AI 端点(/api/ai/*)与新增助手端点(/api/assistant/*)共用此层,
 * 不再为每个厂商手写适配器。
 */
import {
  UnifiedLLM,
  PROVIDERS,
  autoDetectProvider,
  envKeyPresent,
  parseJsonText,
  normalizeProviderId,
  LLMError,
} from 'unillm-sdk';
import type { ChatMessage, ProviderConfig, ProviderId } from 'unillm-sdk';

/** 本应用专用环境变量前缀 */
export const ENV_PREFIX = 'HPM_AI_';

/** Gemini 旧版端点兜底候选模型(仅当未显式指定模型且走环境变量时使用) */
const GEMINI_FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-3-flash',
  'gemini-2.5-pro',
  'gemini-3-pro',
];

/* ------------------------------------------------------------------ */
/* 类型定义                                                            */
/* ------------------------------------------------------------------ */

/** 前端可下发的模型覆盖配置(存在 localStorage,随请求体传给后端) */
export interface ClientModelConfig {
  provider?: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/** 助手人设(名字 / 性格 / 对我的称呼 / 写作风格画像 / 额外规则) */
export interface AssistantPersona {
  name: string;
  personality: string;
  callUser: string;
  styleProfile: string;
  extraRules: string;
}

/** 当前文章上下文(供续写 / 润色 / 起标题等创作动作) */
export interface AssistantPostContext {
  title?: string;
  name?: string;
  content?: string;
}

/* ------------------------------------------------------------------ */
/* 配置清洗与客户端构造                                                */
/* ------------------------------------------------------------------ */

/** 只保留非空字段,避免空字符串覆盖环境变量 */
export function sanitizeClientModelConfig(raw: any): ClientModelConfig | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: ClientModelConfig = {};
  const provider = normalizeProviderId(typeof raw.provider === 'string' ? raw.provider.trim() : '');
  if (provider) out.provider = provider;
  if (typeof raw.apiKey === 'string' && raw.apiKey.trim()) out.apiKey = raw.apiKey.trim();
  if (typeof raw.baseUrl === 'string' && raw.baseUrl.trim()) out.baseUrl = raw.baseUrl.trim();
  if (typeof raw.model === 'string' && raw.model.trim()) out.model = raw.model.trim();
  if (typeof raw.temperature === 'number' && !Number.isNaN(raw.temperature)) {
    out.temperature = Math.min(2, Math.max(0, raw.temperature));
  }
  if (typeof raw.maxTokens === 'number' && !Number.isNaN(raw.maxTokens)) {
    out.maxTokens = Math.max(1, Math.floor(raw.maxTokens));
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * 构造统一客户端。
 * envPrefix 让服务器 .env 里的 HPM_AI_* 与 unillm 标准变量都生效;
 * 客户端下发的字段按"代码传参 > 环境变量"的优先级覆盖。
 */
export function makeLLM(clientConfig?: ClientModelConfig): UnifiedLLM {
  const cfg: ProviderConfig = { envPrefix: ENV_PREFIX };
  if (clientConfig) {
    if (clientConfig.provider) cfg.provider = clientConfig.provider as ProviderId;
    if (clientConfig.apiKey) cfg.apiKey = clientConfig.apiKey;
    if (clientConfig.baseUrl) cfg.baseUrl = clientConfig.baseUrl;
    if (clientConfig.model) cfg.model = clientConfig.model;
    if (clientConfig.temperature !== undefined) cfg.temperature = clientConfig.temperature;
    if (clientConfig.maxTokens !== undefined) cfg.maxTokens = clientConfig.maxTokens;
  }
  return new UnifiedLLM(cfg);
}

/** 以指定 model 重建客户端(用于模型兜底重试,其余配置原样保留) */
export function withModel(llm: UnifiedLLM, model: string): UnifiedLLM {
  const base: ProviderConfig = { envPrefix: ENV_PREFIX };
  const c = llm.config;
  if (c.provider) base.provider = c.provider;
  if (c.apiKey) base.apiKey = c.apiKey;
  if (c.baseUrl) base.baseUrl = c.baseUrl;
  if (c.temperature !== undefined) base.temperature = c.temperature;
  if (c.maxTokens !== undefined) base.maxTokens = c.maxTokens;
  base.model = model;
  return new UnifiedLLM(base);
}

/** 供 UI 拉取厂商清单 / 环境探测状态 */
export function listProviderOptions() {
  return {
    providers: PROVIDERS.map((p) => ({
      id: p.id,
      label: p.label,
      kind: p.kind,
      needsApiKey: p.needsApiKey,
      defaultBaseUrl: p.defaultBaseUrl,
      defaultModels: p.defaultModels,
      note: p.note,
      docs: p.docs,
    })),
    env: {
      autoProvider: autoDetectProvider(),
      keysPresent: PROVIDERS.filter((p) => p.needsApiKey && envKeyPresent(p.id)).map((p) => p.id),
    },
  };
}

/* ------------------------------------------------------------------ */
/* 统一调用入口                                                        */
/* ------------------------------------------------------------------ */

function extractErrorMessage(err: unknown): string {
  if (err instanceof LLMError) {
    if (err.code === 'MISSING_API_KEY') {
      return '未检测到 API Key:请在助手的「模型服务」设置中填写所选厂商的 API Key,或在服务器 .env 中配置 HPM_AI_API_KEY / 厂商专用变量(如 DEEPSEEK_API_KEY)。';
    }
    return `${err.message || '请求失败'}${err.status ? `(HTTP ${err.status})` : ''}`;
  }
  return err instanceof Error ? err.message : String(err);
}

/**
 * 非流式调用:文本 / JSON 输出。
 * model 缺省时对 Gemini 依次尝试兜底候选模型(老部署环境模型名不确定)。
 */
export async function callLLM(options: {
  messages: ChatMessage[];
  clientConfig?: ClientModelConfig;
  json?: boolean;
  signal?: AbortSignal;
  temperature?: number;
}): Promise<{ text: string; data?: unknown; provider: ProviderId; model: string }> {
  const { messages, clientConfig, json, signal, temperature } = options;
  const config: ClientModelConfig = { ...(clientConfig || {}) };
  if (temperature !== undefined) config.temperature = temperature;

  const llm = makeLLM(config);
  const candidates: string[] = [];
  if (!config.model) {
    if (llm.provider === 'gemini') {
      // 旧版 GEMINI_API_KEY 部署:一次失败自动换下一个候选模型
      const seen = new Set<string>([llm.config.model]);
      for (const m of [llm.config.model, ...GEMINI_FALLBACK_MODELS]) {
        if (m && !seen.has(m)) {
          seen.add(m);
          candidates.push(m);
        }
      }
    }
  }

  const attempts = candidates.length > 0 ? candidates : [undefined as string | undefined];
  let lastError: unknown = null;

  for (const model of attempts) {
    try {
      const active = model ? withModel(llm, model) : llm;
      if (json) {
        try {
          const data = await active.generateJson(messages, { signal });
          return { text: '', data, provider: active.provider, model: active.config.model || '' };
        } catch (jsonErr: any) {
          // 厂商不支持结构化输出时回退:生成文本后再本地解析
          const text = await active.generateText(messages, { signal });
          const data = parseJsonText(text);
          if (data === null || data === undefined) throw jsonErr;
          return { text, data, provider: active.provider, model: active.config.model || '' };
        }
      }
      const result = await active.chat(messages, { signal });
      return { text: result.text, provider: active.provider, model: active.config.model || '' };
    } catch (err) {
      lastError = err;
      console.warn(`[ai-backend] model=${model || llm.config.model} 调用失败,准备兜底:`, extractErrorMessage(err));
    }
  }
  throw new Error(extractErrorMessage(lastError || new Error('所有模型均未响应')));
}

/* ------------------------------------------------------------------ */
/* 提示词组装(助手人设 / 风格分析)                                     */
/* ------------------------------------------------------------------ */

function fallbackPersona(): AssistantPersona {
  return { name: '写作助手', personality: '', callUser: '你', styleProfile: '', extraRules: '' };
}

/** 组装助手 System Prompt:名字 / 性格 / 称呼 / 风格画像 / 当前文章上下文 */
export function buildAssistantSystemPrompt(personaRaw: any, postRaw: any): string {
  const persona: AssistantPersona = { ...fallbackPersona(), ...(personaRaw || {}) };
  const post: AssistantPostContext = { ...(postRaw || {}) };
  const name = (persona.name || '').trim() || '写作助手';
  const callUser = (persona.callUser || '').trim() || '你';
  const personality = (persona.personality || '').trim();
  const styleProfile = (persona.styleProfile || '').trim();
  const extraRules = (persona.extraRules || '').trim();
  const title = (post.title || '').trim();
  const fileName = (post.name || '').trim();
  const content = (post.content || '').slice(0, 9000);

  const sections: string[] = [];

  sections.push(`你是「${name}」,一位深耕中文写作的专属博客创作搭档,正在帮助用户写 Hugo 博客文章。请全程以「${name}」的身份与用户对话,不要声称自己是通用 AI 助手。`);

  sections.push(
    [
      '## 性格与语气',
      personality || '温和、耐心、专业,带一点轻松幽默;鼓励用户创作,但观点直接不敷衍。',
      `## 对用户的称呼`,
      `用「${callUser}」称呼用户,语气亲切自然,但不要每个回复都机械地重复称呼。`,
    ].join('\n')
  );

  if (styleProfile) {
    sections.push(
      [
        '## 写作风格画像(重要)',
        '当用户要求「按我的风格写」「模仿我的文风」「帮我润色/续写」时,必须严格模仿下面的风格画像;普通问答不受限制:',
        styleProfile,
      ].join('\n')
    );
  }

  if (extraRules) {
    sections.push(`## 用户的额外要求\n${extraRules}`);
  }

  sections.push(
    [
      '## 创作守则',
      '1. 默认使用简体中文回复(用户明确要求其他语言除外)。',
      '2. 正文一律输出 Markdown:用 ## / ### 组织标题层级、合理使用列表、代码块与引用,适合直接粘贴进 Hugo 文章;允许输出 Hugo shortcode(如 {{< alert >}}、{{< figure >}})。',
      '3. 请求「续写/扩写」时延续原文标题、口吻与段落节奏,不要重复用户已有的段落;请求「润色」时保留原意与结构,只优化表达。',
      '4. 直接给出成品;需要说明时用简短的话带过,不输出空洞的客套与分析废话。',
      '5. 不确定用户博客配置(标签、分类、slug 规则)时,按常见 Hugo 惯例给建议并允许用户修改。',
    ].join('\n')
  );

  if (title || fileName || content) {
    sections.push(
      [
        '## 当前文章上下文(仅当用户的问题与写作相关时参考;无关则忽略)',
        title ? `- 文章标题:${title}` : '',
        fileName ? `- 文件名:${fileName}` : '',
        content ? `- 正文节选:\n"""\n${content}\n"""` : '',
      ].filter(Boolean).join('\n')
    );
  }

  return sections.join('\n\n');
}

/** 风格分析提示词:从选中文章提炼作者性格与写作特点 */
export function buildStyleAnalysisPrompt(title: string, content: string): string {
  return `你是一位资深的文字编辑与写作风格分析师。请仔细阅读下面这篇 Hugo 博客文章${title ? `(《${title}》)` : ''},深度分析作者的写作性格与行文特点,输出一份可供 AI 模仿的「写作风格画像」。

要求:
- 不要写流水账,不要空泛总结"语言流畅、结构清晰"这类正确的废话;
- 要提炼出可执行的、有辨识度的特点:语气温度、用词偏好、句式长短与节奏、结构习惯(开头方式/小标题/分段)、修辞与金句习惯、标点与表情符号/括号吐槽、干货密度、举例方式、结尾风格等;
- 若原文特征不明显,基于现有文本做合理归纳并说明主要判断依据。

文章正文:
"""
${(content || '').slice(0, 10000)}
"""

请只输出一个严格的 JSON 对象(不要 Markdown 代码块围栏),字段如下:
{
  "tone": "一句话概括整体语气与温度(如:理性克制中带点理工男自嘲,像朋友聊天但不油腻)",
  "vocabulary": "用词习惯(术语密度、口语化程度、爱用的词/口头禅)",
  "sentence": "句式特点(长短句搭配、是否爱用排比/设问/短句推进)",
  "structure": "结构与逻辑习惯(开头切入方式、小标题组织、图表/代码占比、结尾方式)",
  "habits": ["3-6 个具体行文习惯或偏好,如:喜欢用『直接给结论再解释』的结构、常在括号里加吐槽、爱用中文引号强调关键概念"],
  "punctuation": "标点与表情符号使用习惯(如:几乎不用感叹号、善用『——』与括号补充、偶尔用 emoji 但克制)",
  "voice": "判断作者是个什么样的人(从文字透出的性格侧写,30-60 字)",
  "profileText": "最终交付的『写作风格画像』:以第二人称『你』撰写,150-250 字,第一句概括整体文风,随后按条列出可模仿要点,供 AI 写作时直接套用。不要出现文章标题与作者名。"
}`;
}

/* ------------------------------------------------------------------ */
/* 工具                                                                */
/* ------------------------------------------------------------------ */

/** 把聊天记录裁剪到最近 N 条并清洗 */
export function sanitizeChatMessages(raw: any): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const cleaned: ChatMessage[] = [];
  for (const m of raw.slice(-24)) {
    if (!m || typeof m !== 'object') continue;
    const role = m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user';
    let content = '';
    if (typeof m.content === 'string') content = m.content;
    else if (Array.isArray(m.content)) content = m.content.map((p: any) => (p && typeof p.text === 'string' ? p.text : '')).join('\n');
    content = content.trim();
    if (!content) continue;
    cleaned.push({ role, content: content.slice(0, 30000) });
  }
  // 系统消息不得由客户端伪造(人设统一在服务端组装)
  return cleaned.filter((m) => m.role !== 'system');
}
