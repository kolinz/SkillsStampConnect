import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const serverHost = env.SERVER_HOST || 'localhost';
  const backendPort = env.PORT || '3000';
  const backendTarget = `http://${serverHost}:${backendPort}`;
  const vitePort = Number(env.VITE_PORT) || 5173;

  return {
    root: path.resolve(__dirname, 'client'),
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './client/src'),
      },
    },
    build: {
      outDir: path.resolve(__dirname, 'client/dist'),
      emptyOutDir: true,
    },
    server: {
      host: 'localhost',
      port: vitePort,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/uploads': {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
