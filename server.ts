/**
 * server.ts — 本地启动器(仅本地开发/自托管使用)
 *
 * Vercel 部署时不需要本文件:Express 应用本体在 app.ts,由 api/index.ts
 * 导出为 Serverless Function;前端产物由 Vercel CDN 托管。
 *
 * 运行方式:
 *   bun run dev        → tsx 直接执行本文件 + Vite 中间件
 *   bun run build && bun run start → node dist/server.cjs(静态托管 dist/)
 */
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import app from './app';

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // 开发模式:Vite 中间件提供前端资源与 HMR
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // 生产模式:托管 dist/ 静态产物,SPA 回退到 index.html
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
