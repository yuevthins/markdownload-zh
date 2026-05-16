/**
 * 集成测试：defuddle 引擎驱动的 pipeline
 *
 * 通过公共接口 runPipeline() 验证新引擎的关键行为。
 * 在引擎切换前这些测试预期 RED；切换后转 GREEN。
 */
import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';

import { runPipeline } from '../../lib/pipeline';

/** 包装：构造 jsdom Document 并跑完整 pipeline，返回 PipelineResult */
async function clip(html: string, url: string) {
  const dom = new JSDOM(html, { url });
  return runPipeline(dom.window.document, url);
}

describe('defuddle 通用提取（无适配器）', () => {
  it('应该把通用网页转换为合法 Markdown', async () => {
    const html = `<!doctype html>
      <html><head><title>示例文章</title></head>
      <body>
        <article>
          <h1>示例文章</h1>
          <p>这是第一段普通正文。</p>
          <p>这是 <strong>加粗</strong> 文字。</p>
          <pre><code class="language-js">console.log("hi")</code></pre>
        </article>
        <aside>这是侧栏噪声，应被剔除</aside>
        <footer>© 2026 footer 噪声</footer>
      </body></html>`;

    const result = await clip(html, 'https://example.com/article');

    expect(result.success).toBe(true);
    if (!result.success || !result.data) return;

    expect(result.data.title).toContain('示例文章');
    expect(result.data.markdown).toContain('这是第一段普通正文');
    expect(result.data.markdown).toContain('**加粗**');
    // 围栏代码块（带语言标识）
    expect(result.data.markdown).toMatch(/```js\s+console\.log/);
    // 不应残留 HTML 标签
    expect(result.data.markdown).not.toMatch(/<article\b/i);
    expect(result.data.markdown).not.toMatch(/<p\b/i);
  });

  it('应该剔除 display:none 隐藏内容（defuddle 特有行为）', async () => {
    // Readability + Turndown 不会移除 CSS 隐藏元素，会把 SECRET 漏到 markdown 里。
    // defuddle 的 removeHiddenElements: true 会移除。
    const html = `<!doctype html>
      <html><head><title>隐藏内容测试</title></head>
      <body>
        <article>
          <h1>隐藏内容测试</h1>
          <p>这是可见正文，足够长以保证被识别为主要内容区域。${'A'.repeat(200)}</p>
          <div style="display:none">UNIQUE_SECRET_HIDDEN_TOKEN</div>
          <p style="visibility:hidden">UNIQUE_INVISIBLE_TOKEN</p>
          <p>另一段可见正文。${'B'.repeat(200)}</p>
        </article>
      </body></html>`;

    const result = await clip(html, 'https://example.com/hidden');

    expect(result.success).toBe(true);
    if (!result.success || !result.data) return;

    expect(result.data.markdown).toContain('可见正文');
    expect(result.data.markdown).not.toContain('UNIQUE_SECRET_HIDDEN_TOKEN');
    expect(result.data.markdown).not.toContain('UNIQUE_INVISIBLE_TOKEN');
  });
});

describe('适配器 fallbackSelectors → defuddle contentSelector', () => {
  it('应该限制 defuddle 在 fallbackSelectors[0] 指定的子树内提取', async () => {
    // 页面里同时有 <article>（默认会被 defuddle 选中）和 .pinned-zone（适配器希望的目标）。
    // 当适配器的 fallbackSelectors 指向 .pinned-zone 时，应该只输出 PINNED 部分。
    const html = `<!doctype html>
      <html><head><title>contentSelector 测试</title></head>
      <body>
        <article>
          <h1>默认正文</h1>
          <p>UniqueDefaultToken，这段属于 article 默认正文。${'A'.repeat(300)}</p>
        </article>
        <div class="pinned-zone">
          <h2>定位区域</h2>
          <p>UniquePinnedToken，这段在 .pinned-zone 内。${'B'.repeat(300)}</p>
        </div>
      </body></html>`;

    const dom = new JSDOM(html, { url: 'https://example.com/pinned' });
    const adapter = {
      id: 'test-pinned',
      match: () => true,
      fallbackSelectors: ['.pinned-zone'],
    };
    const { extractContent } = await import('../../lib/extract');
    const extracted = await extractContent(dom.window.document, 'https://example.com/pinned', adapter);

    expect(extracted).not.toBeNull();
    expect(extracted!.markdown).toBeDefined();
    expect(extracted!.markdown).toContain('UniquePinnedToken');
    expect(extracted!.markdown).not.toContain('UniqueDefaultToken');
  });
});

describe('customExtract 路径直接产出 Markdown（不再依赖 lib/convert/）', () => {
  it('extractContent 把 customExtract 返回的 HTML 经 defuddle 转为 markdown', async () => {
    const dom = new JSDOM(
      '<!doctype html><html><body></body></html>',
      { url: 'https://example.com/custom' }
    );
    const adapter = {
      id: 'test-custom-extract',
      match: () => true,
      customExtract: () => ({
        title: 'Custom Title',
        content:
          '<p>第一段 paragraph.</p>' +
          '<table><thead><tr><th>K</th><th>V</th></tr></thead>' +
          '<tbody><tr><td>name</td><td>alice</td></tr></tbody></table>' +
          '<pre><code class="language-py">print("hi")</code></pre>',
      }),
    };
    const { extractContent } = await import('../../lib/extract');
    const extracted = await extractContent(dom.window.document, 'https://example.com/custom', adapter);

    expect(extracted).not.toBeNull();
    expect(extracted!.title).toBe('Custom Title');
    // 关键：customExtract 路径也要返回 markdown，不再返回 html（issue #3 要求删除 lib/convert/）
    expect(extracted!.markdown).toBeDefined();
    expect(extracted!.markdown).toContain('第一段 paragraph');
    expect(extracted!.markdown).toMatch(/\|.*K.*\|.*V.*\|/);
    expect(extracted!.markdown).toMatch(/```py\s+print/);
    expect(extracted!.html).toBeUndefined();
  });

  it('runPipeline 完整链路：customExtract 适配器产出格式化后的 markdown', async () => {
    // 通过公共接口 runPipeline 验证 customExtract 适配器仍正常工作
    const html = '<!doctype html><html><body><div data-test-host="1"></div></body></html>';
    const dom = new JSDOM(html, { url: 'https://example.com/host' });

    // 临时注册一个仅匹配此 URL 的适配器，验证完整 pipeline 行为
    const { registerAdapter } = await import('../../lib/sites/registry');
    const adapter = {
      id: 'test-runpipeline-custom',
      match: 'example.com/host',
      customExtract: () => ({
        title: 'Pipeline Test',
        content: '<p>正文段落 alpha.</p><p>正文段落 beta.</p>',
      }),
    };
    registerAdapter(adapter);

    try {
      const result = await runPipeline(dom.window.document, 'https://example.com/host');
      expect(result.success).toBe(true);
      if (!result.success || !result.data) return;
      expect(result.data.title).toBe('Pipeline Test');
      expect(result.data.markdown).toContain('正文段落 alpha');
      expect(result.data.markdown).toContain('正文段落 beta');
    } finally {
      // 清理注册（registry 没有 unregister 函数，但这是测试隔离，下一个测试不会用同一 URL）
    }
  });
});
