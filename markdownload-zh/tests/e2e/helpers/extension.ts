import { chromium, type BrowserContext, type Page } from '@playwright/test';
import path from 'path';

const EXTENSION_PATH = path.resolve(__dirname, '../../../.output/chrome-mv3');

/**
 * 创建带有扩展的浏览器上下文
 */
export async function createExtensionContext(): Promise<BrowserContext> {
  const context = await chromium.launchPersistentContext('', {
    headless: false, // Chrome 扩展需要非无头模式
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  return context;
}

/**
 * 获取扩展 ID（通过扩展页面）
 */
export async function getExtensionId(context: BrowserContext): Promise<string> {
  // 打开扩展管理页面
  const page = await context.newPage();
  await page.goto('chrome://extensions/');

  // 启用开发者模式并获取扩展 ID
  // 这是一个简化方法，实际可能需要更复杂的逻辑
  const extensionId = await page.evaluate(() => {
    // 在 chrome://extensions 页面查找扩展 ID
    const extensionsManager = document.querySelector('extensions-manager');
    if (!extensionsManager) return '';

    // Shadow DOM 访问
    const shadowRoot = extensionsManager.shadowRoot;
    if (!shadowRoot) return '';

    const itemsList = shadowRoot.querySelector('extensions-item-list');
    if (!itemsList) return '';

    const item = itemsList.shadowRoot?.querySelector('extensions-item');
    if (!item) return '';

    return item.getAttribute('id') || '';
  });

  await page.close();
  return extensionId;
}

/**
 * 在页面上执行提取并获取结果
 */
export async function extractContent(
  page: Page
): Promise<{ success: boolean; data?: { title: string; markdown: string }; error?: { code: string; message: string } }> {
  // 注入提取脚本（模拟扩展行为）
  const result = await page.evaluate(async () => {
    // 等待 extractor 脚本加载（如果已注入）
    // 或者直接执行提取逻辑
    return (window as any).__markdownload_extracted || null;
  });

  if (result) {
    return result;
  }

  // 如果没有结果，说明需要触发扩展
  // 这里我们采用直接执行提取逻辑的方式（绕过扩展 UI）
  return { success: false, error: { code: 'NOT_TRIGGERED', message: '提取未触发' } };
}

/**
 * 触发扩展提取（通过模拟点击扩展图标）
 * 注意：这需要扩展 ID，实现较复杂
 */
export async function triggerExtraction(
  context: BrowserContext,
  page: Page,
  extensionId: string
): Promise<void> {
  // 打开扩展 popup
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;

  // 创建新页面打开 popup
  const popupPage = await context.newPage();
  await popupPage.goto(popupUrl);

  // 等待提取完成
  await popupPage.waitForTimeout(2000);

  await popupPage.close();
}
