/**
 * api/index.cjs — Vercel Serverless Function 入口(CJS)
 *
 * 思路:构建期由 build:vercel 用 esbuild 把 app.ts(含 express + unillm-sdk)
 * 预打包为根目录 vercel-app.cjs(自包含单文件、无外部依赖),这里直接 require,
 * 规避 Vercel 对 ESM/TS 入口现场编译带来的兼容问题。
 *
 * bodyParser:false 告诉 Vercel 不要预先解析请求体
 * (Express 的 express.json() 自己会解析)。
 */
const bundled = require('../vercel-app.cjs');
const app = bundled && bundled.default ? bundled.default : bundled;

module.exports = app;
module.exports.config = {
  api: {
    bodyParser: false,
  },
};
