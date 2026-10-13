import { attachModelConfig } from './assistantApi';

export interface AIFullFrontMatterResult {
  suggestedTitles: string[];
  recommendedTitle: string;
  summary: string;
  categories: string[];
  tags: string[];
  slug: string;
  readingTimeMinutes?: number;
}

export interface TitleSuggestion {
  title: string;
  style: string;
}

async function postJson(url: string, body: unknown): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(attachModelConfig(body as object)),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'AI 服务请求失败,请检查网络或 API Key 配置。');
  }
  return data;
}

export function stripReasoningArtifacts(text: string): string {
  if (!text) return '';

  let cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
    .replace(/^\s*(思考过程|推理过程|Reasoning|Thoughts?)\s*[:：][\s\S]*?(?=\n#{1,6}\s|\n正文\s*[:：]|\n最终答案\s*[:：]|$)/i, (match) => {
      return /(?:\n#{1,6}\s|\n正文\s*[:：]|\n最终答案\s*[:：])/.test(match) ? match.replace(/[\s\S]*?(?=\n#{1,6}\s|\n正文\s*[:：]|\n最终答案\s*[:：])/, '') : '';
    })
    .replace(/^\s*(正文|最终答案)\s*[:：]\s*/i, '')
    .trim();

  const fenced = cleaned.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/i);
  if (fenced) {
    cleaned = fenced[1].trim();
  }

  return cleaned;
}

export async function requestFrontMatterGeneration(params: {
  title: string;
  content: string;
  currentCategories?: string[];
  currentTags?: string[];
}): Promise<AIFullFrontMatterResult> {
  const data = await postJson('/api/ai/generate-frontmatter', params);
  return data.data as AIFullFrontMatterResult;
}

export async function requestTitleSuggestions(params: {
  title: string;
  content: string;
}): Promise<TitleSuggestion[]> {
  const data = await postJson('/api/ai/suggest-titles', params);
  return data.titles as TitleSuggestion[];
}

export async function requestContentPolishing(params: {
  content: string;
  action: 'polish' | 'structure' | 'tldr';
}): Promise<string> {
  const data = await postJson('/api/ai/polish-content', params);
  return stripReasoningArtifacts(data.polishedContent as string);
}
