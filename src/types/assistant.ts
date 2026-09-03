/** AI 助手相关类型 */

/** 大模型服务配置:mode = 'env' 时走服务器环境变量;'manual' 时用 UI 填写的 Key */
export interface AssistantLLMConfig {
  mode: 'env' | 'manual';
  provider: string; // ProviderId,如 deepseek / gemini / openai ...
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
}

/** 助手人设配置 */
export interface AssistantPersona {
  name: string; // 助手名字
  personality: string; // 性格描述
  callUser: string; // 对我的称呼
  styleProfile: string; // 写作风格画像(由文章分析生成,可手写/编辑)
  extraRules: string; // 额外规则
}

/** 聊天消息(历史记录,仅 user / assistant) */
export interface AssistantChatMessage {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

/** 厂商选项(来自 /api/assistant/providers) */
export interface ProviderOption {
  id: string;
  label: string;
  kind: 'openai' | 'anthropic' | 'gemini';
  needsApiKey: boolean;
  defaultBaseUrl: string;
  defaultModels: string[];
  note?: string;
  docs?: string;
}

/** 风格分析结果 */
export interface StyleAnalysisResult {
  tone: string;
  vocabulary: string;
  sentence: string;
  structure: string;
  habits: string[];
  punctuation: string;
  voice: string;
  profileText: string;
}

/** 发给后端的 modelConfig 覆盖(与 ai-backend.ClientModelConfig 对应) */
export interface ModelConfigPayload {
  provider?: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}
