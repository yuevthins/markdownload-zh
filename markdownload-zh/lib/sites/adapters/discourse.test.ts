import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { convertToMarkdown } from '../../convert';
import { extractDiscourseMainPost } from './discourse';

const URL = 'https://linux.do/t/topic/1782304';

function parse(html: string): Document {
  return new JSDOM(html, { url: URL }).window.document;
}

describe('extractDiscourseMainPost', () => {
  it('提取 crawler HTML 的首楼正文，不带回复和相关主题', () => {
    const doc = parse(`
      <html>
        <head>
          <meta property="og:title" content="应该是目前最强的PPT Agent，附上完整思路分享">
        </head>
        <body>
          <div id="post_1" class="topic-body crawler-post">
            <div class="crawler-post-meta">作者和时间</div>
            <div class="post" itemprop="text">
              <p>主帖第一段</p>
              <div class="lightbox-wrapper">
                <a class="lightbox" href="https://cdn.example.com/original/cover.jpeg" title="封面">
                  <img src="https://cdn.example.com/optimized/cover.jpeg" alt="封面">
                  <div class="meta">1920x1080 135 KB</div>
                </a>
              </div>
              <pre><code class="lang-auto">PPT_OUTLINE</code></pre>
            </div>
            <div itemprop="interactionStatistic"><span class="post-likes">2776 个赞</span></div>
            <div class="crawler-linkback-list"><a href="/t/related">相关主题</a></div>
          </div>
          <div id="post_2" itemprop="comment" class="topic-body crawler-post">
            <div class="post" itemprop="text"><p>前排直呼大佬</p></div>
          </div>
        </body>
      </html>
    `);

    const result = extractDiscourseMainPost(doc, URL);

    expect(result?.title).toBe('应该是目前最强的PPT Agent，附上完整思路分享');
    expect(result?.content).toContain('主帖第一段');
    expect(result?.content).toContain('PPT_OUTLINE');
    expect(result?.content).toContain('https://cdn.example.com/original/cover.jpeg');
    expect(result?.content).not.toContain('https://cdn.example.com/optimized/cover.jpeg');
    expect(result?.content).not.toContain('2776 个赞');
    expect(result?.content).not.toContain('相关主题');
    expect(result?.content).not.toContain('前排直呼大佬');
    expect(result?.content).not.toContain('1920x1080');
  });

  it('支持客户端渲染后的 Discourse cooked 结构', () => {
    const doc = parse(`
      <html>
        <head><title>客户端标题 - LINUX DO</title></head>
        <body>
          <article id="post_1" class="topic-post">
            <div class="regular contents">
              <div class="cooked">
                <p>客户端主帖正文</p>
              </div>
            </div>
          </article>
          <article id="post_2" class="topic-post" itemprop="comment">
            <div class="regular contents">
              <div class="cooked"><p>二楼回复</p></div>
            </div>
          </article>
        </body>
      </html>
    `);

    const result = extractDiscourseMainPost(doc, URL);

    expect(result?.title).toBe('客户端标题');
    expect(result?.content).toContain('客户端主帖正文');
    expect(result?.content).not.toContain('二楼回复');
  });

  it('转换 Markdown 时保留主帖图片和代码块', () => {
    const doc = parse(`
      <html>
        <head><meta property="og:title" content="Markdown 测试"></head>
        <body>
          <div id="post_1" class="topic-body crawler-post">
            <div class="post" itemprop="text">
              <p>正文</p>
              <a class="lightbox" href="https://cdn.example.com/original/a.webp">
                <img src="https://cdn.example.com/optimized/a.webp" alt="示例图">
                <div class="meta">图片信息</div>
              </a>
              <pre><code class="language-json">{"ok": true}</code></pre>
            </div>
          </div>
          <div id="post_2" itemprop="comment" class="topic-body crawler-post">
            <div class="post" itemprop="text"><p>回复内容</p></div>
          </div>
        </body>
      </html>
    `);

    const result = extractDiscourseMainPost(doc, URL);
    const markdown = convertToMarkdown(result?.content || '', URL);

    expect(markdown).toContain('正文');
    expect(markdown).toContain('![示例图](https://cdn.example.com/original/a.webp)');
    expect(markdown).toContain('```json');
    expect(markdown).not.toContain('回复内容');
    expect(markdown).not.toContain('图片信息');
  });
});
