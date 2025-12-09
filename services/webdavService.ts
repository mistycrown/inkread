import { getSettings, getIndex, saveIndex, rawReadFile, rawWriteFile, getAllArticleFiles, createBackup, restoreBackup } from './storageService';
import { IndexFile, AppSettings } from '../types';

// Simple Buffer for Basic Auth encoding in browser
const toBase64 = (str: string) => window.btoa(str);

export class WebDavClient {
  private url: string;
  private headers: HeadersInit;

  constructor(settings: AppSettings) {
    if (!settings.webdav_url || !settings.webdav_user || !settings.webdav_password) {
      throw new Error("Missing WebDAV configuration");
    }

    // 在开发环境使用代理避免 CORS 问题
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (isDev) {
      // 使用本地代理路径
      this.url = '/webdav-proxy' + new URL(settings.webdav_url).pathname.replace(/\/$/, '');
    } else {
      // 生产环境直接使用配置的 URL
      this.url = settings.webdav_url.replace(/\/$/, '');
    }

    this.headers = {
      'Authorization': `Basic ${toBase64(`${settings.webdav_user}:${settings.webdav_password}`)}`,
    };

    // 调试信息
    console.log('WebDAV Client 初始化:', {
      '原始URL': settings.webdav_url,
      '实际URL': this.url,
      '用户名': settings.webdav_user,
      '是否开发环境': isDev,
      'Authorization头': this.headers.Authorization
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      // Try to list the directory or get index.json
      // Using PROPFIND method usually checks directory access, but GET on root or index is safer for simple check
      const response = await fetch(`${this.url}/`, {
        method: 'PROPFIND',
        headers: {
          ...this.headers,
          'Depth': '0'
        },
        credentials: 'omit'
      });

      // Some servers might return 405 Method Not Allowed for PROPFIND on files, 
      // or 207 Multi-Status. 200 OK is also fine.
      // 401 means Unauthorized (failed auth).
      if (response.status === 401) throw new Error("Unauthorized: Check username/password");
      if (response.status === 404) throw new Error("URL not found");

      // If PROPFIND fails, try a simple GET on a likely file (index.json) or just check if auth passed
      if (!response.ok && response.status !== 207) {
        // Fallback check
        const getRes = await fetch(`${this.url}/inkread_data.json`, { method: 'HEAD', headers: this.headers, credentials: 'omit' });
        if (getRes.status === 401) throw new Error("Unauthorized");
        // If 404, it might just mean file doesn't exist yet, but connection is OK if not 401
      }

      return true;
    } catch (e: any) {
      console.error("WebDAV Test Error", e);
      throw e;
    }
  }

  async getFile(filename: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.url}/${filename}`, {
        method: 'GET',
        headers: this.headers,
        credentials: 'omit'
      });

      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`WebDAV GET failed: ${response.statusText}`);

      return await response.text();
    } catch (e) {
      console.error(`Error reading ${filename}`, e);
      throw e;
    }
  }

  async putFile(filename: string, content: string): Promise<void> {
    try {
      const response = await fetch(`${this.url}/${filename}`, {
        method: 'PUT',
        headers: {
          ...this.headers,
          'Content-Type': 'application/json',
        },
        body: content,
        credentials: 'omit'
      });

      if (!response.ok) throw new Error(`WebDAV PUT failed: ${response.statusText}`);
    } catch (e) {
      console.error(`Error writing ${filename}`, e);
      throw e;
    }
  }
}

export const testWebDavConnection = async (settings: AppSettings): Promise<string> => {
  try {
    const client = new WebDavClient(settings);
    await client.testConnection();
    return "连接成功！";
  } catch (error: any) {
    return `连接失败: ${error.message}`;
  }
};

export const syncData = async (): Promise<string> => {
  const settings = getSettings();
  if (!settings.webdav_url) return "未配置 WebDAV";

  const client = new WebDavClient(settings);

  // 获取本地完整数据
  const localBackup = createBackup();
  const localData = JSON.parse(localBackup);
  const localTimestamp = localData.timestamp;

  // 1. 尝试获取云端数据
  let cloudBackupStr: string | null = null;
  try {
    cloudBackupStr = await client.getFile('inkread_data.json');
  } catch (e) {
    return "连接失败";
  }

  // 2. 如果云端没有数据，直接上传
  if (!cloudBackupStr) {
    await client.putFile('inkread_data.json', localBackup);
    return "首次上传完成";
  }

  // 3. 比较时间戳，决定上传还是下载
  const cloudData = JSON.parse(cloudBackupStr);
  const cloudTimestamp = cloudData.timestamp || 0;

  if (localTimestamp > cloudTimestamp) {
    // 本地更新，上传到云端
    await client.putFile('inkread_data.json', localBackup);
    return "上传完成";
  } else if (localTimestamp < cloudTimestamp) {
    // 云端更新，下载并合并
    await restoreBackup(cloudBackupStr);
    return "下载完成";
  } else {
    // 时间戳相同，无需同步
    return "已是最新";
  }
};

// 手动上传数据到云端
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

// 手动从云端下载数据
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