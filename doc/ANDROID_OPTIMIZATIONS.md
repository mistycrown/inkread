# AndroidHybrid 应用开发实战：剪贴板与数据同步优化指南

本文档总结了在开发 InkRead 安卓端（基于 Capacitor + React）时，关于**剪贴板自动读取**与**数据同步**功能的调试经验与最佳实践。

## 一、 Android 剪贴板自动读取 (Clipboard Automation)

### 1. 核心挑战

在混合开发（Hybrid App）模式下，实现“用户打开 App 自动识别剪贴板内容”面临三大障碍：

1.  **Web 标准限制**：现代浏览器的 `navigator.clipboard` API 严禁在无用户交互（User Gesture）的情况下调用。尝试在 `useEffect` 或后台调用会直接抛出 `NotAllowedError`。
2.  **安卓系统隐私策略 (Android 12+)**：Android 12 及以上版本引入了强制的“剪贴板访问通知”。每当应用（即使是前台）读取剪贴板，屏幕底部都会弹出系统级 Toast：“InkRead pasted from your clipboard”。如果读取过于频繁，会给用户造成严重的隐私侵犯感。
3.  **后台限制 (Android 10+)**：为了省电和隐私，应用在后台（Background）时无法访问剪贴板。

### 2. 演进历程与解决方案

#### ❌ 阶段一：纯 Web 方案 (失败)
直接在 `useEffect` 中调用，不仅报错，而且在 WebView 中往往拿不到权限。

#### ❌ 阶段二：简单的 Native Plugin + AppState (用户体验差)
使用 `@capacitor/clipboard` 并监听 `appStateChange`。
**问题**：每次切换 App（哪怕只是下拉通知栏再收起），都会触发读取，导致系统隐私 Toast 疯狂弹出，极其烦人。

#### ✅ 阶段三：去重 + 超时保护 + 场景化 (最终方案)

我们采用了一套组合拳来完美解决体验问题：

**A. 智能去重 (De-duplication)**
使用 `useRef` 记录上一次读取的内容。仅当**App 从后台切回前台 (Resume)** 且 **剪贴板内容与上次不同** 时，才触发业务逻辑（弹窗）。这消除了 90% 的无效读取和骚扰。

```typescript
// 伪代码示例
const lastClipboardRef = useRef('');

CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
    if (isActive) {
        const { value } = await Clipboard.read();
        // 关键：如果内容没变，直接忽略，不打扰用户
        if (value === lastClipboardRef.current) return;
        
        lastClipboardRef.current = value;
        showPrompt(value);
    }
});
```

**B. 通信超时保护 (Timeout Protection)**
Capacitor 的 Native Plugin 与 WebView 通信偶尔会出现“挂起”现象（Promise 永远不 Resolve），导致 App 看起来像死机。我们引入 `Promise.race` 机制，强制任何 Native 调用必须在 2秒内返回。

```typescript
const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout')), 2000)
);
// 强行竞速，防止卡死
const result = await Promise.race([Clipboard.read(), timeoutPromise]);
```

**C. 平台隔离**
在 Web 端（非 Native）彻底禁用自动读取逻辑，仅保留手动按钮触发，避免浏览器控制台报错。

---

## 二、 跨端数据同步 (Data Sync)

### 1. 核心挑战：缓存与时间戳

在调试 Supabase 同步时，我们遇到了“PC上传了，手机却提示 Already up to date”的诡异现象。

### 2. 关键陷阱

1.  **CDN 缓存 (The Silent Killer)**：
    Supabase Storage 默认有 CDN 缓存。如果你刚上传了 `data.json`，紧接着用手机下载，CDN 给你的可能是 10分钟前的旧文件。
    *   **解决**：上传时必须强制指定 `cacheControl: '0'`。
    ```typescript
    supabase.storage.from(BUCKET).upload(name, data, {
        cacheControl: '0', // 禁用缓存，确保强一致性
        upsert: true
    })
    ```

2.  **配置修改引发的“伪更新”**：
    原本的逻辑是：只要由于修改了 Settings（如输入 API Key），全局 `last_modified` 时间戳就会更新。
    *   **后果**：新手机刚输入完配置，其时间戳就变成了 `Now()`，比云端数据还新。同步算法误判手机为最新，导致空数据覆盖云端。
    *   **解决**：修改 `saveSettings` 逻辑，仅在修改业务数据（文章/Index）时更新时间戳，修改配置不作为“数据变更”。

3.  **UI 假死**：
    数据虽然下载到了 LocalStorage，但 React 组件状态没变，列表不刷新。
    *   **解决**：在检测到同步操作为 `Download` 类型后，强制执行 `window.location.reload()`，简单粗暴但有效。

---

## 三、 调试技巧总结

开发 Hybrid App 时，切忌在真机上“盲调”。

1.  **Chrome 远程调试 (上帝视角)**：
    连接手机 -> 打开 USB 调试 -> Chrome 输入 `chrome://inspect/#devices`。
    这能让你看到手机 WebView 的 Console 报错、Network 请求和 LocalStorage 数据。没有它，调试同步逻辑几乎不可能。

2.  **暴力可视化 (Toast Debugging)**：
    在开发不确定性很高的硬件功能（如剪贴板、蓝牙）时，不要只打 `console.log`。把关键步骤用 `Toast` 弹出来（如 "Starting read...", "Native success"），能让你立刻知道代码卡在哪一步。

3.  **利用模拟器快照**：
    Android Studio 模拟器支持快照。在测试“新用户安装”场景时，可以直接 Wipe Data 重置模拟器，比真机重装 App 快得多。
