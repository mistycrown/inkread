# InkRead Android WebDAV 同步指南

## 📱 功能概述

InkRead Android 版本现已支持 WebDAV 云同步功能！您可以：

- ✅ 将所有文章数据上传到 WebDAV 服务器
- ✅ 从 WebDAV 服务器下载数据到手机
- ✅ 多设备数据同步
- ✅ 自动智能同步（基于时间戳）
- ✅ 支持坚果云、NextCloud 等 WebDAV 服务

## 🏗️ 技术架构

### 核心技术栈

```
React Native WebView (Capacitor)
         ↓
Cordova Advanced HTTP Plugin (原生 HTTP)
         ↓
WebDAV 服务器 (坚果云/NextCloud)
```

### 为什么使用 Cordova HTTP？

Android WebView 存在 CORS 限制，无法直接访问跨域的 WebDAV 服务器。Cordova Advanced HTTP 插件使用**原生 HTTP 请求**，完全绕过 CORS 限制。

## 📦 已安装的依赖

```json
{
  "dependencies": {
    "@capacitor/core": "^8.0.0",
    "@awesome-cordova-plugins/http": "latest",
    "cordova-plugin-advanced-http": "latest"
  }
}
```

## 🔧 配置说明

### 1. Capacitor 配置 (`capacitor.config.ts`)

```typescript
{
  plugins: {
    CapacitorHttp: {
      enabled: false  // ⚠️ 必须禁用，使用 Cordova HTTP
    }
  },
  android: {
    allowMixedContent: true,  // 允许 HTTP/HTTPS 混合内容
    webContentsDebuggingEnabled: true  // 启用调试
  }
}
```

### 2. WebDAV Service 架构

```typescript
// services/webdavService.ts

class WebDavClient {
  // 平台检测
  private isNative = Capacitor.isNativePlatform();
  
  // 原生平台请求
  private async nativeRequest(url, method, data) {
    return await HTTP.sendRequest(url, {
      method: method,
      data: data,
      headers: {
        'Authorization': `Basic ${base64Auth}`
      },
      timeout: 30
    });
  }
  
  // Web 平台请求
  private async webRequest(url, method, body) {
    return fetch(url, {
      method,
      headers: this.headers,
      body,
      credentials: 'omit'
    });
  }
  
  // 统一请求接口
  private async request(path, method, body) {
    if (this.isNative) {
      return this.nativeRequest(fullUrl, method, body);
    } else {
      return this.webRequest(fullUrl, method, body);
    }
  }
}
```

## 🚀 使用指南

### 配置 WebDAV

在应用的设置页面填写：

1. **Server URL**: WebDAV 服务器地址
   - 坚果云: `https://dav.jianguoyun.com/dav/inkread`
   - NextCloud: `https://your-nextcloud.com/remote.php/dav/files/username/inkread`

2. **Username**: 用户名
   - 坚果云: 注册邮箱
   - NextCloud: 用户名

3. **Password**: 应用密码
   - ⚠️ **不是登录密码！**
   - 坚果云: 在「账户信息」→「安全选项」→「第三方应用管理」生成
   - NextCloud: 在「设置」→「安全」→「设备和会话」生成

### 坚果云配置详细步骤

1. 登录坚果云网页版: https://www.jianguoyun.com/
2. 点击右上角头像 → 「账户信息」
3. 进入「安全选项」
4. 找到「第三方应用管理」
5. 点击「添加应用密码」
6. 输入应用名称（如 "InkRead"）
7. 复制生成的密码，这就是您需要填入的密码

### 测试连接

配置完成后，点击「Test Connection」按钮验证：

- ✅ **连接成功！** - 配置正确，可以使用同步功能
- ❌ **认证失败** - 用户名或密码错误
- ❌ **URL 不存在** - 服务器地址错误
- ❌ **网络请求失败** - 网络连接问题

### 手动同步

#### 上传到云端 ⬆️

将本地所有数据上传到 WebDAV 服务器，**覆盖云端数据**。

```
使用场景:
- 本地有最新的数据
- 想要备份当前数据到云端
- 刚配置好 WebDAV，首次上传
```

#### 从云端下载 ⬇️

从 WebDAV 服务器下载数据，**覆盖本地数据**。

```
使用场景:
- 云端有最新的数据
- 想要恢复之前的备份
- 在新设备上首次下载数据
```

⚠️ **警告**: 下载会覆盖本地所有数据，请谨慎操作！

### 智能同步（自动）

应用会自动比较本地和云端的时间戳：

```typescript
if (本地时间戳 > 云端时间戳) {
  自动上传本地数据
} else if (本地时间戳 < 云端时间戳) {
  自动下载云端数据
} else {
  数据已是最新，无需同步
}
```

## 🔍 代码实现细节

### 平台检测

```typescript
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

if (isNative) {
  // Android/iOS 使用原生 HTTP
  useNativeRequest();
} else {
  // Web 使用 fetch
  useFetch();
}
```

### 原生 HTTP 请求示例

```typescript
import { HTTP } from '@awesome-cordova-plugins/http';

// 设置序列化方式
await HTTP.setDataSerializer('utf8');

// 发送请求
const response = await HTTP.sendRequest(url, {
  method: 'put',
  data: jsonString,
  headers: {
    'Authorization': 'Basic ' + base64(username + ':' + password),
    'Content-Type': 'application/json'
  },
  timeout: 30  // 30 秒超时
});

// 处理响应
if (response.status === 200) {
  console.log('Success:', response.data);
}
```

### Base64 编码（跨平台）

```typescript
const toBase64 = (str: string) => {
  // 浏览器环境
  if (typeof window !== 'undefined' && window.btoa) {
    return window.btoa(str);
  }
  // Node.js/其他环境
  return Buffer.from(str).toString('base64');
};

// 使用
const authHeader = `Basic ${toBase64(`${username}:${password}`)}`;
```

## 📊 数据格式

### 上传的 JSON 结构

```json
{
  "timestamp": 1702123456789,
  "version": "1.0.0",
  "articles": [
    {
      "id": "uuid-1",
      "title": "文章标题",
      "content": "文章内容...",
      "url": "https://example.com",
      "createdAt": 1702123456000,
      "tags": ["tag1", "tag2"]
    }
  ],
  "settings": {
    "webdav_url": "https://dav.jianguoyun.com/dav/inkread",
    "webdav_user": "user@example.com",
    "openai_api_key": "sk-...",
    "prompt_templates": []
  }
}
```

### 文件保存位置

```
WebDAV 服务器
└── inkread/
    └── inkread_data.json  // 所有数据的备份文件
```

## 🐛 常见问题排查

### Q1: 连接失败 - 401 Unauthorized

**原因**: 
- 使用了登录密码而不是应用密码
- 用户名或密码输入错误

**解决**:
1. 确认使用的是应用专用密码
2. 重新生成应用密码
3. 检查用户名是否正确（坚果云是邮箱）

### Q2: 上传/下载失败 - Network Error

**原因**: 
- 网络连接问题
- WebDAV 服务器不可访问
- 超时

**解决**:
1. 检查手机网络连接
2. 尝试在浏览器访问 WebDAV URL
3. 检查防火墙设置

### Q3: 数据没有同步

**原因**: 
- 时间戳相同，智能同步判断为无需更新
- 文件权限问题

**解决**:
1. 使用手动上传/下载强制同步
2. 检查 WebDAV 文件夹权限

### Q4: Android 上显示 "HTTP plugin not available"

**原因**: Cordova HTTP 插件未正确安装

**解决**:
```bash
# 重新安装插件
npm install cordova-plugin-advanced-http @awesome-cordova-plugins/http

# 同步到 Android
npx cap sync android

# 在 Android Studio 中重新构建
```

## 🔒 安全性说明

### 数据加密

- ✅ 使用 HTTPS 加密传输
- ✅ 使用 Basic Auth 认证
- ⚠️ 数据在服务器上未加密存储

### 最佳实践

1. **使用 HTTPS**: 确保 WebDAV URL 使用 `https://`
2. **应用密码**: 使用独立的应用密码，不要使用主账户密码
3. **定期更换**: 定期更换应用密码
4. **敏感数据**: 如果有高度敏感数据，考虑本地加密后再上传

## 📱 调试指南

### 查看日志

在 Android Studio 中：

1. 连接设备或启动模拟器
2. 打开 Logcat
3. 筛选标签: `Capacitor` 或 `WebDAV`
4. 执行同步操作
5. 查看请求和响应日志

### 控制台日志

```typescript
// 已在代码中添加的日志
console.log('WebDAV 客户端初始化:', { 平台, URL });
console.log('原生 HTTP PUT:', url);
console.log('文件上传成功');
```

在 Chrome DevTools 中查看：
1. 在 Chrome 浏览器访问 `chrome://inspect`
2. 找到您的应用
3. 点击 `inspect`
4. 查看 Console 标签

## 🎯 性能优化建议

### 1. 压缩数据

```typescript
// 可选：使用 pako 压缩大文件
import pako from 'pako';

const compressed = pako.gzip(JSON.stringify(data));
await client.putFile('inkread_data.json.gz', compressed);
```

### 2. 增量同步

```typescript
// 仅同步变更的文章
const changedArticles = articles.filter(a => a.modifiedAt > lastSyncTime);
```

### 3. 后台同步

```typescript
// 使用 Capacitor Background Task
import { BackgroundTask } from '@capacitor/background-task';

BackgroundTask.beforeExit(async () => {
  await syncData();
});
```

## 📚 相关资源

- [Cordova Advanced HTTP 文档](https://github.com/silkimen/cordova-plugin-advanced-http)
- [Capacitor 文档](https://capacitorjs.com/docs)
- [WebDAV 协议规范](https://tools.ietf.org/html/rfc4918)
- [坚果云 WebDAV 说明](https://help.jianguoyun.com/?p=2064)

## 🔄 更新日志

| 日期 | 版本 | 变更 |
|------|------|------|
| 2025-12-09 | v1.0 | 初始版本，支持 Android WebDAV 同步 |

---

**提示**: 如有任何问题，请查看应用内的日志或联系技术支持。

## 💡 使用技巧

### 多设备协作

```
设备 A: 添加新文章 → 点击上传 ⬆️
设备 B: 打开应用 → 自动检测到云端更新 → 自动下载 ⬇️
```

### 数据恢复

```
误删数据 → 立即点击下载 ⬇️ → 从云端恢复最后的备份
```

### 定期备份

建议设置提醒，每周手动点击上传一次，确保数据安全。

---

**配置完成！现在您可以在 Android 设备上使用 WebDAV 云同步了！** 🎉
