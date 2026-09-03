export interface HugoFrontMatter {
  title: string;
  date: string;
  draft: boolean;
  tags?: string[];
  categories?: string[];
  slug?: string;
  description?: string;
  summary?: string;
  author?: string;
  cover?: {
    image?: string;
    alt?: string;
    caption?: string;
  };
  weight?: number;
  toc?: boolean;
  math?: boolean;
  comments?: boolean;
  customParams?: Record<string, string | number | boolean>;
}

export interface HugoPost {
  id: string; // unique identifier (often path or uuid)
  name: string; // e.g. "my-first-post.md"
  path: string; // e.g. "content/posts/my-first-post.md"
  sha?: string; // GitHub git blob sha
  frontMatter: HugoFrontMatter;
  content: string; // markdown body without front matter
  rawContent: string; // complete text including front matter
  isModified?: boolean;
  isNew?: boolean;
  lastModified?: string;
}

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  postsDir: string;
  staticDir: string;
  isConfigured: boolean;
  useMock: boolean;
}

export interface GitHubCommitInfo {
  sha: string;
  message: string;
  date: string;
  author: string;
  url?: string;
}

export interface GitHubWorkflowRun {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed' | 'waiting' | string;
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'timed_out' | 'action_required' | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  run_number: number;
  event: string;
  head_branch: string;
  head_commit?: {
    id: string;
    message: string;
    timestamp: string;
    author: {
      name: string;
      email: string;
    };
  };
}

export interface TableOfContentsItem {
  id: string;
  text: string;
  level: number;
}
