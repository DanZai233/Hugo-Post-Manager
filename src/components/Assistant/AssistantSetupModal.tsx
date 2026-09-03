import React, { useEffect, useState } from 'react';
import {
  X,
  Settings,
  UserRound,
  Bot,
  Key,
  Check,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Eye,
  EyeOff,
  Zap,
  ExternalLink,
  Sparkles,
  Wand2,
  ShieldCheck,
} from 'lucide-react';
import {
  AssistantLLMConfig,
  AssistantPersona,
  ProviderOption,
} from '../../types/assistant';
import {
  DEFAULT_LLM_CONFIG,
  DEFAULT_PERSONA,
  PERSONALITY_PRESETS,
  CALL_USER_SUGGESTIONS,
  fetchProviders,
  fetchProviderModels,
  testAssistantConnection,
} from '../../services/assistantApi';
import type { ModelConfigPayload } from '../../types/assistant';

interface AssistantSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  persona: AssistantPersona;
  llmConfig: AssistantLLMConfig;
  onSave: (persona: AssistantPersona, llmConfig: AssistantLLMConfig) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const PROVIDER_FALLBACKS: { id: string; label: string; needsApiKey: boolean; defaultBaseUrl: string; defaultModels: string[]; note?: string }[] = [
  { id: 'deepseek', label: 'DeepSeek', needsApiKey: true, defaultBaseUrl: 'https://api.deepseek.com/v1', defaultModels: ['deepseek-chat', 'deepseek-reasoner'] },
  { id: 'openai', label: 'OpenAI', needsApiKey: true, defaultBaseUrl: 'https://api.openai.com/v1', defaultModels: ['gpt-4o', 'gpt-4o-mini'] },
  { id: 'anthropic', label: 'Anthropic Claude', needsApiKey: true, defaultBaseUrl: 'https://api.anthropic.com', defaultModels: ['claude-sonnet-4-20250514'] },
  { id: 'gemini', label: 'Google Gemini', needsApiKey: true, defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', defaultModels: ['gemini-2.5-flash', 'gemini-2.5-pro'] },
  { id: 'moonshot', label: 'Kimi(月之暗面)', needsApiKey: true, defaultBaseUrl: 'https://api.moonshot.cn/v1', defaultModels: ['kimi-k2-0711-preview', 'moonshot-v1-32k'] },
  { id: 'qwen', label: '通义千问(阿里)', needsApiKey: true, defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultModels: ['qwen-max', 'qwen-plus', 'qwen-turbo'] },
  { id: 'zhipu', label: '智谱 GLM', needsApiKey: true, defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4', defaultModels: ['glm-4-plus', 'glm-4-flash'] },
  { id: 'volcengine', label: '火山方舟(豆包)', needsApiKey: true, defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3', defaultModels: ['doubao-1-5-pro-32k-250115'] },
  { id: 'xai', label: 'Grok(xAI)', needsApiKey: true, defaultBaseUrl: 'https://api.x.ai/v1', defaultModels: ['grok-4', 'grok-3-mini'] },
  { id: 'groq', label: 'Groq', needsApiKey: true, defaultBaseUrl: 'https://api.groq.com/openai/v1', defaultModels: ['llama-3.3-70b-versatile'] },
  { id: 'mistral', label: 'Mistral', needsApiKey: true, defaultBaseUrl: 'https://api.mistral.ai/v1', defaultModels: ['mistral-large-latest'] },
  { id: 'siliconflow', label: '硅基流动', needsApiKey: true, defaultBaseUrl: 'https://api.siliconflow.cn/v1', defaultModels: ['deepseek-ai/DeepSeek-V3'] },
  { id: 'ollama', label: 'Ollama(本地,免 Key)', needsApiKey: false, defaultBaseUrl: 'http://localhost:11434/v1', defaultModels: ['llama3.1', 'qwen2.5'] },
  { id: 'custom', label: '自定义 OpenAI 兼容端点', needsApiKey: true, defaultBaseUrl: 'https://your-endpoint.example.com/v1', defaultModels: [], note: '任意兼容 OpenAI Chat Completions 协议的网关/代理,如 OneAPI、New API、vLLM 等。' },
];

export const AssistantSetupModal: React.FC<AssistantSetupModalProps> = ({
  isOpen,
  onClose,
  persona,
  llmConfig,
  onSave,
  onShowToast,
}) => {
  const [tab, setTab] = useState<'persona' | 'model'>('persona');
  const [draftPersona, setDraftPersona] = useState<AssistantPersona>({ ...DEFAULT_PERSONA });
  const [draftLLM, setDraftLLM] = useState<AssistantLLMConfig>({ ...DEFAULT_LLM_CONFIG });

  // 模型服务页
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [envInfo, setEnvInfo] = useState<{ autoProvider: string | null; keysPresent: string[] }>({ autoProvider: null, keysPresent: [] });
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelsSource, setModelsSource] = useState<string>('');
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [showKey, setShowKey] = useState(false);

  // Sync drafts whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setDraftPersona({ ...DEFAULT_PERSONA, ...persona });
      setDraftLLM({ ...DEFAULT_LLM_CONFIG, ...llmConfig });
      setTab('persona');
      setTestResult(null);
      setAvailableModels([]);
      setModelsSource('');
      // 拉取服务器厂商注册表 + 环境状态
      setLoadingProviders(true);
      fetchProviders()
        .then((r) => {
          setProviders(r.providers);
          setEnvInfo(r.env);
        })
        .catch((e) => console.warn('Failed to fetch providers', e))
        .finally(() => setLoadingProviders(false));
    }
  }, [isOpen, persona, llmConfig]);

  if (!isOpen) return null;

  const providerList: ProviderOption[] = providers.length > 0 ? providers : (PROVIDER_FALLBACKS as unknown as ProviderOption[]);
  const providerMeta = providerList.find((p) => p.id === draftLLM.provider);
  const manual = draftLLM.mode === 'manual';

  /** 从当前草稿构建测试/拉模型的临时 modelConfig */
  const tempModelConfig = (): ModelConfigPayload => {
    const p: ModelConfigPayload = { provider: draftLLM.provider, temperature: draftLLM.temperature };
    if (draftLLM.apiKey.trim()) p.apiKey = draftLLM.apiKey.trim();
    if (draftLLM.baseUrl.trim()) p.baseUrl = draftLLM.baseUrl.trim();
    if (draftLLM.model.trim()) p.model = draftLLM.model.trim();
    return p;
  };

  const handlePickProvider = (id: string) => {
    const meta = providerList.find((p) => p.id === id);
    setDraftLLM((prev) => ({
      ...prev,
      provider: id,
      baseUrl: prev.baseUrl || meta?.defaultBaseUrl || '',
      model: prev.model || (meta && meta.defaultModels.length > 0 ? meta.defaultModels[0] : ''),
    }));
    setAvailableModels([]);
    setModelsSource('');
    setTestResult(null);
  };

  const handleFetchModels = async () => {
    if (!draftLLM.provider) return;
    setLoadingModels(true);
    setTestResult(null);
    try {
      const r = await fetchProviderModels(tempModelConfig());
      setAvailableModels(r.models || []);
      setModelsSource(r.source);
      if (r.models && r.models.length > 0 && !draftLLM.model) {
        setDraftLLM((prev) => ({ ...prev, model: r.models[0] }));
      }
      onShowToast(`已获取 ${r.provider} 的 ${r.models.length} 个可用模型(来源:${r.source === 'api' ? '官方 API' : '内置注册表'})`, 'info');
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message || '拉取模型列表失败' });
    } finally {
      setLoadingModels(false);
    }
  };

  const handleTest = async () => {
    if (!draftLLM.provider) return;
    setTesting(true);
    setTestResult(null);
    try {
      const r = await testAssistantConnection(tempModelConfig());
      const snippet = (r.text || '').trim().slice(0, 80);
      setTestResult({ ok: true, message: `连接成功 · ${r.provider}/${r.model || '默认模型'} 已响应${snippet ? `:「${snippet}${r.text.length > 80 ? '…' : ''}」` : ''}` });
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message || '连接失败,请检查 Key / Base URL / 网络' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const finalPersona: AssistantPersona = {
      name: draftPersona.name.trim() || '写作助手',
      personality: draftPersona.personality.trim(),
      callUser: draftPersona.callUser.trim() || '你',
      styleProfile: draftPersona.styleProfile.trim(),
      extraRules: draftPersona.extraRules.trim(),
    };
    const finalLLM: AssistantLLMConfig = {
      ...draftLLM,
      provider: manual ? draftLLM.provider : '',
      apiKey: manual ? draftLLM.apiKey : '',
      baseUrl: manual ? draftLLM.baseUrl : '',
      model: manual ? draftLLM.model : '',
    };
    onSave(finalPersona, finalLLM);
    onShowToast('✅ 助手配置已保存');
    onClose();
  };

  const envBlock = `# 服务器端直接配好 Key,浏览器无需再填(优先级:前端手动配置 > 环境变量)
HPM_AI_PROVIDER=deepseek
HPM_AI_API_KEY=sk-xxxx
HPM_AI_MODEL=deepseek-chat
# 也可用 unillm 标准变量:UNILLM_PROVIDER / UNILLM_API_KEY / UNILLM_MODEL
# 或各厂商变量:DEEPSEEK_API_KEY、OPENAI_API_KEY、GEMINI_API_KEY、MOONSHOT_API_KEY ...`;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-[#0b1120] rounded-2xl shadow-2xl border border-slate-800 text-slate-300 w-full max-w-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-fuchsia-600 to-indigo-600 text-white shadow-lg shadow-fuchsia-600/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-white text-base">助手设置</h2>
              <p className="text-xs text-slate-400">配置你的专属写作助手:名字、性格、对你的称呼,以及背后的主流大模型 API Key</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1.5 px-6 pt-3 pb-2 border-b border-slate-800 text-xs shrink-0">
          <button
            onClick={() => setTab('persona')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${tab === 'persona' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`}
          >
            <UserRound className="w-3.5 h-3.5" />
            人设与性格
          </button>
          <button
            onClick={() => setTab('model')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${tab === 'model' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`}
          >
            <Key className="w-3.5 h-3.5" />
            模型服务(API Key)
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-xs pr-3">
          {tab === 'persona' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-indigo-400" />
                    助手名字
                  </label>
                  <input
                    type="text"
                    placeholder="例如:阿墨、小助手、Muse..."
                    value={draftPersona.name}
                    onChange={(e) => setDraftPersona({ ...draftPersona, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    对我的称呼
                  </label>
                  <input
                    type="text"
                    placeholder="例如:老板、阿哲、朋友..."
                    value={draftPersona.callUser}
                    onChange={(e) => setDraftPersona({ ...draftPersona, callUser: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {CALL_USER_SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setDraftPersona({ ...draftPersona, callUser: s })}
                        className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${draftPersona.callUser === s ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">性格描述(怎么跟你说话、帮你想问题)</label>
                <textarea
                  rows={3}
                  value={draftPersona.personality}
                  onChange={(e) => setDraftPersona({ ...draftPersona, personality: e.target.value })}
                  placeholder="描述你希望助手拥有的性格、语气与说话风格..."
                  className="w-full px-3 py-2 text-xs bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all resize-none leading-relaxed"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {PERSONALITY_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setDraftPersona({ ...draftPersona, personality: p.value })}
                      className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:border-fuchsia-500/50 hover:bg-fuchsia-500/10 hover:text-fuchsia-200 transition-colors text-[11px]"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-fuchsia-400" />
                  写作风格画像(模仿你的文风)
                  <span className="text-slate-500 font-normal">
                    — 可在聊天面板用「分析本文风格」从你的文章自动提炼
                  </span>
                </label>
                <textarea
                  rows={5}
                  value={draftPersona.styleProfile}
                  onChange={(e) => setDraftPersona({ ...draftPersona, styleProfile: e.target.value })}
                  placeholder='例如:理性克制中带点理工男自嘲;喜欢"直接给结论再解释";善用括号吐槽与短句推进;几乎不用感叹号...'
                  className="w-full px-3 py-2 text-xs bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-500 transition-all resize-none leading-relaxed font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">额外规则(可选)</label>
                <input
                  type="text"
                  placeholder="例如:回复控制在 300 字内 / 不要用 emoji / 代码必须给完整可运行示例"
                  value={draftPersona.extraRules}
                  onChange={(e) => setDraftPersona({ ...draftPersona, extraRules: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
          )}

          {tab === 'model' && (
            <div className="space-y-4 animate-fade-in">
              {/* 模式切换 */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/70 border border-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setDraftLLM({ ...draftLLM, mode: 'env' })}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${draftLLM.mode === 'env' ? 'bg-emerald-600/90 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  使用服务器环境变量(推荐)
                </button>
                <button
                  type="button"
                  onClick={() => setDraftLLM({ ...draftLLM, mode: 'manual' })}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${draftLLM.mode === 'manual' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Key className="w-3.5 h-3.5" />
                  手动填写 API Key(存本机)
                </button>
              </div>

              {!manual && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3.5 space-y-2 animate-fade-in">
                  <p className="text-emerald-300 font-medium flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Key 由服务器统一管理,所有 AI 功能共用
                  </p>
                  <p className="text-slate-400 leading-relaxed">
                    将厂商 Key 配置在服务器 .env(本机开发即项目根目录 .env),支持 HPM_AI_* 前缀、UNILLM_* 通用变量或各厂商专用变量(如
                    DEEPSEEK_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY),无需修改代码即可切换厂商。
                  </p>
                  <div className="flex flex-wrap gap-1.5 items-center text-[10px]">
                    <span className="text-slate-500">服务器环境探测:</span>
                    {envInfo.autoProvider ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono">
                        自动识别厂商:{envInfo.autoProvider}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-500">未探测到厂商 Key</span>
                    )}
                    {envInfo.keysPresent.map((k) => (
                      <span key={k} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400 font-mono">
                        {k} ✓
                      </span>
                    ))}
                  </div>
                  <pre className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 text-[10px] leading-relaxed text-slate-400 overflow-x-auto font-mono">{envBlock}</pre>
                </div>
              )}

              {manual && (
                <div className="space-y-3 animate-fade-in">
                  {/* 厂商选择 */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">模型厂商(14 家主流 + 任意 OpenAI 兼容端点)</label>
                    {loadingProviders ? (
                      <div className="flex items-center gap-2 text-slate-500 py-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> 正在加载厂商注册表...
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                        {providerList.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handlePickProvider(p.id)}
                            className={`px-2 py-1 rounded-lg border text-[11px] transition-all ${draftLLM.provider === p.id ? 'bg-indigo-600 border-indigo-500 text-white shadow' : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'}`}
                          >
                            {p.label}
                            {!p.needsApiKey && <span className="ml-1 text-emerald-400">免Key</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {providerMeta?.note && (
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2 text-amber-200/80">{providerMeta.note}</div>
                  )}

                  {/* API Key */}
                  {providerMeta?.needsApiKey !== false && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-indigo-400" /> API Key
                        <a
                          href="https://github.com/DanZai233/unillm-sdk"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-indigo-400 hover:underline inline-flex items-center gap-0.5 ml-1"
                        >
                          各厂商 Key 申请入口 <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type={showKey ? 'text' : 'password'}
                          placeholder="sk-..."
                          value={draftLLM.apiKey}
                          onChange={(e) => setDraftLLM({ ...draftLLM, apiKey: e.target.value })}
                          className="flex-1 px-3 py-2 text-xs font-mono bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKey(!showKey)}
                          className="p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                        >
                          {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Key 仅保存在本机浏览器 localStorage,随请求发送到本地服务端调用,不写入任何远端。</p>
                    </div>
                  )}

                  {/* Base URL */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5 text-slate-400" /> Base URL
                      <span className="text-slate-500 font-normal">(代理 / 网关可改;留空用厂商默认)</span>
                    </label>
                    <input
                      type="text"
                      placeholder={providerMeta?.defaultBaseUrl || 'https://...'}
                      value={draftLLM.baseUrl}
                      onChange={(e) => setDraftLLM({ ...draftLLM, baseUrl: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all"
                    />
                  </div>

                  {/* 模型 */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-300">模型</label>
                      <button
                        type="button"
                        onClick={handleFetchModels}
                        disabled={loadingModels || !draftLLM.provider}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-900 border border-slate-700 text-slate-300 hover:border-indigo-500/50 text-[11px] disabled:opacity-40 transition-colors"
                      >
                        {loadingModels ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        拉取该厂商可用模型
                      </button>
                    </div>
                    <input
                      type="text"
                      list="assistant-model-list"
                      placeholder={providerMeta && providerMeta.defaultModels.length > 0 ? providerMeta.defaultModels[0] : '输入模型名,如 deepseek-chat'}
                      value={draftLLM.model}
                      onChange={(e) => setDraftLLM({ ...draftLLM, model: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all"
                    />
                    <datalist id="assistant-model-list">
                      {(availableModels.length > 0 ? availableModels : (providerMeta?.defaultModels || [])).map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                    <div className="flex flex-wrap gap-1 mt-1.5 items-center">
                      {availableModels.length > 0 && (
                        <span className="text-[10px] text-emerald-400 font-mono mr-0.5">
                          {modelsSource === 'api' ? '来自官方 API' : '内置注册表(官方 API 暂不可用)'}:
                        </span>
                      )}
                      {(availableModels.length > 0 ? availableModels : (providerMeta?.defaultModels || [])).slice(0, 6).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setDraftLLM({ ...draftLLM, model: m })}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${draftLLM.model === m ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 温度 */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-300">创作温度(Temperature)</label>
                      <span className="font-mono text-[11px] text-indigo-300">{draftLLM.temperature.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1.5}
                      step={0.05}
                      value={draftLLM.temperature}
                      onChange={(e) => setDraftLLM({ ...draftLLM, temperature: parseFloat(e.target.value) })}
                      className="w-full accent-indigo-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                      <span>0.0 严谨稳定</span>
                      <span>0.7 均衡</span>
                      <span>1.5 放飞创意</span>
                    </div>
                  </div>

                  {/* 测试 */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTest}
                      disabled={testing || !draftLLM.provider}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 hover:border-indigo-500/50 text-xs font-medium disabled:opacity-40 transition-colors"
                    >
                      {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-400" />}
                      {testing ? '正在测试...' : '测试连接'}
                    </button>
                    {testResult && (
                      <div className={`flex-1 text-[11px] leading-relaxed flex items-start gap-1.5 ${testResult.ok ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {testResult.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                        <span>{testResult.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-2 shrink-0">
          {manual && draftLLM.provider && (
            <span className="mr-auto text-[10px] text-slate-500 font-mono flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-400" />
              将使用 {draftLLM.provider} 手动配置
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
};
