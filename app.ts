/**
 * app.ts — Express 应用本体(所有 API 路由)
 *
 * 同一份代码三种运行方式:
 *   1. 本地开发:server.ts 启动器 + Vite 中间件(bun run dev)
 *   2. 本地生产:server.ts 启动器 + dist 静态托管(bun run build && bun run start)
 *   3. Vercel 部署:api/index.ts 将本文件导出为 Serverless Function(Vercel 检测到
 *      Express 应用后自动以单函数运行;静态前端产物走 Vercel CDN,express.static
 *      在 Vercel 上不生效,故静态服务逻辑放在 server.ts,不放在这里)
 *
 * 本文件不监听端口、不挂载静态服务,保证在 Serverless 环境可安全导入。
 */
import express from 'express';
import dotenv from 'dotenv';
import {
  callLLM,
  makeLLM,
  withModel,
  buildAssistantSystemPrompt,
  buildStyleAnalysisPrompt,
  sanitizeChatMessages,
  sanitizeClientModelConfig,
  listProviderOptions,
  type ClientModelConfig,
} from './ai-backend';
import type { ChatMessage } from 'unillm-sdk';

dotenv.config();

export const app = express();

app.use(express.json({ limit: '15mb' }));

/* ================================================================== */
/* 统一 AI 服务(unillm-sdk 驱动,支持 14 家主流厂商 + 任意 OpenAI 兼容端点) */
/* 配置优先级:前端 modelConfig > HPM_AI_* > UNILLM_* > 厂商变量 > AI_*   */
/* ================================================================== */

function extractError(err: any): string {
  return err && err.message ? err.message : 'AI 服务调用失败,请稍后重试。';
}

// 从请求体中提取前端下发的模型覆盖配置
function bodyModelConfig(body: any): ClientModelConfig | undefined {
  return sanitizeClientModelConfig(body?.modelConfig);
}

// AI Endpoint: Generate front matter (Title, summary, categories, tags, slug)
app.post('/api/ai/generate-frontmatter', async (req, res) => {
  try {
    const { title, content, currentCategories, currentTags } = req.body;
    if (!content && !title) {
      return res.status(400).json({ error: '请提供文章标题或内容以供 AI 分析。' });
    }

    const prompt = `你是一位顶尖的静态博客与 Hugo 架构专家。请分析以下文章标题与 Markdown 正文草稿,为 Hugo 博客生成最优质的 Front Matter 元数据。

文章原标题: ${title || '(未填写)'}
现有分类: ${(currentCategories || []).join(', ')}
现有标签: ${(currentTags || []).join(', ')}

文章正文草稿(节选):
"""
${(content || '').slice(0, 4000)}
"""

请以严格的 JSON 格式输出以下字段,不要添加 Markdown 代码块围栏:
{
  "suggestedTitles": ["标题方案1(爆款吸引人)", "标题方案2(专业严谨)", "标题方案3(教程实战)"],
  "recommendedTitle": "最优推荐标题",
  "summary": "1-2句精炼的导语与文章摘要(适合作为 Hugo 首页卡片摘要及 description)",
  "categories": ["1-2个最合适的核心分类,如 技术架构, 前端开发, 云原生, 读书笔记 等"],
  "tags": ["3-5个精准的技术标签/关键词"],
  "slug": "英文kebab-case别名(用于文件名及固定链接,如 go-microservices-guide)",
  "readingTimeMinutes": 5
}`;

    const result = await callLLM({
      messages: [{ role: 'user', content: prompt }],
      clientConfig: bodyModelConfig(req.body),
      json: true,
    });

    res.json({ success: true, data: result.data });
  } catch (err: any) {
    console.error('Error in generate-frontmatter:', err);
    res.status(500).json({ success: false, error: extractError(err) });
  }
});

// AI Endpoint: Generate title suggestions
app.post('/api/ai/suggest-titles', async (req, res) => {
  try {
    const { title, content } = req.body;

    const prompt = `作为资深科技博客主编,请为以下 Hugo 博客文章提供 5 个不同风格的吸睛、精准、利于 SEO 的中文标题。
当前标题: ${title || '(未命名)'}
正文预览:
${(content || '').slice(0, 3000)}

请以严格的 JSON 格式输出(不要用 Markdown 代码块):
{
  "titles": [
    { "title": "标题内容", "style": "风格说明,如:专业沉稳 / 实践指南 / 避坑心得 / 深入浅出" }
  ]
}`;

    const result = await callLLM({
      messages: [{ role: 'user', content: prompt }],
      clientConfig: bodyModelConfig(req.body),
      json: true,
    });

    const parsed = (result.data as any) || {};
    res.json({ success: true, titles: Array.isArray(parsed.titles) ? parsed.titles : [] });
  } catch (err: any) {
    console.error('Error in suggest-titles:', err);
    res.status(500).json({ success: false, error: extractError(err) });
  }
});

// AI Endpoint: Polish or expand content
app.post('/api/ai/polish-content', async (req, res) => {
  try {
    const { content, action } = req.body;
    if (!content) {
      return res.status(400).json({ error: '内容不能为空' });
    }

    let actionInstruction = '';
    if (action === 'polish') {
      actionInstruction = '对正文进行专业排版润色,纠正错别字,优化语言流畅度,保留 Markdown 格式与代码块。';
    } else if (action === 'structure') {
      actionInstruction = '规范化 Markdown 结构,合理梳理 H2/H3 目录层级,添加要点总结与清晰列表。';
    } else if (action === 'tldr') {
      actionInstruction = '在正文顶部提炼一段精辟的【TL;DR / 核心速览】小结,并以 Markdown 引用块 (> ...) 呈现。';
    } else {
      actionInstruction = '润色并优化 Markdown 表达。';
    }

    const prompt = `请对以下 Hugo 博客文章内容进行处理。
处理要求: ${actionInstruction}

原内容:
"""
${content.slice(0, 10000)}
"""

请直接输出处理后的 Markdown 文本内容,不要输出任何额外的包裹说明或对话内容。`;

    const result = await callLLM({
      messages: [{ role: 'user', content: prompt }],
      clientConfig: bodyModelConfig(req.body),
    });

    res.json({ success: true, polishedContent: result.text });
  } catch (err: any) {
    console.error('Error in polish-content:', err);
    res.status(500).json({ success: false, error: extractError(err) });
  }
});

/* ================================================================== */
/* AI 助手端点(/api/assistant/*)                                       */
/* ================================================================== */

// 厂商清单 + 服务器环境探测(供设置页渲染厂商下拉与 Key 状态提示)
app.get('/api/assistant/providers', (req, res) => {
  res.json({ success: true, ...listProviderOptions() });
});

// 拉取所选厂商的真实模型列表(需 Key 可用;失败自动回退内置注册表)
app.post('/api/assistant/models', async (req, res) => {
  try {
    const clientConfig = bodyModelConfig(req.body);
    const llm = makeLLM(clientConfig);
    const { models, source } = await llm.listModels();
    res.json({
      success: true,
      provider: llm.provider,
      models,
      source,
      model: llm.config.model || null,
    });
  } catch (err: any) {
    console.error('Error listing models:', err);
    res.status(500).json({ success: false, error: extractError(err) });
  }
});

// 分析选中文章 → 提炼作者性格与写作特点(生成可被 AI 模仿的风格画像)
app.post('/api/assistant/analyze-style', async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!content || content.trim().length < 50) {
      return res.status(400).json({ success: false, error: '文章内容太短,至少需要 50 字才能分析写作风格。' });
    }
    const result = await callLLM({
      messages: [{ role: 'user', content: buildStyleAnalysisPrompt(title, content) }],
      clientConfig: bodyModelConfig(req.body),
      json: true,
    });
    res.json({ success: true, data: result.data, provider: result.provider, model: result.model });
  } catch (err: any) {
    console.error('Error in analyze-style:', err);
    res.status(500).json({ success: false, error: extractError(err) });
  }
});

// 助手对话(默认 SSE 流式;stream:false 或非 SSE 请求时返回完整 JSON)
app.post('/api/assistant/chat', async (req, res) => {
  try {
    const { persona, post, modelConfig, stream } = req.body;
    const rawMessages = sanitizeChatMessages(req.body?.messages);
    if (rawMessages.length === 0) {
      return res.status(400).json({ success: false, error: '消息内容不能为空。' });
    }
    const last = rawMessages[rawMessages.length - 1];
    if (last.role !== 'user') {
      return res.status(400).json({ success: false, error: '最后一条消息必须是用户消息。' });
    }

    const systemPrompt = buildAssistantSystemPrompt(persona, post);
    const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt }, ...rawMessages];
    const clientConfig = bodyModelConfig({ modelConfig });
    const llm = makeLLM(clientConfig);

    // 模型兜底候选:显式模型 > Gemini 旧版候选序列 > 注册表默认
    const candidates: string[] = [];
    if (!clientConfig?.model && llm.provider === 'gemini') {
      const seen = new Set<string>([llm.config.model]);
      for (const m of [llm.config.model, 'gemini-2.5-flash', 'gemini-3-flash', 'gemini-2.5-pro', 'gemini-3-pro']) {
        if (m && !seen.has(m)) {
          seen.add(m);
          candidates.push(m);
        }
      }
    }
    const attempts = candidates.length > 0 ? candidates : [undefined as string | undefined];

    // ---- 非流式 ----
    const isSSE = stream !== false && typeof req.headers.accept === 'string' && req.headers.accept.includes('text/event-stream');
    if (!isSSE) {
      let lastError: unknown = null;
      for (const model of attempts) {
        try {
          const active = model ? withModel(llm, model) : llm;
          const result = await active.chat(messages);
          return res.json({ success: true, text: result.text, provider: result.provider, model: result.model });
        } catch (err) {
          lastError = err;
          console.warn(`[chat] model=${model || llm.config.model} 调用失败:`, extractError(err));
        }
      }
      return res.status(500).json({ success: false, error: extractError(lastError) });
    }

    // ---- SSE 流式 ----
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const controller = new AbortController();
    // 注意:断连要监听 res 的 close(req 的 close 在请求体读完时就触发,不是断连信号)
    const onClose = () => controller.abort();
    res.on('close', onClose);

    const send = (payload: object) => {
      try {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      } catch {
        /* 客户端断开 */
      }
    };

    try {
      let attempted = false;
      let resolvedModel = llm.config.model || '';
      for (const model of attempts) {
        attempted = true;
        try {
          const active = model ? withModel(llm, model) : llm;
          resolvedModel = active.config.model || resolvedModel;
          send({ meta: { provider: active.provider, model: resolvedModel } });
          const streamGen = active.chatStream(messages, { signal: controller.signal });
          let chunkCount = 0;
          for await (const delta of streamGen) {
            if (!delta) continue;
            chunkCount += 1;
            send({ delta });
          }
          if (chunkCount === 0) {
            throw new Error('模型返回了空内容,请重试或更换模型。');
          }
          send({ done: true });
          return;
        } catch (err: any) {
          if (controller.signal.aborted) {
            send({ done: true, aborted: true });
            return;
          }
          const isLast = model === attempts[attempts.length - 1];
          if (isLast) throw err;
          console.warn(`[chat-stream] model=${model} 失败,尝试下一个:`, extractError(err));
        }
      }
      if (!attempted) throw new Error('没有可用的模型。');
    } catch (err: any) {
      send({ error: extractError(err) });
      send({ done: true });
    } finally {
      res.removeListener('close', onClose);
      res.end();
    }
  } catch (err: any) {
    console.error('Error in assistant chat:', err);
    res.status(500).json({ success: false, error: extractError(err) });
  }
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    ai: 'unillm-sdk',
    env: listProviderOptions().env,
    timestamp: new Date().toISOString(),
  });
});

/* ================================================================== */
/* GitHub 代理                                                          */
/* ================================================================== */

// Server-side GitHub API verification proxy
app.post('/api/github/test-repo', async (req, res) => {
  try {
    const { owner, repo, branch, token, postsDir } = req.body;
    if (!owner || !repo) {
      return res.status(400).json({ success: false, error: '请填写 GitHub 用户名/组织名及仓库名称。' });
    }

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Hugo-Post-Manager-App',
    };
    if (token && token.trim()) {
      headers['Authorization'] = `token ${token.trim()}`;
    }

    // 1. Check repo access
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!repoRes.ok) {
      if (repoRes.status === 404) {
        return res.json({
          success: false,
          error: '找不到该仓库。若为私有仓库,请检查 PAT Token 是否具备 repo 读写权限;若为公开仓库,请核对 Owner/Repo 拼写。',
        });
      }
      if (repoRes.status === 401) {
        return res.json({ success: false, error: 'GitHub Token 无效或已过期,请检查 Token 凭证。' });
      }
      return res.json({ success: false, error: `GitHub API 返回状态码: ${repoRes.status}` });
    }

    const repoInfo = (await repoRes.json()) as any;
    const targetBranch = branch || repoInfo.default_branch || 'main';

    // 2. Check posts directory (Support both Single Markdown files and Hugo Leaf Page Bundles)
    const cleanPostsDir = (postsDir || 'content/posts').replace(/^\/+|\/+$/g, '');
    let postsCount = 0;
    let dirFound = false;
    let detectedStaticDirs: string[] = [];

    // Fast check with Git Trees API (recursive=1)
    try {
      const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${targetBranch}?recursive=1`, { headers });
      if (treeRes.ok) {
        const treeData = (await treeRes.json()) as any;
        if (Array.isArray(treeData.tree)) {
          dirFound = treeData.tree.some((item: any) => item.path === cleanPostsDir || item.path.startsWith(`${cleanPostsDir}/`));

          const markdownFiles = treeData.tree.filter((item: any) =>
            item.type === 'blob' &&
            item.path.startsWith(`${cleanPostsDir}/`) &&
            (item.path.endsWith('.md') || item.path.endsWith('.markdown'))
          );
          postsCount = markdownFiles.length;

          // Detect common static directories
          const hasStaticImg = treeData.tree.some((item: any) => item.path.startsWith('static/img'));
          const hasStaticImages = treeData.tree.some((item: any) => item.path.startsWith('static/images'));
          if (hasStaticImg) detectedStaticDirs.push('static/img');
          if (hasStaticImages) detectedStaticDirs.push('static/images');
        }
      }
    } catch {
      // Non-blocking fallback below
    }

    // Fallback to contents API if tree wasn't accessible
    if (!dirFound) {
      const dirRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${cleanPostsDir}?ref=${targetBranch}`, { headers });
      if (dirRes.ok) {
        dirFound = true;
        const dirContents = (await dirRes.json()) as any;
        if (Array.isArray(dirContents)) {
          postsCount = dirContents.filter((f: any) => f.name.endsWith('.md') || f.name.endsWith('.markdown') || f.type === 'dir').length;
        }
      }
    }

    // 3. Check GitHub Actions workflow permission if token provided
    let hasWorkflowRuns = false;
    let runsCount = 0;
    try {
      const runsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=5`, { headers });
      if (runsRes.ok) {
        const runsData = (await runsRes.json()) as any;
        hasWorkflowRuns = true;
        runsCount = runsData.total_count || (runsData.workflow_runs || []).length;
      }
    } catch {
      // Non-blocking
    }

    res.json({
      success: true,
      repo: repoInfo.full_name,
      isPrivate: repoInfo.private,
      defaultBranch: repoInfo.default_branch,
      targetBranch,
      dirFound,
      cleanPostsDir,
      postsCount,
      hasWorkflowRuns,
      runsCount,
      hasToken: Boolean(token && token.trim()),
    });
  } catch (err: any) {
    console.error('Error testing GitHub repo:', err);
    res.status(500).json({ success: false, error: err.message || '连接 GitHub 失败,请检查网络连接。' });
  }
});

export default app;
