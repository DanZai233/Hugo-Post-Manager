/**
 * assistantApi.ts — AI 写作助手的前端服务层
 * 人设 / 模型服务配置 / 聊天记录均持久化在 localStorage;
 * 模型配置(mode='manual')随请求体下发,服务端按"前端配置 > 服务器 .env"合并。
 */
import {
  AssistantChatMessage,
  AssistantLLMConfig,
  AssistantPersona,
  ModelConfigPayload,
  ProviderOption,
  StyleAnalysisResult,
} from '../types/assistant';

const STORAGE_KEYS = {
  PERSONA: 'hugo_studio_assistant_persona_v1',
  LLM: 'hugo_studio_assistant_llm_v1',
  CHAT: 'hugo_studio_assistant_chat_v1',
};

/* ------------------------------------------------------------------ */
/* 默认值                                                               */
/* ------------------------------------------------------------------ */

export const DEFAULT_PERSONA: AssistantPersona = {
  name: '阿墨',
  personality:
    '温和耐心、专业可靠,偶尔带点轻松的幽默感;像一位懂技术的写作搭档,既会给干货也会鼓励人。',
  callUser: '老板',
  styleProfile: '',
  extraRules: '',
};

export const DEFAULT_LLM_CONFIG: AssistantLLMConfig = {
  mode: 'env',
  provider: '',
  apiKey: '',
  baseUrl: '',
  model: '',
  temperature: 0.7,
};

/** 设置页可选的性格预设 */
export const PERSONALITY_PRESETS: { label: string; value: string }[] = [
  { label: '风趣损友', value: '毒舌中带着关心,喜欢用比喻和玩笑拆解问题,聊技术像唠嗑,但关键时刻非常靠谱。' },
  { label: '专业导师', value: '严谨、结构化、循循善诱,像资深技术导师,先讲原理再给例子,善于引导你自己得出结论。' },
  { label: '温柔伙伴', value: '温柔耐心、共情力强,善于鼓励和倾听,反馈先肯定亮点再温和指出可改进之处。' },
  { label: '冷静参谋', value: '理性克制、直击要害,不废话不鸡汤,像冷静的产品/技术参谋,只给最优解和备选方案。' },
  { label: '文青诗人', value: '文字敏感、意象丰富,爱用通感和留白,帮你把技术文章写出人文气息,讲究节奏与美感。' },
];

/** 常见快捷称呼占位 */
export const CALL_USER_SUGGESTIONS = ['你', '小程', '阿哲', '老板', '哥们', '朋友'];

/* ------------------------------------------------------------------ */
/* localStorage 读写                                                   */
/* ------------------------------------------------------------------ */

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch {
    return fallback;
  }
}

export function loadPersona(): AssistantPersona {
  const p = safeParse<Partial<AssistantPersona>>(localStorage.getItem(STORAGE_KEYS.PERSONA), {});
  return { ...DEFAULT_PERSONA, ...p };
}

export function savePersona(persona: AssistantPersona): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PERSONA, JSON.stringify(persona));
  } catch (e) {
    console.warn('Failed to save assistant persona', e);
  }
}

/** 是否已显式保存过助手人设(未保存时引导用户配置) */
export function hasSavedPersona(): boolean {
  return Boolean(localStorage.getItem(STORAGE_KEYS.PERSONA));
}

export function loadLLMConfig(): AssistantLLMConfig {
  const c = safeParse<Partial<AssistantLLMConfig>>(localStorage.getItem(STORAGE_KEYS.LLM), {});
  return { ...DEFAULT_LLM_CONFIG, ...c };
}

export function saveLLMConfig(config: AssistantLLMConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LLM, JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to save assistant LLM config', e);
  }
}

export function loadChatHistory(): AssistantChatMessage[] {
  const list = safeParse<AssistantChatMessage[]>(localStorage.getItem(STORAGE_KEYS.CHAT), []);
  return Array.isArray(list) ? list : [];
}

export function saveChatHistory(messages: AssistantChatMessage[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CHAT, JSON.stringify(messages.slice(-100)));
  } catch (e) {
    console.warn('Failed to save assistant chat history', e);
  }
}

export function clearChatHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.CHAT);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* 模型配置打包                                                        */
/* ------------------------------------------------------------------ */

/** 组装随请求下发的 modelConfig(manual 模式才下发,env 模式交给服务器) */
export function buildModelConfigPayload(): ModelConfigPayload | undefined {
  const cfg = loadLLMConfig();
  if (cfg.mode !== 'manual' || !cfg.provider) return undefined;
  const payload: ModelConfigPayload = { provider: cfg.provider, temperature: cfg.temperature };
  if (cfg.apiKey.trim()) payload.apiKey = cfg.apiKey.trim();
  if (cfg.baseUrl.trim()) payload.baseUrl = cfg.baseUrl.trim();
  if (cfg.model.trim()) payload.model = cfg.model.trim();
  return payload;
}

/** 追加 modelConfig 到请求体(供 aiService / assistantApi 统一使用) */
export function attachModelConfig<T extends object>(body: T): T & { modelConfig?: ModelConfigPayload } {
  const cfg = buildModelConfigPayload();
  return cfg ? { ...body, modelConfig: cfg } : body;
}

/* ------------------------------------------------------------------ */
/* API 调用                                                            */
/* ------------------------------------------------------------------ */

async function postJson(url: string, body?: unknown): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data: any = {};
  try {
    data = await res.json();
  } catch {
    /* 空响应 */
  }
  if (!res.ok || data.success === false) {
    throw new Error(data.error || `请求失败 (HTTP ${res.status})`);
  }
  return data;
}

/** 拉取厂商清单与服务器环境探测结果 */
export async function fetchProviders(): Promise<{ providers: ProviderOption[]; env: { autoProvider: string | null; keysPresent: string[] } }> {
  const res = await fetch('/api/assistant/providers');
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || '获取厂商列表失败');
  return { providers: data.providers || [], env: data.env || { autoProvider: null, keysPresent: [] } };
}

/** 拉取所选厂商真实模型列表 */
export async function fetchProviderModels(modelConfig: ModelConfigPayload): Promise<{ models: string[]; provider: string; source: string }> {
  const data = await postJson('/api/assistant/models', { modelConfig });
  return { models: data.models || [], provider: data.provider, source: data.source };
}

/** 测试模型服务连通性(非流式小对话) */
export async function testAssistantConnection(modelConfig: ModelConfigPayload): Promise<{ text: string; provider: string; model: string }> {
  const data = await postJson('/api/assistant/chat', {
    stream: false,
    messages: [{ role: 'user', content: '你好,请用一句话回复「连接成功」,不要多余内容。' }],
    persona: { name: '测试', personality: '简洁', callUser: '你' },
    modelConfig,
  });
  return { text: data.text || '', provider: data.provider || '', model: data.model || '' };
}

/** 分析文章写作风格(提炼作者性格与写作特点) */
export async function analyzeWritingStyle(params: {
  title: string;
  content: string;
}): Promise<{ data: StyleAnalysisResult; provider: string; model: string }> {
  const body = attachModelConfig({ title: params.title, content: params.content });
  const data = await postJson('/api/assistant/analyze-style', body);
  return { data: data.data as StyleAnalysisResult, provider: data.provider || '', model: data.model || '' };
}

export interface ChatStreamCallbacks {
  onMeta?: (meta: { provider: string; model: string }) => void;
  onDelta: (delta: string) => void;
  onDone?: () => void;
}

/**
 * 助手对话(SSE 流式)。
 * 返回 AbortController,调用方可随时停止生成。
 */
export async function streamAssistantChat(params: {
  messages: AssistantChatMessage[];
  persona: AssistantPersona;
  post?: { title?: string; name?: string; content?: string } | null;
  callbacks: ChatStreamCallbacks;
  signal?: AbortSignal;
}): Promise<void> {
  const { messages, persona, post, callbacks, signal } = params;
  const body = attachModelConfig({
    messages,
    persona,
    post: post || undefined,
  });

  const res = await fetch('/api/assistant/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    let msg = `对话请求失败 (HTTP ${res.status})`;
    try {
      const data = await res.json();
      if (data.error) msg = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  const handleFrame = (frame: string) => {
    if (!frame.startsWith('data:')) return;
    const payload = frame.slice(5).trim();
    if (!payload || payload === '[DONE]') return;
    try {
      const evt = JSON.parse(payload);
      if (evt.error) {
        throw new Error(evt.error);
      }
      if (evt.meta) callbacks.onMeta?.(evt.meta);
      if (typeof evt.delta === 'string' && evt.delta) callbacks.onDelta(evt.delta);
      if (evt.done) callbacks.onDone?.();
    } catch (e) {
      if (e instanceof Error && !e.message.includes('Unexpected token')) throw e;
      // 忽略无法解析的帧
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() || '';
    for (const frame of frames) handleFrame(frame);
  }
  if (buffer.trim()) handleFrame(buffer);
}
