import path from 'path';
import fs from 'node:fs';
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(__dirname, '../..');
const merchantPublicDir = path.resolve(__dirname, 'public');
const buildOutDir = path.resolve(__dirname, 'dist');

/** Copy app-specific static files (e.g. privacy.html) alongside shared public assets. */
function merchantPublicAssetsPlugin(): Plugin {
  return {
    name: 'merchant-public-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || req.method !== 'GET') return next();
        const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        const rel = pathname.replace(/^\//, '');
        if (!rel) return next();
        const filePath = path.join(merchantPublicDir, rel);
        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return next();
        const ext = path.extname(filePath).toLowerCase();
        const types: Record<string, string> = {
          '.html': 'text/html; charset=utf-8',
          '.json': 'application/json; charset=utf-8',
        };
        res.setHeader('Content-Type', types[ext] ?? 'application/octet-stream');
        fs.createReadStream(filePath).pipe(res);
      });
    },
    closeBundle() {
      if (!fs.existsSync(merchantPublicDir)) return;
      for (const name of fs.readdirSync(merchantPublicDir)) {
        const src = path.join(merchantPublicDir, name);
        if (fs.statSync(src).isFile()) {
          fs.copyFileSync(src, path.join(buildOutDir, name));
        }
      }
    },
  };
}

export default defineConfig({
  root: __dirname,
  envDir: __dirname,
  envPrefix: 'VITE_',
  plugins: [react(), tailwindcss(), merchantPublicAssetsPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(monorepoRoot, 'packages/shared/src'),
      'trim-canvas': path.resolve(monorepoRoot, 'packages/shared/src/shims/trim-canvas.ts'),
    },
  },
  define: {
    global: 'window',
    'import.meta.env.VITE_MAHALAK_APP': JSON.stringify('merchant'),
  },
  base: './',
  publicDir: path.resolve(monorepoRoot, 'packages/shared/public'),
  server: {
    port: 5175,
    strictPort: false,
    allowedHosts: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions', 'firebase/storage'],
          motion: ['motion/react', 'framer-motion'],
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web/webgpu'],
  },
});
