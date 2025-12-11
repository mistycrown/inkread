# Android Hybrid 应用开发实战：剪贴板与数据同步优化指南

本文档总结了在开发 InkRead 安卓端（基于 Capacitor + React）时，关于**剪贴板自动读取**与**数据同步**功能的调试经验与最佳实践。

## 一、 Android 剪贴板自动读取 (Clipboard Automation)

### 1. 核心挑战
在混合开发（Hybrid App）模式下，实现“用户打开 App 自动识别剪贴板内容”面临三大障碍：
1.  **Web 标准限制**：`navigator.clipboard` 在无用户交互时严禁调用。
2.  **隐私通知 (Android 12+)**：后台或非用户触发的剪贴板读取会弹出系统警告 Toast，频繁触发会严重干扰用户体验。
3.  **App 生命周期**：WebView 与 Native 层的通信在 App 刚唤醒（Resume）时可能不稳定。

### 2. 最终解决方案：去重 + 超时保护 + 场景化

我们采用了一套组合拳来完美解决体验问题：

#### A. 智能去重 (De-duplication)
使用 `useRef` 记录上一次读取的内容。仅当**App 从后台切回前台 (Resume)** 且 **剪贴板内容与上次不同** 时，才触发业务逻辑。
- **收益**：消除了 90% 的无效读取和系统隐私弹窗骚扰。

#### B. 通信超时保护 (Timeout Protection)
Capacitor Native Plugin 偶尔会出现 Promise 挂起现象。我们引入 `Promise.race` 机制，强制任何 Native 调用必须在 2秒内返回。
```typescript
// 强行竞速，防止 Plugin 死锁
const result = await Promise.race([Clipboard.read(), timeoutPromise]);
```

#### C. 平台隔离
- **Web 端**：仅保留“手动按钮”触发，彻底禁用后台自动读取。
- **Android 端**：监听 `appStateChange` 事件，利用 Native Plugin 进行静默检测。

---

## 二、 跨端数据同步 (Data Sync)

### 1. 核心挑战：数据一致性与缓存

在解决“PC更新了，手机却看不到”的问题中，我们发现了三个隐蔽的陷阱。

### 2. 关键优化点

#### A. 必须禁用 CDN 与浏览器缓存 (Double No-Cache)
Supabase Storage 默认有 CDN 缓存，且手机 WebView 也会积极缓存 GET 请求。这导致手机下载到的往往是旧文件。
**解决方案**：
1.  **上传时**：指定 `cacheControl: '0'`，告诉 CDN 不要缓存此文件。
2.  **下载时**：在 Supabase Client 初始化时注入全局 Headers，强制浏览器/WebView 获取最新数据。
    ```typescript
    createClient(url, key, {
        global: { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } }
    })
    ```

#### B. 同步策略：全量镜像覆盖 (Mirror Overwrite)
对于简单的单文件同步架构，试图“合并 (Merge)”本地与云端的 Index 极其危险，会导致已删除的项目在同步后“复活”。
**解决方案**：
- 采用 **Mirror** 策略：一旦判定需要从云端下载（`Cloud > Local`），则直接丢弃本地 Index，**全量替换**为云端 Index。这是保证多端删除状态一致的唯一简单解法。

#### C. 避免“伪更新”
修改 Settings（如输入 API Key）不应更新全局数据的 `last_modified` 时间戳。
- **教训**：如果输入配置也算作数据更新，新装的（空数据）手机会立即拥有最新的时间戳，从而错误地覆盖云端的已有数据。

#### D. RLS 权限陷阱
Supabase 的 Row Level Security (RLS) 必须同时开启 `SELECT` 权限。
- **教训**：如果只有 `INSERT/UPDATE`，连接测试中的“上传”步骤会成功，但随后的“下载”会静默失败或返回空，导致同步逻辑中断。务必在连接测试中加入“上传后立即下载验证”的步骤。

### 3. 调试技巧 (必读)

1.  **Chrome 远程调试**：连接手机 USB，访问 `chrome://inspect/#devices`。这是查看真机 WebView Console 和 Network 请求的唯一途径。
2.  **强制 UI 刷新**：在 React 中，如果底层数据全量替换但状态更新复杂，直接调用 `window.location.reload()` 可能是最稳妥的 UI 同步手段。
