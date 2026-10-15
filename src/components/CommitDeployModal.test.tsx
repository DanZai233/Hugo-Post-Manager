import assert from 'node:assert/strict';
import { test } from 'node:test';
import React, { act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { CommitDeployModal } from './CommitDeployModal';
import { DEFAULT_CONFIG, INITIAL_MOCK_POSTS } from '../services/mockData';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

test('commit dialog opens repeatedly, keeps drafts on failure, and reports a successful push', async () => {
  const post = { ...INITIAL_MOCK_POSTS[0], content: 'Edited article', isModified: true };
  const config = { ...DEFAULT_CONFIG, useMock: false, token: 'test-token', owner: 'test', repo: 'blog' };
  const successes: unknown[] = [];
  const props = {
    post, allPosts: [post], config,
    onClose() {},
    onCommitSuccess(saved: unknown) { successes.push(saved); },
  };
  let renderer!: ReactTestRenderer;
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];
  let fail = true;
  globalThis.fetch = (async (_url, options) => {
    requests.push(options?.method || 'GET');
    if (options?.method === 'PUT') {
      return Response.json(fail
        ? { message: 'Permission denied' }
        : { content: { sha: 'saved-sha' }, commit: { html_url: 'https://github.com/test/blog/commit/saved' } },
      { status: fail ? 403 : 200 });
    }
    return Response.json({ sha: post.sha });
  }) as typeof fetch;

  try {
    await act(async () => { renderer = create(<CommitDeployModal {...props} isOpen={false} />); });
    for (const isOpen of [true, false, true]) {
      await act(async () => { renderer.update(<CommitDeployModal {...props} isOpen={isOpen} />); });
      assert.equal(renderer.toJSON() !== null, isOpen);
    }
    const submit = () => renderer.root.findByProps({ id: 'btn-confirm-commit-deploy' }).props.onClick();
    await act(async () => { await submit(); });
    assert.equal(successes.length, 0);
    assert.equal(post.isModified, true);
    assert.match(JSON.stringify(renderer.toJSON()), /Permission denied/);
    fail = false;
    await act(async () => { await submit(); });
    assert.equal(successes.length, 1);
    assert.equal((successes[0] as typeof post).isModified, false);
    assert.ok(requests.includes('PUT'));
    await act(async () => { renderer.update(<CommitDeployModal {...props} post={null} allPosts={[]} isOpen />); });
    assert.equal(renderer.toJSON(), null);
    await act(async () => {
      renderer.update(<CommitDeployModal {...props} config={{ ...config, token: '' }} isOpen />);
    });
    const requestsBeforeMissingToken = requests.length;
    await act(async () => { await submit(); });
    assert.equal(successes.length, 1);
    assert.equal(requests.length, requestsBeforeMissingToken);
    assert.match(JSON.stringify(renderer.toJSON()), /Personal Access Token/);
  } finally {
    globalThis.fetch = originalFetch;
    if (renderer) await act(async () => { renderer.unmount(); });
  }
});
