import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.inkread.app',
  appName: 'InkRead',
  webDir: 'dist',
  server: {
    // 生产环境下不使用，开发时可以指定
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true, // 允许混合内容（HTTP + HTTPS）
    webContentsDebuggingEnabled: true // 允许调试
  },
  plugins: {
    CapacitorHttp: {
      enabled: false  // 使用 Cordova HTTP 插件而非 Capacitor HTTP
    }
  }
};

export default config;
