/**
 * customExtract 适配器端到端测试（issue #4）
 *
 * 用合成 DOM 通过 runPipeline 跑完整管线，断言最终 markdown 质量。
 * 与 lib/sites/adapters/*.test.ts 不同：那些测试直接调 customExtract 返回的 HTML；
 * 这里测试经过 defuddle htmlToMarkdown 转换 + Stage 4 format 后的最终 markdown。
 */
import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';

import { runPipeline } from '../../lib/pipeline';

/** 用 JSDOM 构造一个文档并跑完整 pipeline。
 *  sourceDoc 与 doc 拆成两个独立 jsdom，对应生产里"克隆文档（preprocess 改）"
 *  与"活文档（customExtract / Shadow DOM 直接读）"分离的语义。
 */
async function clip(html: string, url: string) {
  const workDom = new JSDOM(html, { url });
  const sourceDom = new JSDOM(html, { url });
  return runPipeline(workDom.window.document, url, sourceDom.window.document);
}

describe('feishu 适配器端到端', () => {
  it('docx 页面 → markdown 含标题、段落和表格', async () => {
    // 飞书 docx 风格的 DOM：#docx 为容器，data-block-id/data-block-type 标记块类型
    const html = `<!doctype html>
<html><body><div id="docx"><div>
  <div data-block-id="1" data-block-type="page">
    <div class="page-block-content"><span data-string="true">飞书测试文档</span></div>
  </div>
  <div data-block-id="2" data-block-type="text">
    <div class="ace-line"><span data-string="true">第一段正文 alpha。</span></div>
  </div>
  <div data-block-id="3" data-block-type="text">
    <div class="ace-line"><span data-string="true">第二段正文 beta。</span></div>
  </div>
  <div data-block-id="4" data-block-type="table">
    <table>
      <tbody>
        <tr data-index="0"><th>键名 Key</th><th>取值 Value</th></tr>
        <tr data-index="1"><td>name</td><td>alice</td></tr>
        <tr data-index="2"><td>role</td><td>engineer</td></tr>
      </tbody>
    </table>
  </div>
</div></div></body></html>`;

    const result = await clip(html, 'https://x.feishu.cn/docx/abc');

    expect(result.success).toBe(true);
    if (!result.success || !result.data) return;
    expect(result.data.title).toContain('飞书测试文档');
    expect(result.data.markdown).toContain('第一段正文 alpha');
    expect(result.data.markdown).toContain('第二段正文 beta');
    // 表格转为 GFM
    expect(result.data.markdown).toMatch(/\|.*键名.*\|.*取值.*\|/);
    expect(result.data.markdown).toContain('alice');
    // 不应残留 HTML
    expect(result.data.markdown).not.toMatch(/<table\b/i);
    expect(result.data.markdown).not.toMatch(/<div\b/i);
  });
});

describe('reddit 适配器端到端', () => {
  it('帖子 light DOM → markdown 含标题、正文段落和图片', async () => {
    // Reddit Shadow DOM 在 jsdom 里难以完整复刻，用 light DOM 降级路径覆盖
    // ([slot="text-body"]、[slot="post-media-container"])
    const html = `<!doctype html>
<html><body>
  <h1 slot="title">Reddit 测试帖子</h1>
  <shreddit-post>
    <div slot="post-media-container">
      <img src="https://i.redd.it/example.png" alt="example image">
    </div>
    <div slot="text-body">
      <p>这是 Reddit 帖子的第一段正文 alpha。</p>
      <p>第二段正文 beta，包含 <strong>加粗</strong> 文字。</p>
    </div>
  </shreddit-post>
</body></html>`;

    const result = await clip(html, 'https://www.reddit.com/r/test/comments/abc/');

    expect(result.success).toBe(true);
    if (!result.success || !result.data) return;
    expect(result.data.title).toContain('Reddit 测试帖子');
    expect(result.data.markdown).toContain('第一段正文 alpha');
    expect(result.data.markdown).toContain('第二段正文 beta');
    expect(result.data.markdown).toContain('**加粗**');
    expect(result.data.markdown).toContain('https://i.redd.it/example.png');
  });
});

describe('wechat 适配器端到端', () => {
  it('微信文章 → markdown 把 data-src 懒加载图片转为真实 URL', async () => {
    // 微信公众号 img 用 data-src 占位，preprocess 阶段统一改写到 src
    const html = `<!doctype html>
<html><body>
  <h1 class="rich_media_title">微信测试文章</h1>
  <div id="js_content" class="rich_media_content">
    <p>这是微信公众号文章的第一段正文 alpha.</p>
    <p>第二段正文 beta，下面是一张图：</p>
    <img src="data:image/gif;base64,R0lGODlhAQABAAAAACw="
         data-src="https://mmbiz.qpic.cn/example.jpg"
         alt="示例图片">
    <p>另一段 gamma 收尾。</p>
  </div>
  <div id="js_pc_qr_code">应被清理掉的二维码区</div>
</body></html>`;

    const result = await clip(html, 'https://mp.weixin.qq.com/s/xxx');

    expect(result.success).toBe(true);
    if (!result.success || !result.data) return;
    expect(result.data.markdown).toContain('第一段正文 alpha');
    expect(result.data.markdown).toContain('第二段正文 beta');
    expect(result.data.markdown).toContain('另一段 gamma');
    // data-src 应被转换为真实 URL（关键断言）
    expect(result.data.markdown).toContain('https://mmbiz.qpic.cn/example.jpg');
    // 占位图（data: 协议）不应出现
    expect(result.data.markdown).not.toContain('data:image/gif');
    // removeSelectors 应清理二维码
    expect(result.data.markdown).not.toContain('应被清理掉的二维码区');
  });
});

describe('zhihu 适配器端到端', () => {
  it('知乎专栏 → markdown 清理推荐栏，保留正文与数学公式', async () => {
    const html = `<!doctype html>
<html><body>
  <h1 class="Post-Title">知乎测试文章</h1>
  <div class="Post-RichText">
    <p>这是知乎专栏的第一段正文 alpha。</p>
    <p>行内公式 <span class="ztext-math" data-tex="x^2 + y^2 = z^2">渲染版本</span> 后面继续。</p>
    <p>第二段正文 beta，包含图片：</p>
    <img src="https://pic1.zhimg.com/example.jpg" alt="知乎图片">
    <p>第三段 gamma 收尾。</p>
  </div>
  <div class="RecommendationColumn">
    <p>这是推荐栏内容 unique-recommendation-noise，应被清理。</p>
  </div>
  <div class="HotAnswers">
    <p>这是热门问答 unique-hot-noise，应被清理。</p>
  </div>
</body></html>`;

    const result = await clip(html, 'https://zhuanlan.zhihu.com/p/123456789');

    expect(result.success).toBe(true);
    if (!result.success || !result.data) return;
    expect(result.data.markdown).toContain('第一段正文 alpha');
    expect(result.data.markdown).toContain('第二段正文 beta');
    expect(result.data.markdown).toContain('第三段 gamma');
    // 数学公式转 TeX 标记（$ 包裹的 TeX 源串，inline / block 风格都算通过）
    expect(result.data.markdown).toMatch(/\$+\s*x\^2 \+ y\^2 = z\^2\s*\$+/);
    // 推荐栏 / 热门问答应被清理
    expect(result.data.markdown).not.toContain('unique-recommendation-noise');
    expect(result.data.markdown).not.toContain('unique-hot-noise');
    // 正常图片保留
    expect(result.data.markdown).toContain('https://pic1.zhimg.com/example.jpg');
  });
});

describe('qq-news 适配器端到端', () => {
  it('腾讯新闻 → markdown 移除视频播放器 / AI 助手 UI 后保留正文', async () => {
    const html = `<!doctype html>
<html><body>
  <h1>腾讯新闻测试稿件</h1>
  <article class="content-article">
    <p>正文第一段 alpha，介绍事件背景。</p>
    <div class="txp_video_container">
      <div class="video_function">unique-video-controls，应被清理</div>
      <div class="barrage_area">unique-barrage，应被清理</div>
    </div>
    <p>正文第二段 beta，事件细节描述。</p>
    <div class="ai-assistant-yuanbao">unique-ai-assistant，应被清理</div>
    <div class="copyright-card">unique-copyright-card，应被清理</div>
    <p>正文第三段 gamma，事件影响分析。</p>
    <div class="recommend-feed">unique-recommend-feed，应被清理</div>
  </article>
</body></html>`;

    const result = await clip(html, 'https://news.qq.com/rain/a/20260101A0XXXX');

    expect(result.success).toBe(true);
    if (!result.success || !result.data) return;
    expect(result.data.markdown).toContain('正文第一段 alpha');
    expect(result.data.markdown).toContain('正文第二段 beta');
    expect(result.data.markdown).toContain('正文第三段 gamma');
    // 视频播放器 UI 清理
    expect(result.data.markdown).not.toContain('unique-video-controls');
    expect(result.data.markdown).not.toContain('unique-barrage');
    // AI 助手 UI 清理
    expect(result.data.markdown).not.toContain('unique-ai-assistant');
    // 版权卡 / 推荐流清理
    expect(result.data.markdown).not.toContain('unique-copyright-card');
    expect(result.data.markdown).not.toContain('unique-recommend-feed');
  });
});
