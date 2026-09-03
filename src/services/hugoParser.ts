import * as yaml from 'js-yaml';
import { HugoFrontMatter, TableOfContentsItem } from '../types';

export function parseHugoContent(rawText: string): { frontMatter: HugoFrontMatter; content: string } {
  const trimmed = rawText.trimStart();

  // YAML Front Matter: starts with ---
  if (trimmed.startsWith('---')) {
    const secondDelimiterIndex = trimmed.indexOf('\n---', 3);
    if (secondDelimiterIndex !== -1) {
      const yamlContent = trimmed.substring(3, secondDelimiterIndex).trim();
      // Body content starts after \n--- and possible newline
      const afterDelimiter = secondDelimiterIndex + 4;
      const content = trimmed.substring(afterDelimiter).replace(/^\r?\n/, '');

      try {
        const parsed = (yaml.load(yamlContent) as Record<string, any>) || {};
        const frontMatter: HugoFrontMatter = {
          title: parsed.title || 'Untitled Post',
          date: parsed.date ? String(parsed.date) : new Date().toISOString(),
          draft: typeof parsed.draft === 'boolean' ? parsed.draft : false,
          tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
          categories: Array.isArray(parsed.categories) ? parsed.categories.map(String) : [],
          slug: parsed.slug ? String(parsed.slug) : undefined,
          description: parsed.description ? String(parsed.description) : undefined,
          summary: parsed.summary ? String(parsed.summary) : undefined,
          author: parsed.author ? String(parsed.author) : undefined,
          weight: typeof parsed.weight === 'number' ? parsed.weight : undefined,
          toc: typeof parsed.toc === 'boolean' ? parsed.toc : true,
          math: typeof parsed.math === 'boolean' ? parsed.math : undefined,
          comments: typeof parsed.comments === 'boolean' ? parsed.comments : undefined,
          cover: parsed.cover && typeof parsed.cover === 'object' ? {
            image: parsed.cover.image || '',
            alt: parsed.cover.alt || '',
            caption: parsed.cover.caption || '',
          } : undefined,
          customParams: {},
        };

        // Collect custom unknown params
        const standardKeys = new Set(['title', 'date', 'draft', 'tags', 'categories', 'slug', 'description', 'summary', 'author', 'weight', 'toc', 'math', 'comments', 'cover']);
        for (const [key, value] of Object.entries(parsed)) {
          if (!standardKeys.has(key) && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')) {
            frontMatter.customParams![key] = value;
          }
        }

        return { frontMatter, content };
      } catch (err) {
        console.warn('Failed to parse YAML front matter:', err);
      }
    }
  }

  // Fallback if no valid front matter
  const defaultFrontMatter: HugoFrontMatter = {
    title: 'Untitled Post',
    date: new Date().toISOString(),
    draft: true,
    tags: [],
    categories: [],
    toc: true,
  };

  return { frontMatter: defaultFrontMatter, content: rawText };
}

export function serializeHugoContent(frontMatter: HugoFrontMatter, content: string): string {
  const cleanData: Record<string, any> = {
    title: frontMatter.title,
    date: frontMatter.date,
    draft: frontMatter.draft,
  };

  if (frontMatter.slug) cleanData.slug = frontMatter.slug;
  if (frontMatter.description) cleanData.description = frontMatter.description;
  if (frontMatter.summary) cleanData.summary = frontMatter.summary;
  if (frontMatter.author) cleanData.author = frontMatter.author;
  if (frontMatter.tags && frontMatter.tags.length > 0) cleanData.tags = frontMatter.tags;
  if (frontMatter.categories && frontMatter.categories.length > 0) cleanData.categories = frontMatter.categories;
  if (frontMatter.cover && (frontMatter.cover.image || frontMatter.cover.alt)) cleanData.cover = frontMatter.cover;
  if (typeof frontMatter.weight === 'number') cleanData.weight = frontMatter.weight;
  if (typeof frontMatter.toc === 'boolean') cleanData.toc = frontMatter.toc;
  if (typeof frontMatter.math === 'boolean') cleanData.math = frontMatter.math;
  if (typeof frontMatter.comments === 'boolean') cleanData.comments = frontMatter.comments;

  if (frontMatter.customParams) {
    for (const [k, v] of Object.entries(frontMatter.customParams)) {
      if (k.trim()) {
        cleanData[k.trim()] = v;
      }
    }
  }

  const yamlStr = yaml.dump(cleanData, { indent: 2, lineWidth: -1 }).trim();
  return `---\n${yamlStr}\n---\n\n${content}`;
}

export function generateHugoDate(date: Date = new Date()): string {
  // Generates ISO string with local timezone offset, e.g. 2026-09-02T20:13:00+08:00
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  const offsetMinutes = -date.getTimezoneOffset();
  const offsetSign = offsetMinutes >= 0 ? '+' : '-';
  const offsetHours = pad(Math.floor(Math.abs(offsetMinutes) / 60));
  const offsetMins = pad(Math.abs(offsetMinutes) % 60);

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${offsetHours}:${offsetMins}`;
}

export function extractTableOfContents(markdown: string): TableOfContentsItem[] {
  const headingRegex = /^(#{2,4})\s+(.+)$/gm;
  const items: TableOfContentsItem[] = [];
  let match;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2].trim().replace(/[*_~`]/g, '');
    const id = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, '');
    items.push({ id: id || `heading-${items.length}`, text, level });
  }

  return items;
}

export function calculateReadingStats(content: string): { wordCount: number; readingTimeMin: number } {
  // Count both English words and CJK characters
  const cjkChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
  const nonCjkWords = content.replace(/[\u4e00-\u9fa5]/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  const totalWords = cjkChars + nonCjkWords;
  const readingTimeMin = Math.max(1, Math.ceil(cjkChars / 350 + nonCjkWords / 200));

  return { wordCount: totalWords, readingTimeMin };
}

export function processHugoShortcodesForPreview(markdown: string): string {
  let processed = markdown;

  // Replace <!--more--> with a visible break banner
  processed = processed.replace(/<!--\s*more\s*-->/gi, '\n\n<div class="hugo-more-tag my-6 py-2 border-y border-dashed border-amber-300 dark:border-amber-700/60 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 text-xs font-mono uppercase tracking-wider text-center flex items-center justify-center gap-2"><span>✂</span> <span>Hugo Summary Break (more)</span></div>\n\n');

  // Replace {{< figure src="..." title="..." alt="..." >}}
  processed = processed.replace(/\{\{<\s*figure\s+([^>]+)\s*>\}\}/g, (_, attrs) => {
    const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
    const titleMatch = attrs.match(/title=["']([^"']+)["']/i);
    const altMatch = attrs.match(/alt=["']([^"']+)["']/i);
    const captionMatch = attrs.match(/caption=["']([^"']+)["']/i);

    const src = srcMatch ? srcMatch[1] : '';
    const title = titleMatch ? titleMatch[1] : (captionMatch ? captionMatch[1] : '');
    const alt = altMatch ? altMatch[1] : title;

    return `\n\n<figure class="my-6 text-center">
  <img src="${src}" alt="${alt}" class="rounded-lg shadow-sm mx-auto max-h-96 object-contain" />
  ${title ? `<figcaption class="mt-2 text-xs text-stone-500 italic">${title}</figcaption>` : ''}
</figure>\n\n`;
  });

  // Replace {{< alert "info|warning|success|error" >}}content{{< /alert >}}
  processed = processed.replace(/\{\{<\s*alert(?:\s+["']?([a-zA-Z0-9_-]+)["']?)?\s*>\}\}([\s\S]*?)\{\{<\s*\/alert\s*>\}\}/g, (_, type = 'info', inner) => {
    const colors: Record<string, string> = {
      info: 'bg-sky-50 border-sky-300 text-sky-900 dark:bg-sky-950/30 dark:border-sky-800 dark:text-sky-200',
      warning: 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200',
      success: 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200',
      error: 'bg-rose-50 border-rose-300 text-rose-900 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-200',
    };
    const style = colors[type.toLowerCase()] || colors.info;

    return `\n\n<div class="my-5 p-4 rounded-lg border-l-4 ${style} text-sm">
  <strong>[Hugo Alert: ${type.toUpperCase()}]</strong>
  <div class="mt-1">${inner.trim()}</div>
</div>\n\n`;
  });

  // Replace {{< youtube id >}}
  processed = processed.replace(/\{\{<\s*youtube\s+["']?([a-zA-Z0-9_-]+)["']?\s*>\}\}/g, (_, id) => {
    return `\n\n<div class="aspect-video w-full my-6 rounded-lg overflow-hidden border border-stone-200 bg-stone-900 text-stone-300 flex items-center justify-center text-sm">
  <span>▶ YouTube Video Embed: <code>${id}</code></span>
</div>\n\n`;
  });

  return processed;
}
