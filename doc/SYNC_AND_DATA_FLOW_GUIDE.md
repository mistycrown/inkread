# WebDAV 同步与数据流一致性指南

本文档记录了 InkRead 在开发 WebDAV 同步功能时遇到的核心问题、根本原因及最终解决方案。这些模式在构建“本地优先（Local-First）”应用时具有通用的参考价值。

## 核心架构

*   **数据源**: `LocalStorage` (作为单一真实数据源)。
*   **同步方式**: 全量 JSON 文件 (`inkread_data.json`) 通过 WebDAV 传输。
*   **冲突解决策略**: 最后写入胜出 (Last Write Wins)，基于时间戳对比。

---

## 问题一：无限循环上传 (The Infinite Upload Loop)

### 🔴 把脉
**症状**: 用户点击“同步”，无论云端是否有更新，系统总是提示“上传完成”。云端数据总是被本地覆盖。

### 🔍 病因
在生成备份数据用于对比时，使用了**当前时间**作为版本时间戳。

**错误的代码逻辑**:
```typescript
// 旧逻辑
export const createBackup = () => {
  return JSON.stringify({
    // 错误：每次调用都会生成一个新的时间，永远比云端文件的时间新
    timestamp: Date.now(), 
    data: ...
  });
};
```

由于同步流程是：`生成本地快照` -> `下载云端数据` -> `对比时间戳`。
因为快照是毫秒前生成的，它的 `timestamp` 永远大于云端文件的 `timestamp`，导致系统误判本地数据更新。

### ✅ 处方：持久化修改时间 (Persistent Modification Time)
**核心思想**: 只有当用户真正修改数据（增删改）时，才更新时间戳。

#### 1. 引入持久化存储
在 `storageService` 中维护一个独立的 `inkread_last_modified` 键。

```typescript
const LAST_MODIFIED_KEY = 'inkread_last_modified';

// 辅助函数：仅在数据变更时调用
const updateLastModified = (timestamp: number = Date.now()) => {
  localStorage.setItem(LAST_MODIFIED_KEY, timestamp.toString());
};

// 获取真实最后修改时间
export const getLastModified = (): number => {
  const raw = localStorage.getItem(LAST_MODIFIED_KEY);
  return raw ? parseInt(raw, 10) : 0;
};
```

#### 2. 埋点更新
在所有写操作中调用 `updateLastModified()`：

```typescript
export const saveArticle = (article) => {
  localStorage.setItem(...);
  updateLastModified(); // <--- 关键
};

export const deleteArticle = (id) => {
  // ... delete logic
  updateLastModified(); // <--- 关键
};
```

#### 3. 懒初始化 (Lazy Initialization)
**防坑指南**: 如果是旧版本升级上来的用户，本地没有 `last_modified` 记录。如果直接回退到 `Date.now()` 且不保存，又会陷入无限上传。

**修正后的 `createBackup`**:
```typescript
export const createBackup = () => {
  let lastMod = getLastModified();
  
  // 懒初始化：如果没有记录，计算一个并保存起来！
  if (lastMod === 0) {
      if (index.items.length > 0) {
          // 使用最新文章的时间
          lastMod = Math.max(...index.items.map(i => i.updated_at));
      } else {
          lastMod = Date.now();
      }
      // 关键：立即保存，防止下次还是 0
      updateLastModified(lastMod); 
  }

  return JSON.stringify({
    timestamp: lastMod, // 使用持久化的时间
    // ...
  });
};
```

---

## 问题二：UI 假死不刷新 (The Silent Update)

### 🔴 把脉
**症状**: 同步提示“下载完成”，但首页列表依然显示旧数据。需要手动刷新页面才能看到变化。

### 🔍 病因
React 的组件渲染是基于 State 的，而 `storageService` 直接操作的是 `LocalStorage`。
`LocalStorage` 的变化**不会**自动触发 React 组件的重新渲染。

同步流程：
1. 后台下载 JSON。
2. `restoreBackup()` 写入 LocalStorage。
3. **断链**：UI 组件不知道 Storage 变了，依然渲染旧的 State。

### ✅ 处方：事件总线 (Event Bus)

使用浏览器原生的 `CustomEvent` 机制通知 UI 刷新。

#### 1. 后台派发事件
在数据恢复完成后广播事件。

```typescript
// storageService.ts -> restoreBackup()
export const restoreBackup = async (jsonString) => {
    // ... 解析并写入 localStorage ...
    
    // 更新时间戳
    updateLastModified(data.timestamp);

    // 📣 广播事件：告诉所有人数据变了
    window.dispatchEvent(new Event('inkread_data_updated'));
    
    return "Success";
};
```

#### 2. 前台监听事件
在 React 组件中监听该事件并重新加载数据。

```tsx
// Home.tsx
useEffect(() => {
    loadItems(); // 初次加载
    
    //以此回调响应数据变化
    const handleDataUpdate = () => {
        console.log('数据已更新，正在刷新 UI...');
        loadItems(); // 重新从 Storage 读取数据
    };

    // 订阅事件
    window.addEventListener('inkread_data_updated', handleDataUpdate);
    
    // 清理订阅
    return () => {
        window.removeEventListener('inkread_data_updated', handleDataUpdate);
    };
}, []);
```

---

## 总结：本地优先应用的最佳实践

1.  **时间戳信任源**: 绝对不要在“读取/备份”阶段生成时间戳，只在“写入”阶段生成并在持久层维护。
2.  **数据初始化**: 永远要考虑“空状态”或“旧版本升级”时的初始化逻辑，避免默认值导致的逻辑黑洞。
3.  **UI 响应性**: 当数据层脱离 React State 管理（如直接操作 DB 或 Storage）时，必须建立明确的事件通知机制 (`Observer Pattern` 或 `Event Bus`) 来驱动 UI 更新。
