import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      envDir: '..', // 루트 디렉토리의 .env 파일을 참조하도록 설정
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      },
      build: {
        outDir: '../dist',
        emptyOutDir: true,
        charset: 'utf8',
        rollupOptions: {
          output: {
            manualChunks: undefined
          }
        }
      }
    };
});
