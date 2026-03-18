# Chrome 扩展开发规范指南

> 基于 Chrome 官方文档整理 | 适用于 Manifest V3

## 一、核心架构

### 五大组件

| 组件 | 作用 | 文件位置（WXT） |
|------|------|----------------|
| **Manifest** | 唯一必需文件，声明扩展配置 | 自动生成 |
| **Service Worker** | 后台事件处理，无 DOM 访问 | `entrypoints/background.ts` |
| **Content Script** | 注入网页，操作 DOM | `entrypoints/content.ts` |
| **Popup** | 点击图标弹出的界面 | `entrypoints/popup/` |
| **Options** | 设置页面（可选） | `entrypoints/options/` |

### MV3 关键变化

| MV2 | MV3 | 影响 |
|-----|-----|------|
| Background Page（持久） | Service Worker（按需） | 需处理生命周期 |
| 可加载远程代码 | 必须打包所有代码 | 无法动态加载 JS |
| webRequest 阻止 | declarativeNetRequest | 更安全 |
| 回调风格 API | Promise 风格 API | 更现代 |

---

## 二、权限模型

### 最小权限原则

> 用户看到的权限警告越多，安装率越低。优先使用低权限 API。

### 权限类型对比

| 类型 | 声明方式 | 时机 | 适用场景 |
|------|----------|------|----------|
| **permissions** | manifest 固定 | 安装时 | 必需的 API 权限 |
| **host_permissions** | manifest 固定 | 安装时 | 需要访问的网站 |
| **optional_permissions** | 代码请求 | 运行时 | 可选功能 |
| **activeTab** | manifest 固定 | 用户触发时 | ⭐ 推荐 |

### ⭐ activeTab 权限（本项目采用）

**作用**：用户点击扩展图标时，临时获取当前标签页访问权限

**优势**：
- 无权限警告弹窗
- 用户离开页面自动失效
- 是 `<all_urls>` 的安全替代

**触发条件**：
- 点击扩展图标
- 点击右键菜单项
- 使用键盘快捷键
- 接受地址栏建议

**本项目配置**：
```json
{
  "permissions": ["activeTab", "scripting", "downloads"]
}
```

---

## 三、消息传递

### Content Script ↔ Service Worker 通信

```
┌─────────────────┐     sendMessage()     ┌─────────────────┐
│  Content Script │ ──────────────────►  │  Service Worker │
│  (网页上下文)    │                       │  (后台)          │
│                 │ ◄──────────────────  │                 │
└─────────────────┘     sendResponse()    └─────────────────┘
```

### 一次性消息（推荐）

**Content Script 发送**：
```typescript
const response = await chrome.runtime.sendMessage({
  action: 'extract',
  data: { html, url, title }
});
```

**Service Worker 接收**：
```typescript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extract') {
    // 处理逻辑
    sendResponse({ success: true, markdown: result });
  }
  return true; // 异步响应需要返回 true
});
```

### 安全注意事项

- Content Script 可信度低，需验证所有输入
- 使用 `JSON.parse()` 安全解析数据
- 使用 `innerText` 而非 innerHTML 处理用户数据
- 限制 Content Script 能触发的特权操作

---

## 四、Content Script 规范

### 注入方式

| 方式 | 适用场景 | 本项目采用 |
|------|----------|-----------|
| 静态声明 | 固定网站自动注入 | ❌ |
| 动态注册 | 运行时决定注入 | ❌ |
| **程序化注入** | 用户触发时注入 | ✅ |

**程序化注入**（配合 activeTab）：
```typescript
// Service Worker
await chrome.scripting.executeScript({
  target: { tabId },
  files: ['content.js']
});
```

### 访问限制

**可直接访问的 API**：
- `chrome.runtime.sendMessage()`
- `chrome.runtime.connect()`
- `chrome.storage`
- `chrome.i18n`

**不可访问**：
- `chrome.tabs`
- `chrome.downloads`
- 其他大多数 Chrome API

### 与网页隔离

- Content Script 和网页在隔离的 JS 环境中
- 共享 DOM，但变量互不可见
- 使用 `window.postMessage()` 与网页通信

---

## 五、Service Worker 规范

### 生命周期

```
加载 ──► 活跃（处理事件）──► 空闲 ──► 卸载
              ▲                      │
              └──────────────────────┘
                    新事件触发
```

**关键点**：
- 按需加载，空闲时卸载
- 无法访问 DOM
- 不要依赖全局变量保持状态
- 使用 `chrome.storage` 持久化数据

### 事件处理模式

```typescript
// ✅ 正确：在顶层注册监听器
chrome.runtime.onMessage.addListener(handleMessage);
chrome.action.onClicked.addListener(handleClick);

// ❌ 错误：在异步回调中注册（可能被卸载时丢失）
```

### 状态管理

```typescript
// ❌ 错误：依赖全局变量（Service Worker 重启后丢失）
let count = 0;

// ✅ 正确：使用 storage
chrome.action.onClicked.addListener(async () => {
  const { count = 0 } = await chrome.storage.local.get('count');
  await chrome.storage.local.set({ count: count + 1 });
});
```

---

## 六、安全规范

### 代码安全

| 禁止 | 替代方案 |
|------|----------|
| 动态代码执行 | `JSON.parse()` |
| `innerHTML` 处理用户数据 | `innerText` / `textContent` |
| 字符串形式的定时器 | 箭头函数 |
| 远程加载 JS | 打包所有代码 |

### 数据安全

- 所有外部数据视为不可信
- 验证消息来源
- 使用 HTTPS 加载资源
- 敏感数据使用 `chrome.storage.local`

### CSP（内容安全策略）

MV3 默认 CSP：
```
script-src 'self';
object-src 'self';
```

不允许：
- 内联脚本
- 内联事件处理器
- 动态代码执行

---

## 七、发布流程

### 准备清单

- [ ] 开发者账号（一次性 $5 注册费）
- [ ] 扩展 ZIP 包（不含 node_modules）
- [ ] 图标：128x128 必需，48x48、16x16 推荐
- [ ] 商店截图：1280x800 或 640x400
- [ ] 隐私政策（如果收集用户数据）

### 审核要点

- 单一明确的功能用途
- 权限声明与实际使用一致
- 无远程代码加载
- 无恶意行为
- 遵守 Chrome Web Store 政策

### 常见拒绝原因

- 请求过多权限
- 功能描述与实际不符
- 包含第三方广告
- 收集用户数据未声明
- 代码混淆过度

---

## 八、本项目适用规范

### 权限配置

```typescript
// wxt.config.ts
export default defineConfig({
  manifest: {
    permissions: ['activeTab', 'scripting', 'downloads'],
    // 无需 host_permissions，activeTab 足够
  }
});
```

### 数据流

```
用户点击图标
    │
    ▼
Service Worker 接收 action.onClicked
    │
    ▼
程序化注入 Content Script
    │
    ▼
Content Script 提取 DOM 内容
    │
    ▼
发送消息到 Service Worker
    │
    ▼
Service Worker 转换 Markdown
    │
    ▼
Popup 显示预览
    │
    ▼
用户点击下载 → chrome.downloads.download()
```

### 安全措施

- 使用 Readability.js 提取，安全处理 DOM
- Turndown 转换时过滤危险标签
- 文件名清理防止路径注入
- 无需网络请求，全本地处理

---

## 参考资源

- [Chrome 扩展开发文档](https://developer.chrome.com/docs/extensions?hl=zh-cn)
- [Manifest V3 迁移指南](https://developer.chrome.com/docs/extensions/develop/migrate?hl=zh-cn)
- [WXT 框架文档](https://wxt.dev)
- [Chrome Web Store 政策](https://developer.chrome.com/docs/webstore/program-policies?hl=zh-cn)
