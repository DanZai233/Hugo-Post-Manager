import { GitHubConfig, GitHubWorkflowRun, HugoPost } from '../types';
import { parseHugoContent, serializeHugoContent } from './hugoParser';

// UTF-8 safe Base64 encoder and decoder
export function utf8ToBase64(str: string): string {
  try {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      )
    );
  } catch (e) {
    console.error('Error encoding utf8 to base64', e);
    return btoa(str);
  }
}

export function base64ToUtf8(str: string): string {
  try {
    // Remove newlines and whitespace that GitHub API might inject
    const cleanStr = str.replace(/\s/g, '');
    return decodeURIComponent(
      Array.prototype.map
        .call(atob(cleanStr), (c: string) => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
  } catch (e) {
    console.error('Error decoding base64 to utf8', e);
    return atob(str);
  }
}

const getHeaders = (token: string) => {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token && token.trim()) {
    headers['Authorization'] = `token ${token.trim()}`;
  }
  return headers;
};

export async function testGitHubConnection(config: GitHubConfig): Promise<{
  success: boolean;
  repoName?: string;
  defaultBranch?: string;
  postsCount?: number;
  error?: string;
}> {
  if (!config.owner || !config.repo) {
    return { success: false, error: 'Owner and Repository name are required.' };
  }

  try {
    const repoRes = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}`,
      { headers: getHeaders(config.token) }
    );

    if (!repoRes.ok) {
      if (repoRes.status === 404) {
        return { success: false, error: 'Repository not found. Check owner, repo name, or personal access token permissions.' };
      }
      if (repoRes.status === 401) {
        return { success: false, error: 'Bad credentials. Check your GitHub Personal Access Token.' };
      }
      const errJson = await repoRes.json().catch(() => ({}));
      return { success: false, error: errJson.message || `GitHub error: HTTP ${repoRes.status}` };
    }

    const repoData = await repoRes.json();
    const branch = config.branch || repoData.default_branch || 'main';

    // Verify content directory (Support Page Bundles and recursive markdown files)
    const cleanPath = config.postsDir.replace(/^\/+|\/+$/g, '');
    let postsCount = 0;

    try {
      const treeRes = await fetch(
        `https://api.github.com/repos/${config.owner}/${config.repo}/git/trees/${branch}?recursive=1`,
        { headers: getHeaders(config.token) }
      );
      if (treeRes.ok) {
        const treeData = await treeRes.json();
        if (Array.isArray(treeData.tree)) {
          const files = treeData.tree.filter((item: any) =>
            item.type === 'blob' &&
            item.path.startsWith(`${cleanPath}/`) &&
            (item.path.endsWith('.md') || item.path.endsWith('.markdown'))
          );
          postsCount = files.length;
        }
      }
    } catch {
      // Fallback below
    }

    if (postsCount === 0) {
      const contentsRes = await fetch(
        `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${cleanPath}?ref=${branch}`,
        { headers: getHeaders(config.token) }
      );

      if (contentsRes.ok) {
        const items = await contentsRes.json();
        if (Array.isArray(items)) {
          postsCount = items.filter((f: any) => f.name.endsWith('.md') || f.name.endsWith('.markdown') || f.type === 'dir').length;
        }
      }
    }

    return {
      success: true,
      repoName: repoData.full_name,
      defaultBranch: repoData.default_branch,
      postsCount,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network connection failed.' };
  }
}

export async function fetchGitHubPosts(config: GitHubConfig): Promise<HugoPost[]> {
  const cleanPath = config.postsDir.replace(/^\/+|\/+$/g, '');
  const branch = config.branch || 'main';

  interface TreeItem {
    path: string;
    sha: string;
    name: string;
  }

  let markdownItems: TreeItem[] = [];

  // 1. Git Trees API (recursive=1) - single request to list all posts, including Page Bundles
  try {
    const treeRes = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/git/trees/${branch}?recursive=1`,
      { headers: getHeaders(config.token) }
    );
    if (treeRes.ok) {
      const treeData = await treeRes.json();
      if (Array.isArray(treeData.tree)) {
        markdownItems = treeData.tree
          .filter((item: any) =>
            item.type === 'blob' &&
            item.path.startsWith(`${cleanPath}/`) &&
            (item.path.endsWith('.md') || item.path.endsWith('.markdown'))
          )
          .map((item: any) => {
            const segments = item.path.split('/');
            const name = segments[segments.length - 1];
            return {
              path: item.path,
              sha: item.sha,
              name,
            };
          });
      }
    }
  } catch (err) {
    console.warn('Git trees API recursive query failed, falling back to contents API:', err);
  }

  // 2. Fallback to Contents API if Trees API returned nothing or was blocked
  if (markdownItems.length === 0) {
    const res = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${cleanPath}?ref=${branch}`,
      { headers: getHeaders(config.token) }
    );

    if (res.ok) {
      const items = await res.json();
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item.type === 'file' && (item.name.endsWith('.md') || item.name.endsWith('.markdown'))) {
            markdownItems.push({ path: item.path, sha: item.sha, name: item.name });
          } else if (item.type === 'dir') {
            // Subfolder inspection for Page Bundles
            try {
              const subRes = await fetch(
                `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${item.path}?ref=${branch}`,
                { headers: getHeaders(config.token) }
              );
              if (subRes.ok) {
                const subItems = await subRes.json();
                if (Array.isArray(subItems)) {
                  const subMds = subItems.filter((f: any) => f.type === 'file' && (f.name.endsWith('.md') || f.name.endsWith('.markdown')));
                  for (const f of subMds) {
                    markdownItems.push({ path: f.path, sha: f.sha, name: f.name });
                  }
                }
              }
            } catch {
              // skip
            }
          }
        }
      }
    }
  }

  if (markdownItems.length === 0) {
    return [];
  }

  // 3. Fast content fetcher
  const fetchContent = async (item: TreeItem): Promise<string> => {
    // Try raw.githubusercontent.com first (zero API quota usage on public repos)
    const rawUrl = `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${branch}/${item.path}`;
    try {
      const rawRes = await fetch(rawUrl, {
        headers: config.token ? { Authorization: `token ${config.token}` } : undefined,
      });
      if (rawRes.ok) {
        return await rawRes.text();
      }
    } catch {
      // ignore
    }

    // Fallback: GitHub Contents API
    const apiUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${item.path}?ref=${branch}`;
    const apiRes = await fetch(apiUrl, { headers: getHeaders(config.token) });
    if (apiRes.ok) {
      const apiData = await apiRes.json();
      if (apiData.content) {
        return base64ToUtf8(apiData.content);
      }
    }
    return '';
  };

  // Fetch in concurrent batches of 10
  const batchSize = 10;
  const posts: HugoPost[] = [];

  for (let i = 0; i < markdownItems.length; i += batchSize) {
    const batch = markdownItems.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (file) => {
        try {
          const rawText = await fetchContent(file);
          if (!rawText) return null;

          const { frontMatter, content } = parseHugoContent(rawText);

          // If title is missing, infer from folder slug or file name
          if (!frontMatter.title) {
            const segments = file.path.split('/');
            const parentDir = segments.length > 1 ? segments[segments.length - 2] : '';
            frontMatter.title = file.name === 'index.md' && parentDir ? parentDir : file.name.replace(/\.(md|markdown)$/i, '');
          }

          const post: HugoPost = {
            id: file.path,
            name: file.name,
            path: file.path,
            sha: file.sha,
            frontMatter,
            content,
            rawContent: rawText,
            isModified: false,
            lastModified: frontMatter.date || new Date().toISOString(),
          };
          return post;
        } catch (e) {
          console.warn(`Error loading post ${file.path}:`, e);
          return null;
        }
      })
    );

    for (const p of batchResults) {
      if (p) posts.push(p);
    }
  }

  return posts.sort((a, b) => {
    const dateA = new Date(a.frontMatter.date || 0).getTime();
    const dateB = new Date(b.frontMatter.date || 0).getTime();
    return dateB - dateA;
  });
}

/**
 * Re-fetch a single post directly from GitHub remote to get the latest line-by-line content
 */
export async function fetchSinglePostContent(config: GitHubConfig, postPath: string): Promise<string> {
  const branch = config.branch || 'main';
  // Try raw first with timestamp cache buster
  const rawUrl = `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${branch}/${postPath}?_t=${Date.now()}`;
  try {
    const rawRes = await fetch(rawUrl, {
      headers: config.token ? { Authorization: `token ${config.token}` } : undefined,
    });
    if (rawRes.ok) {
      return await rawRes.text();
    }
  } catch {
    // ignore and fallback
  }

  // Fallback: GitHub Contents API
  const apiUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${postPath}?ref=${branch}`;
  const apiRes = await fetch(apiUrl, { headers: getHeaders(config.token) });
  if (apiRes.ok) {
    const apiData = await apiRes.json();
    if (apiData.content) {
      return base64ToUtf8(apiData.content);
    }
  }

  throw new Error(`无法从远程仓库获取最新内容: ${postPath}`);
}

export async function savePostToGitHub(
  config: GitHubConfig,
  post: HugoPost,
  commitMessage?: string
): Promise<{ sha: string; commitUrl?: string }> {
  if (!config.token || !config.token.trim()) {
    throw new Error('向 GitHub 提交文章需要填写具有 repo 权限的 Personal Access Token，请在右上角“仓库配置”中填入 Token。');
  }

  const rawContent = serializeHugoContent(post.frontMatter, post.content);
  const contentBase64 = utf8ToBase64(rawContent);

  const defaultMsg = post.isNew
    ? `content(posts): add "${post.frontMatter.title || post.name}"`
    : `content(posts): update "${post.frontMatter.title || post.name}"`;

  const body: Record<string, any> = {
    message: commitMessage || defaultMsg,
    content: contentBase64,
    branch: config.branch || 'main',
  };

  if (post.sha) {
    body.sha = post.sha;
  }

  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${post.path}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      ...getHeaders(config.token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to commit to GitHub (Status: ${res.status})`);
  }

  const data = await res.json();
  return {
    sha: data.content?.sha,
    commitUrl: data.commit?.html_url,
  };
}

export async function deletePostFromGitHub(
  config: GitHubConfig,
  post: HugoPost,
  commitMessage?: string
): Promise<boolean> {
  if (!post.sha) {
    throw new Error('Cannot delete file without GitHub SHA.');
  }

  const body = {
    message: commitMessage || `content(posts): delete "${post.frontMatter.title || post.name}"`,
    sha: post.sha,
    branch: config.branch || 'main',
  };

  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${post.path}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      ...getHeaders(config.token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to delete file on GitHub (Status: ${res.status})`);
  }

  return true;
}

export async function fetchGitHubWorkflowRuns(config: GitHubConfig): Promise<GitHubWorkflowRun[]> {
  if (!config.owner || !config.repo) return [];

  try {
    const res = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/actions/runs?per_page=10`,
      { headers: getHeaders(config.token) }
    );

    if (!res.ok) return [];

    const data = await res.json();
    return (data.workflow_runs || []) as GitHubWorkflowRun[];
  } catch (err) {
    console.warn('Failed to fetch GitHub Action runs:', err);
    return [];
  }
}

export async function triggerWorkflowDispatch(
  config: GitHubConfig,
  workflowIdOrFile: string | number
): Promise<boolean> {
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/actions/workflows/${workflowIdOrFile}/dispatches`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...getHeaders(config.token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ref: config.branch || 'main',
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Workflow dispatch failed (Status: ${res.status})`);
  }

  return true;
}

export async function uploadStaticAsset(
  config: GitHubConfig,
  filePath: string,
  base64Data: string,
  commitMessage?: string
): Promise<{ downloadUrl: string; sha: string }> {
  const body = {
    message: commitMessage || `asset: upload ${filePath}`,
    content: base64Data,
    branch: config.branch || 'main',
  };

  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${filePath}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      ...getHeaders(config.token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Asset upload failed (Status: ${res.status})`);
  }

  const data = await res.json();
  return {
    downloadUrl: data.content?.download_url || '',
    sha: data.content?.sha || '',
  };
}

/* ================================================================== */
/* 博客仓库初始化向导(创建仓库 + 写入 Hugo 脚手架)                        */
/* ================================================================== */

/** 获取 Token 对应的 GitHub 账号(用于计算默认仓库名与站点域名) */
export async function getAuthenticatedUser(token: string): Promise<{ login: string; name: string }> {
  const res = await fetch('https://api.github.com/user', { headers: getHeaders(token) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `获取账号信息失败 (HTTP ${res.status})`);
  }
  const data = await res.json();
  return { login: data.login, name: data.name || data.login };
}

export interface CreateRepoOptions {
  token: string;
  name: string;
  description?: string;
  isPrivate?: boolean;
}

export interface CreatedRepoInfo {
  fullName: string;
  owner: string;
  repo: string;
  defaultBranch: string;
  htmlUrl: string;
}

/** 在用户账号下创建仓库(带 repo 权限的 Token 即可) */
export async function createGitHubRepository(opts: CreateRepoOptions): Promise<CreatedRepoInfo> {
  const token = opts.token.trim();
  if (!token) {
    throw new Error('请先在「仓库配置」中填写带 repo 权限的 GitHub Token。');
  }
  const res = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: opts.name.trim(),
      description: opts.description?.trim() || '',
      private: Boolean(opts.isPrivate),
      auto_init: false,
      has_issues: true,
      has_wiki: false,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    let msg = err.message || `创建仓库失败 (HTTP ${res.status})`;
    if (res.status === 422 && /already exists/i.test(String(err.message))) {
      msg = `仓库 ${opts.name} 已存在,请换一个名字。`;
    } else if (res.status === 401) {
      msg = 'Token 无效或已过期,请重新生成并配置。';
    }
    throw new Error(msg);
  }

  const data = await res.json();
  return {
    fullName: data.full_name,
    owner: data.owner?.login,
    repo: data.name,
    defaultBranch: data.default_branch || 'main',
    htmlUrl: data.html_url,
  };
}

/**
 * 通过 Git Data API 以单个 commit 把脚手架文件写入新仓库(空仓库无 parent)。
 */
export async function commitFilesToRepository(
  config: GitHubConfig,
  files: { path: string; content: string }[],
  commitMessage?: string
): Promise<void> {
  if (!config.token || !config.owner || !config.repo) {
    throw new Error('缺少 Token / Owner / Repo 配置。');
  }
  const branch = config.branch || 'main';
  const headers = {
    ...getHeaders(config.token),
    'Content-Type': 'application/json',
  };
  const base = `https://api.github.com/repos/${config.owner}/${config.repo}`;

  // 1. 为每个文件创建 blob
  const blobs: { path: string; sha: string }[] = [];
  for (const file of files) {
    const blobRes = await fetch(`${base}/git/blobs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        content: utf8ToBase64(file.content),
        encoding: 'base64',
      }),
    });
    if (!blobRes.ok) {
      const err = await blobRes.json().catch(() => ({}));
      throw new Error(`创建文件 ${file.path} 失败: ${err.message || blobRes.status}`);
    }
    const blobData = await blobRes.json();
    blobs.push({ path: file.path, sha: blobData.sha });
  }

  // 2. 创建目录树
  const treeRes = await fetch(`${base}/git/trees`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      tree: blobs.map((b) => ({
        path: b.path,
        mode: '100644',
        type: 'blob',
        sha: b.sha,
      })),
    }),
  });
  if (!treeRes.ok) {
    const err = await treeRes.json().catch(() => ({}));
    throw new Error(`创建目录树失败: ${err.message || treeRes.status}`);
  }
  const treeData = await treeRes.json();

  // 3. 创建 commit(空仓库没有父提交)
  const commitRes = await fetch(`${base}/git/commits`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: commitMessage || 'chore: initialize Hugo blog scaffold',
      tree: treeData.sha,
      parents: [],
    }),
  });
  if (!commitRes.ok) {
    const err = await commitRes.json().catch(() => ({}));
    throw new Error(`创建提交失败: ${err.message || commitRes.status}`);
  }
  const commitData = await commitRes.json();

  // 4. 更新分支引用(触发 push 事件,自动启动 Actions 部署)
  const refRes = await fetch(`${base}/git/refs/heads/${branch}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sha: commitData.sha }),
  });
  if (!refRes.ok) {
    const err = await refRes.json().catch(() => ({}));
    const msg = refRes.status === 422 ? '仓库不是空的:本向导只支持在全新空仓库上初始化,请换一个新仓库名。' : `更新分支失败: ${err.message || refRes.status}`;
    throw new Error(msg);
  }
}
