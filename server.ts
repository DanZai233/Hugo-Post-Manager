import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Lazy initialize Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('服务器端未检测到 GEMINI_API_KEY 环境变量，请在 AI Studio 设置中配置 API 密钥。');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Resilient generation with automatic fallback models
async function generateGeminiContentWithFallback(prompt: string, config?: any): Promise<string> {
  const ai = getGeminiClient();
  const models = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config,
      });
      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Gemini model ${model} failed, trying next fallback:`, err.message || err);
    }
  }

  throw lastError || new Error('所有可用 AI 模型均未响应，请稍后重试。');
}

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// AI Endpoint: Generate front matter (Title, summary, categories, tags, slug)
app.post('/api/ai/generate-frontmatter', async (req, res) => {
  try {
    const { title, content, currentCategories, currentTags } = req.body;
    if (!content && !title) {
      return res.status(400).json({ error: '请提供文章标题或内容以供 AI 分析。' });
    }

    const ai = getGeminiClient();
    const prompt = `你是一位顶尖的静态博客与 Hugo 架构专家。请分析以下文章标题与 Markdown 正文草稿，为 Hugo 博客生成最优质的 Front Matter 元数据。

文章原标题: ${title || '(未填写)'}
现有分类: ${(currentCategories || []).join(', ')}
现有标签: ${(currentTags || []).join(', ')}

文章正文草稿（节选）:
"""
${(content || '').slice(0, 4000)}
"""

请以严格的 JSON 格式输出以下字段，不要添加 Markdown 代码块围栏（\`\`\`json 等）：
{
  "suggestedTitles": ["标题方案1(爆款吸引人)", "标题方案2(专业严谨)", "标题方案3(教程实战)"],
  "recommendedTitle": "最优推荐标题",
  "summary": "1-2句精炼的导语与文章摘要（适合作为 Hugo 首页卡片摘要及 description）",
  "categories": ["1-2个最合适的核心分类，如 技术架构, 前端开发, 云原生, 读书笔记 等"],
  "tags": ["3-5个精准的技术标签/关键词"],
  "slug": "英文kebab-case别名(用于文件名及固定链接，如 go-microservices-guide)",
  "readingTimeMinutes": 5
}`;

    const responseText = await generateGeminiContentWithFallback(prompt, {
      responseMimeType: 'application/json',
    });

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        data = JSON.parse(match[0]);
      } else {
        throw new Error('AI 返回数据解析失败');
      }
    }

    res.json({ success: true, data });
  } catch (err: any) {
    console.error('Error in generate-frontmatter:', err);
    res.status(500).json({
      success: false,
      error: err.message || '生成 Front Matter 失败',
    });
  }
});

// AI Endpoint: Generate title suggestions
app.post('/api/ai/suggest-titles', async (req, res) => {
  try {
    const { title, content } = req.body;

    const prompt = `作为资深科技博客主编，请为以下 Hugo 博客文章提供 5 个不同风格的吸睛、精准、利于 SEO 的中文标题。
当前标题: ${title || '(未命名)'}
正文预览:
${(content || '').slice(0, 3000)}

请以严格的 JSON 格式输出（不要用 Markdown 代码块）：
{
  "titles": [
    { "title": "标题内容", "style": "风格说明，如：专业沉稳 / 实践指南 / 避坑心得 / 深入浅出" }
  ]
}`;

    const text = await generateGeminiContentWithFallback(prompt, {
      responseMimeType: 'application/json',
    });

    let parsed = { titles: [] };
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }
    res.json({ success: true, titles: parsed.titles || [] });
  } catch (err: any) {
    console.error('Error in suggest-titles:', err);
    res.status(500).json({ success: false, error: err.message || '生成标题建议失败' });
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
      actionInstruction = '对正文进行专业排版润色，纠正错别字，优化语言流畅度，保留 Markdown 格式与代码块。';
    } else if (action === 'structure') {
      actionInstruction = '规范化 Markdown 结构，合理梳理 H2/H3 目录层级，添加要点总结与清晰列表。';
    } else if (action === 'tldr') {
      actionInstruction = '在正文顶部提炼一段精辟的【TL;DR / 核心速览】小结，并以 Markdown 引用块 (> ...) 呈现。';
    } else {
      actionInstruction = '润色并优化 Markdown 表达。';
    }

    const prompt = `请对以下 Hugo 博客文章内容进行处理。
处理要求: ${actionInstruction}

原内容:
"""
${content.slice(0, 10000)}
"""

请直接输出处理后的 Markdown 文本内容，不要输出任何额外的包裹说明或对话内容。`;

    const text = await generateGeminiContentWithFallback(prompt);

    res.json({ success: true, polishedContent: text });
  } catch (err: any) {
    console.error('Error in polish-content:', err);
    res.status(500).json({ success: false, error: err.message || '润色内容失败' });
  }
});

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
          error: '找不到该仓库。若为私有仓库，请检查 PAT Token 是否具备 repo 读写权限；若为公开仓库，请核对 Owner/Repo 拼写。',
        });
      }
      if (repoRes.status === 401) {
        return res.json({ success: false, error: 'GitHub Token 无效或已过期，请检查 Token 凭证。' });
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
    res.status(500).json({ success: false, error: err.message || '连接 GitHub 失败，请检查网络连接。' });
  }
});

// Vite middleware and static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Hugo Studio Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
