import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        '/webdav-proxy': {
          target: 'https://dav.jianguoyun.com',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/webdav-proxy/, ''),
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // 确保转发所有头部，包括 Authorization
              console.log('代理请求:', {
                '原始路径': req.url,
                '代理路径': proxyReq.path,
                '原始Authorization': req.headers.authorization,
                '所有原始头': Object.keys(req.headers)
              });

              if (req.headers.authorization) {
                proxyReq.setHeader('Authorization', req.headers.authorization);
                console.log('已设置 Authorization 头到代理请求');
              } else {
                console.warn('⚠️ 警告：原始请求中没有 Authorization 头！');
              }
            });
          }
        }
      }
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
