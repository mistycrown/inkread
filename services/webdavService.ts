import { getSettings, createBackup, restoreBackup } from './storageService';
import { AppSettings } from '../types';
import { Capacitor } from '@capacitor/core';
import { HTTP } from '@awesome-cordova-plugins/http';

// Base64 编码工具
const toBase64 = (str: string) => {
  if (typeof window !== 'undefined' && window.btoa) {
    return window.btoa(str);
  }
  return Buffer.from(str).toString('base64');
};

/**
 * WebDAV 客户端类 - 支持 Web 和 Android/iOS 原生平台
 * 参考 LumosTime 的成功实现
 */
export class WebDavClient {
  private url: string;
  private originalUrl: string;
  private username: string;
  private password: string;
  private isNative: boolean;

  constructor(settings: AppSettings) {
    if (!settings.webdav_url || !settings.webdav_user || !settings.webdav_password) {
      throw new Error("缺少 WebDAV 配置");
    }

    this.username = settings.webdav_user;
    this.password = settings.webdav_password;
    this.originalUrl = settings.webdav_url.replace(/\/$/, '');
    this.isNative = Capacitor.isNativePlatform();
    this.url = this.getEffectiveUrl(this.originalUrl);

    console.log('[WebDAV] 客户端初始化:', {
      平台: this.isNative ? 'Native (Android/iOS)' : 'Web',
      URL: this.url
    });
  }

  private getEffectiveUrl(url: string): string {
    if (this.isNative) {
      return url;
    }

    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isDev && url.includes('dav.jianguoyun.com')) {
      return '/webdav-proxy' + new URL(url).pathname.replace(/\/$/, '');
    }

    return url;
  }

  /**
   * 测试连接 - 参考 LumosTime 的实现
   */
  async testConnection(): Promise<boolean> {
    if (this.isNative) {
      try {
        const url = this.url.endsWith('/') ? this.url : this.url + '/';
        const auth = toBase64(`${this.username}:${this.password}`);

        console.log('[WebDAV Native] 测试连接:', url);

        const response = await HTTP.sendRequest(url, {
          method: 'options',
          headers: { 'Authorization': `Basic ${auth}` },
          timeout: 10000
        });

        console.log('[WebDAV Native] 连接测试响应:', response.status);
        return response.status === 200 || response.status === 204;
      } catch (error: any) {
        console.error('[WebDAV Native] 连接测试失败:', JSON.stringify(error));
        return false;
      }
    } else {
      // Web 平台测试
      try {
        const response = await fetch(`${this.url}/`, {
          method: 'PROPFIND',
          headers: {
            'Authorization': `Basic ${toBase64(`${this.username}:${this.password}`)}`,
            'Depth': '0'
          },
          credentials: 'omit'
        });

        return response.ok || response.status === 207;
      } catch (error) {
        console.error('[WebDAV Web] 连接测试失败:', error);
        return false;
      }
    }
  }

  /**
   * 上传数据 - 参考 LumosTime 的成功实现
   */
  async putFile(filename: string, content: string): Promise<void> {
    const url = this.url.endsWith('/') ? `${this.url}/${filename}` : `${this.url}/${filename}`;

    if (this.isNative) {
      try {
        console.log('[WebDAV Native] 开始上传:', url);
        const auth = toBase64(`${this.username}:${this.password}`);

        // 关键：使用 JSON 序列化器
        await HTTP.setDataSerializer('json');

        // 关键：数据必须是对象，不能是字符串
        const data = JSON.parse(content);

        const response = await HTTP.sendRequest(url, {
          method: 'put',
          data: data,  // 传递解析后的对象
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json; charset=utf-8'  // 包含 charset
          },
          timeout: 30000
        });

        console.log('[WebDAV Native] 上传响应:', response.status);

        if (response.status < 200 || response.status >= 300) {
          throw new Error(`上传失败: HTTP ${response.status}`);
        }
      } catch (error: any) {
        console.error('[WebDAV Native] 上传失败:', JSON.stringify(error));
        throw new Error(error.error || error.message || '上传失败');
      }
    } else {
      // Web 平台上传
      try {
        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            'Authorization': `Basic ${toBase64(`${this.username}:${this.password}`)}`,
            'Content-Type': 'application/json'
          },
          body: content,
          credentials: 'omit'
        });

        if (!response.ok) {
          throw new Error(`上传失败: HTTP ${response.status}`);
        }
      } catch (error: any) {
        console.error('[WebDAV Web] 上传失败:', error);
        throw error;
      }
    }
  }

  /**
   * 下载数据 - 参考 LumosTime 的成功实现
   */
  async getFile(filename: string): Promise<string | null> {
    const url = this.url.endsWith('/') ? `${this.url}/${filename}` : `${this.url}/${filename}`;

    if (this.isNative) {
      try {
        console.log('[WebDAV Native] 开始下载:', url);
        const auth = toBase64(`${this.username}:${this.password}`);

        const response = await HTTP.sendRequest(url, {
          method: 'get',
          headers: { 'Authorization': `Basic ${auth}` },
          timeout: 30000
        });

        console.log('[WebDAV Native] 下载响应:', response.status);

        if (response.status === 404) {
          return null;
        }

        if (response.status < 200 || response.status >= 300) {
          throw new Error(`下载失败: HTTP ${response.status}`);
        }

        // 返回字符串内容
        const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        return content;
      } catch (error: any) {
        if (error.status === 404) {
          return null;
        }
        console.error('[WebDAV Native] 下载失败:', JSON.stringify(error));
        throw new Error(error.error || error.message || '下载失败');
      }
    } else {
      // Web 平台下载
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${toBase64(`${this.username}:${this.password}`)}`
          },
          credentials: 'omit'
        });

        if (response.status === 404) {
          return null;
        }

        if (!response.ok) {
          throw new Error(`下载失败: HTTP ${response.status}`);
        }

        return await response.text();
      } catch (error: any) {
        console.error('[WebDAV Web] 下载失败:', error);
        throw error;
      }
    }
  }
}

/**
 * 测试 WebDAV 连接
 */
export const testWebDavConnection = async (settings: AppSettings): Promise<string> => {
  try {
    const client = new WebDavClient(settings);
    const success = await client.testConnection();
    return success ? "连接成功！" : "连接失败";
  } catch (error: any) {
    return `连接失败: ${error.message}`;
  }
};

/**
 * 上传数据到云端
 */
export const uploadData = async (): Promise<string> => {
  const settings = getSettings();
  if (!settings.webdav_url) return "未配置 WebDAV";

  try {
    const client = new WebDavClient(settings);
    const localBackup = createBackup();
    await client.putFile('inkread_data.json', localBackup);
    return "上传成功";
  } catch (error: any) {
    return `上传失败: ${error.message}`;
  }
};

/**
 * 从云端下载数据
 */
export const downloadData = async (): Promise<string> => {
  const settings = getSettings();
  if (!settings.webdav_url) return "未配置 WebDAV";

  try {
    const client = new WebDavClient(settings);
    const cloudBackupStr = await client.getFile('inkread_data.json');

    if (!cloudBackupStr) {
      return "云端无数据";
    }

    await restoreBackup(cloudBackupStr);
    return "下载成功";
  } catch (error: any) {
    return `下载失败: ${error.message}`;
  }
};

/**
 * 智能同步数据
 */
export const syncData = async (): Promise<string> => {
  const settings = getSettings();
  if (!settings.webdav_url) return "未配置 WebDAV";

  try {
    const client = new WebDavClient(settings);
    const localBackup = createBackup();
    const localData = JSON.parse(localBackup);
    const localTimestamp = localData.timestamp;

    const cloudBackupStr = await client.getFile('inkread_data.json');

    if (!cloudBackupStr) {
      await client.putFile('inkread_data.json', localBackup);
      return "首次上传完成";
    }

    const cloudData = JSON.parse(cloudBackupStr);
    const cloudTimestamp = cloudData.timestamp || 0;

    if (localTimestamp > cloudTimestamp) {
      await client.putFile('inkread_data.json', localBackup);
      return "上传完成";
    } else if (localTimestamp < cloudTimestamp) {
      await restoreBackup(cloudBackupStr);
      return "下载完成";
    } else {
      return "已是最新";
    }
  } catch (error: any) {
    return `同步失败: ${error.message}`;
  }
};