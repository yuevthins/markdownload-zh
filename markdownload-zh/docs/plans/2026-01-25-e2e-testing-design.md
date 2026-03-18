# MarkDownload E2E 测试框架设计文档

> 生成于 2026-01-25，基于 /smart-brainstorm v2.2

## 目标

建立自动化端到端测试基础设施，让 Agent/CI 能够自动测试多个网站的内容提取质量，替代手动复制粘贴对比的低效流程。

## 项目上下文

- 语言: TypeScript
- 框架: WXT + Chrome MV3
- 现有测试: Vitest + jsdom（单元测试）
- 规模: medium（新增测试框架 + fixtures + 配置）

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│  npm run test:e2e                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Playwright + Chrome with Extension                         │
│  ├── 加载 .output/chrome-mv3/ 扩展                          │
│  ├── 导航到 file:// fixture HTML                            │
│  └── 触发扩展提取                                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  断言层                                                      │
│  ├── 基础断言：success=true, title/markdown 非空            │
│  ├── 字数阈值：markdown.length > minChars                   │
│  ├── 格式断言：无残留 HTML、Frontmatter 完整                 │
│  └── 站点特定：知乎代码块、微信图片等                         │
└─────────────────────────────────────────────────────────────┘
```

## 文件结构

```
tests/
├── e2e/
│   ├── playwright.config.ts      # Playwright 配置
│   ├── extraction.spec.ts        # 提取测试用例
│   └── helpers/
│       ├── extension.ts          # 扩展加载辅助
│       └── assertions.ts         # 自定义断言
├── fixtures/
│   ├── zhihu-article.html        # 知乎专栏
│   ├── wechat-article.html       # 微信公众号
│   ├── csdn-article.html         # CSDN
│   ├── cnblogs-article.html      # 博客园
│   ├── reddit-post.html          # Reddit
│   └── woshipm-article.html      # 人人都是产品经理
└── snapshots/                    # 期望输出快照（可选）
    └── *.expected.md
```

## 设计决策

### 决策 1: 浏览器自动化工具

**选择**: Playwright

| 选项 | 优点 | 缺点 |
|------|------|------|
| **Playwright** ✓ | 原生支持 Chrome 扩展、活跃维护、API 友好 | 依赖较重 |
| Puppeteer | 官方协议 | 扩展支持弱 |

**理由**: Playwright 有明确的 `browser.newContext({ extensions })` API。

### 决策 2: 测试数据策略

**选择**: 静态 HTML fixtures

| 选项 | 优点 | 缺点 |
|------|------|------|
| **静态 fixtures** ✓ | 离线、快速、稳定、可版本控制 | 需定期更新 |
| Mock server | 更真实 | 增加复杂度 |

**理由**: 简单可靠，初期够用。

### 决策 3: 质量判断标准

**选择**: 多层断言策略

```typescript
// Level 1: 基础（必须通过）
- success === true
- title.length > 0
- markdown.length > minChars

// Level 2: 格式（必须通过）
- 无残留 HTML 标签
- Frontmatter 存在且有效

// Level 3: 站点特定（按需）
- 知乎：包含代码块
- 微信：图片有有效 src
```

### 决策 4: 站点优先级

| 优先级 | 站点 | 状态 |
|--------|------|------|
| P0 | 知乎专栏 | 已验证 |
| P0 | 微信公众号 | 已验证 |
| P1 | CSDN | 新修复 |
| P1 | 博客园 | 新修复 |
| P2 | Reddit | 新修复 |
| P2 | 人人都是产品经理 | 已验证 |

## 实现计划

### Task 1: 安装依赖

```bash
npm install -D @playwright/test
npx playwright install chromium
```

### Task 2: 创建 Playwright 配置

`tests/e2e/playwright.config.ts`

### Task 3: 创建扩展加载辅助函数

`tests/e2e/helpers/extension.ts`

### Task 4: 创建断言辅助函数

`tests/e2e/helpers/assertions.ts`

### Task 5: 创建测试用例

`tests/e2e/extraction.spec.ts`

### Task 6: 保存 HTML fixtures

从真实网站保存 HTML 到 `tests/fixtures/`

### Task 7: 添加 npm scripts

```json
{
  "test:e2e": "playwright test",
  "test:e2e:headed": "playwright test --headed"
}
```

## 验证方式

| 验证项 | 方法 |
|--------|------|
| 扩展加载 | Playwright 能打开带扩展的浏览器 |
| 提取执行 | fixture 页面能触发提取 |
| 断言通过 | 所有 P0/P1 站点测试通过 |

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Playwright MV3 支持不完整 | 方案失败 | 先验证 POC |
| HTML fixtures 过时 | 测试不准确 | 定期更新 |
| 无头模式限制 | CI 不可用 | 使用 xvfb |

---

<!-- STRUCTURED_DATA_FOR_SUPERPOWERS
```yaml
inbox_items:
  - type: decision
    key: "decision/e2e-browser-automation"
    score: 7
    data:
      question: "选择哪个浏览器自动化工具？"
      chosen: "Playwright"
      alternatives: ["Puppeteer", "WebDriverIO"]
      reasoning: "原生支持 Chrome 扩展加载，API 友好，活跃维护"
      constraints: ["需要真实浏览器环境"]

  - type: decision
    key: "decision/e2e-test-data"
    score: 6
    data:
      question: "测试数据管理策略"
      chosen: "静态 HTML fixtures"
      alternatives: ["Mock server", "混合方案"]
      reasoning: "简单可靠，离线运行，可版本控制"

  - type: trap
    key: "trap/playwright-mv3-support"
    score: 6
    data:
      problem: "Playwright 对 MV3 支持可能不完整"
      mitigation: "先实现 POC 验证可行性"
      evidence: ["Playwright docs: chrome-extensions"]

risk_flags:
  - integration

verification_needed:
  - what: "Playwright 能加载 MV3 扩展"
    how: "运行 POC 测试"
  - what: "fixture 页面能触发提取"
    how: "运行 npm run test:e2e"
```
-->
