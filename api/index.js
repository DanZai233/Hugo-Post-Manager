/**
 * api/index.js — Vercel Serverless Function 入口
 *
 * 构建期(build:vercel)已用 esbuild 把 app.ts(express + unillm-sdk)
 * 打包为根目录自包含单文件 vercel-app.cjs(仅依赖 Node 内置模块),
 * 这里只做一次显式扩展名的 require/import,不再让 Vercel 现场编译
 * TS/ESM 与解析无扩展名的相对导入。
 *
 * bodyParser:false 告诉 Vercel 不要预先解析请求体
 * (Express 的 express.json() 自己会解析)。
 */
import bundled from '../vercel-app.cjs';

export const config = {
  api: {
    bodyParser: false,
  },
};

const app = bundled && bundled.default ? bundled.default : bundled;

export default app;
