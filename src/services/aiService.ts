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

export async function requestFrontMatterGeneration(params: {
  title: string;
  content: string;
  currentCategories?: string[];
  currentTags?: string[];
}): Promise<AIFullFrontMatterResult> {
  const res = await fetch('/api/ai/generate-frontmatter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'AI Front Matter 生成失败，请检查网络或 API 密钥配置。');
  }

  return data.data as AIFullFrontMatterResult;
}

export async function requestTitleSuggestions(params: {
  title: string;
  content: string;
}): Promise<TitleSuggestion[]> {
  const res = await fetch('/api/ai/suggest-titles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || '生成标题建议失败。');
  }

  return data.titles as TitleSuggestion[];
}

export async function requestContentPolishing(params: {
  content: string;
  action: 'polish' | 'structure' | 'tldr';
}): Promise<string> {
  const res = await fetch('/api/ai/polish-content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'AI 润色优化失败。');
  }

  return data.polishedContent as string;
}
