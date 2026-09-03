import { GitHubConfig, HugoPost } from '../types';
import { DEFAULT_CONFIG, INITIAL_MOCK_POSTS } from './mockData';

const STORAGE_KEYS = {
  CONFIG: 'hugo_publisher_github_config_v1',
  POSTS_CACHE: 'hugo_publisher_posts_cache_v1',
  ACTIVE_POST_ID: 'hugo_publisher_active_post_id_v1',
};

export function loadGitHubConfig(): GitHubConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
    };
  } catch (e) {
    return DEFAULT_CONFIG;
  }
}

export function saveGitHubConfig(config: GitHubConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to save GitHub config to localStorage', e);
  }
}

export function loadCachedPosts(): HugoPost[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.POSTS_CACHE);
    if (!raw) return INITIAL_MOCK_POSTS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_MOCK_POSTS;
  } catch (e) {
    return INITIAL_MOCK_POSTS;
  }
}

export function saveCachedPosts(posts: HugoPost[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.POSTS_CACHE, JSON.stringify(posts));
  } catch (e) {
    console.warn('Failed to save posts to localStorage', e);
  }
}

export function loadActivePostId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_POST_ID);
  } catch {
    return null;
  }
}

export function saveActivePostId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_POST_ID, id);
  } catch {
    // ignore
  }
}
