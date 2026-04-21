import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import type {Plugin} from 'vite';
import {defineConfig, loadEnv} from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** 仓库根目录下的 `data/`，在开发与生产预览中均以 `/data/*` URL 提供；构建时复制到 `dist/data/`。 */
function repoDataAsPublicData(): Plugin {
  const dataRoot = path.resolve(__dirname, 'data');
  return {
    name: 'repo-data-as-slash-data',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const urlPath = req.url?.split('?')[0];
        if (!urlPath?.startsWith('/data/')) return next();
        const rel = decodeURIComponent(urlPath.slice('/data/'.length));
        const file = path.resolve(dataRoot, rel);
        const relToRoot = path.relative(dataRoot, file);
        if (relToRoot.startsWith('..') || path.isAbsolute(relToRoot)) return next();
        if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return next();
        const ext = path.extname(file).toLowerCase();
        const types: Record<string, string> = {
          '.json': 'application/json; charset=utf-8',
          '.txt': 'text/plain; charset=utf-8',
          '.md': 'text/markdown; charset=utf-8',
        };
        res.setHeader('Content-Type', types[ext] ?? 'application/octet-stream');
        fs.createReadStream(file).pipe(res);
      });
    },
    closeBundle() {
      if (!fs.existsSync(dataRoot)) return;
      const out = path.resolve(__dirname, 'dist/data');
      fs.mkdirSync(path.dirname(out), {recursive: true});
      fs.cpSync(dataRoot, out, {recursive: true});
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    // 无 `public/` 目录；静态数据由 `data/` + `repoDataAsPublicData` 插件提供。
    publicDir: false,
    plugins: [react(), tailwindcss(), repoDataAsPublicData()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
