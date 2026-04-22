import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import type {Plugin} from 'vite';
import {defineConfig, loadEnv} from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function copyRepoDataToDist(): Plugin {
  const dataRoot = path.resolve(__dirname, 'data');

  return {
    name: 'copy-repo-data-to-dist',
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
  const defaultLocalApiTarget = mode === 'desktop' ? 'http://127.0.0.1:3101' : 'http://127.0.0.1:3001';
  const localApiTarget = env.VITE_LOCAL_API_TARGET || defaultLocalApiTarget;

  return {
    publicDir: false,
    plugins: [react(), tailwindcss(), copyRepoDataToDist()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: {
        '/api': localApiTarget,
        '/data': localApiTarget,
      },
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        ignored: ['**/data/**', '**/storage/**'],
      },
    },
    preview: {
      proxy: {
        '/api': localApiTarget,
        '/data': localApiTarget,
      },
    },
  };
});
