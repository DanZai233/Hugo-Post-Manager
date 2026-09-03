/**
 * api/index.ts — Vercel Serverless Function 入口
 *
 * 整个 Express 应用(app.ts)作为单个 Vercel Function 导出。
 * vercel.json 已将 /api/(.*) 全部重写到本函数,因此 app.ts 里
 * /api/health、/api/assistant/*、/api/ai/*、/api/github/* 路由原样生效。
 *
 * bodyParser:false 告诉 Vercel 不要预先解析请求体
 * (Express 的 express.json() 自己会解析)。
 */
import app from '../app';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default app;
