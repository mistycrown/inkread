import { getSettings, getIndex, saveIndex, rawReadFile, rawWriteFile, getAllArticleFiles } from './storageService';
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
  }

  async testConnection(): Promise<boolean> {
    try {
      // Try to list the directory or get index.json
      // Using PROPFIND method usually checks directory access, but GET on root or index is safer for simple check
      const response = await fetch(`${this.url}/`, {
        method: 'PROPFIND', // Standard WebDAV method to check existence/properties
        headers: {
          ...this.headers,
          'Depth': '0' // Header to only check the target resource, not children
        },
      });

      // Some servers might return 405 Method Not Allowed for PROPFIND on files, 
      // or 207 Multi-Status. 200 OK is also fine.
      // 401 means Unauthorized (failed auth).
      if (response.status === 401) throw new Error("Unauthorized: Check username/password");
      if (response.status === 404) throw new Error("URL not found");

      // If PROPFIND fails, try a simple GET on a likely file (index.json) or just check if auth passed
      if (!response.ok && response.status !== 207) {
        // Fallback check
        const getRes = await fetch(`${this.url}/index.json`, { method: 'HEAD', headers: this.headers });
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
    return "Connection Successful!";
  } catch (error: any) {
    return `Connection Failed: ${error.message}`;
  }
};

export const syncData = async (): Promise<string> => {
  const settings = getSettings();
  if (!settings.webdav_url) return "No WebDAV configured";

  const client = new WebDavClient(settings);
  const localIndex = getIndex();

  // 1. Get Remote Index
  let cloudIndexStr;
  try {
    cloudIndexStr = await client.getFile('index.json');
  } catch (e) {
    return "Connection Failed";
  }

  // 1a. If remote doesn't exist, upload everything (First Sync)
  if (!cloudIndexStr) {
    await client.putFile('index.json', JSON.stringify(localIndex));
    const allFiles = getAllArticleFiles();
    for (const file of allFiles) {
      const content = rawReadFile(file);
      if (content) await client.putFile(file, content);
    }
    return "Initial Upload Complete";
  }

  const cloudIndex: IndexFile = JSON.parse(cloudIndexStr);

  // 2. Compare & Sync
  const allIds = new Set([
    ...localIndex.items.map(i => i.id),
    ...cloudIndex.items.map(i => i.id)
  ]);

  const mergedItems = [...localIndex.items];

  // Helper to update merged list
  const updateMergedIndex = (item: any) => {
    const idx = mergedItems.findIndex(i => i.id === item.id);
    if (idx > -1) mergedItems[idx] = item;
    else mergedItems.push(item);
  };

  for (const id of allIds) {
    const localItem = localIndex.items.find(i => i.id === id);
    const cloudItem = cloudIndex.items.find(i => i.id === id);
    const filename = `${id}.json`;

    // Case A: Only Local
    if (localItem && !cloudItem) {
      const content = rawReadFile(filename);
      if (content) await client.putFile(filename, content);
      // It remains in mergedItems by default
    }
    // Case B: Only Cloud
    else if (!localItem && cloudItem) {
      const content = await client.getFile(filename);
      if (content) rawWriteFile(filename, content);
      updateMergedIndex(cloudItem);
    }
    // Case C: Both Exist
    else if (localItem && cloudItem) {
      if (localItem.updated_at > cloudItem.updated_at) {
        // Local is newer -> Upload
        const content = rawReadFile(filename);
        if (content) await client.putFile(filename, content);
        updateMergedIndex(localItem);
      } else if (localItem.updated_at < cloudItem.updated_at) {
        // Cloud is newer -> Download
        const content = await client.getFile(filename);
        if (content) rawWriteFile(filename, content);
        updateMergedIndex(cloudItem);
      } else {
        // Equal - ensure merged has one of them
        updateMergedIndex(localItem);
      }
    }
  }

  // 3. Finalize
  const newIndexFile: IndexFile = {
    last_sync_time: Date.now(),
    items: mergedItems.sort((a, b) => b.created_at - a.created_at) // Sort by newest
  };

  saveIndex(newIndexFile);
  await client.putFile('index.json', JSON.stringify(newIndexFile));

  return "Sync Complete";
};