import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { extractContent } from '../../extract';
import { getSiteAdapter } from '..';

async function extract(html: string, url: string) {
  const dom = new JSDOM(html, { url });
  const doc = dom.window.document;
  const adapter = getSiteAdapter(url, doc);
  const result = await extractContent(doc, url, adapter);
  const markdown = result?.markdown ?? '';
  return { adapter, result, markdown };
}

describe('X/Twitter 适配器', () => {
  describe('模式检测', () => {
    it('URL 含 /article/ 触发 Article 模式', async () => {
      const { adapter, markdown } = await extract(`
        <html><head><meta property="og:title" content="My Article"></head><body>
          <article>
            <div data-testid="User-Name"><span>Author</span><span>@author</span></div>
            <h2>Section 1</h2><p>Long form content here that is substantial enough.</p>
            <h2>Section 2</h2><p>More content to make this a real article body.</p>
          </article>
          <article data-testid="tweet">
            <div data-testid="tweetText">This is a comment reply</div>
          </article>
        </body></html>
      `, 'https://x.com/author/article/123456/media/789');

      expect(adapter?.id).toBe('x-twitter');
      expect(markdown).toContain('Section 1');
      expect(markdown).not.toContain('comment reply');
    });

    it('普通 status URL 触发 Tweet 模式', async () => {
      const { adapter, markdown } = await extract(`
        <html><head><title>Post / X</title></head><body>
          <article data-testid="tweet">
            <div data-testid="User-Name"><span>User1</span></div>
            <div data-testid="tweetText">First tweet content</div>
          </article>
          <article data-testid="tweet">
            <div data-testid="User-Name"><span>User2</span></div>
            <div data-testid="tweetText">Second tweet reply</div>
          </article>
        </body></html>
      `, 'https://x.com/user/status/123');

      expect(adapter?.id).toBe('x-twitter');
      expect(markdown).toContain('First tweet content');
      expect(markdown).toContain('Second tweet reply');
    });
  });

  describe('Article 模式', () => {
    it('只提取第一个 article，排除评论', async () => {
      const { markdown } = await extract(`
        <html><head><meta property="og:title" content="Deep Dive"></head><body>
          <article>
            <div data-testid="User-Name"><span>Jason</span><span>@jxnlco</span></div>
            <h2>Introduction</h2><p>This is the main article content with enough text to be substantial for extraction purposes.</p>
            <h2>Details</h2><p>More detailed content follows here with additional paragraphs and information.</p>
          </article>
          <article data-testid="tweet">
            <div data-testid="tweetText">Great article!</div>
          </article>
        </body></html>
      `, 'https://x.com/jxnlco/article/123/media/456');

      expect(markdown).toContain('Introduction');
      expect(markdown).toContain('main article content');
      expect(markdown).not.toContain('Great article!');
    });

    it('移除 UI 噪音元素', async () => {
      const { markdown } = await extract(`
        <html><head><meta property="og:title" content="Test"></head><body>
          <article>
            <div data-testid="User-Name"><span>Author</span></div>
            <h2>Content</h2><p>Real content here that is long enough to pass the length threshold for extraction.</p>
            <h2>More</h2><p>Additional content to ensure article mode detection works properly.</p>
            <div role="group"><button data-testid="like">Like</button></div>
            <a href="/user/status/123/analytics">334.7K Views</a>
            <a href="/user/status/123/quotes">View quotes</a>
            <a href="/premium">升级至高级版</a>
          </article>
        </body></html>
      `, 'https://x.com/user/article/123/media/456');

      expect(markdown).toContain('Real content');
      expect(markdown).not.toContain('Like');
      expect(markdown).not.toContain('Views');
      expect(markdown).not.toContain('quotes');
      expect(markdown).not.toContain('升级');
    });

    it('提取作者信息', async () => {
      const { markdown } = await extract(`
        <html><head><meta property="og:title" content="Test"></head><body>
          <article>
            <div data-testid="User-Name"><span>Jason Wei</span><span>@jasonwei</span></div>
            <h2>Part 1</h2><p>Article body content that is long enough to trigger article mode detection properly.</p>
            <h2>Part 2</h2><p>More content to ensure the article has multiple headings for detection.</p>
          </article>
        </body></html>
      `, 'https://x.com/jasonwei/article/123/media/456');

      expect(markdown).toContain('Jason Wei');
    });
  });

  describe('链接清理', () => {
    it('站内 @mention 链接转纯文本', async () => {
      const { markdown } = await extract(`
        <html><head><title>Post / X</title></head><body>
          <article data-testid="tweet">
            <div data-testid="tweetText">Check out <a href="/OpenAI">@OpenAI</a> latest work</div>
          </article>
        </body></html>
      `, 'https://x.com/user/status/123');

      expect(markdown).toContain('@OpenAI');
      expect(markdown).not.toContain('](/OpenAI)');
    });

    it('外部链接保留为 Markdown 链接', async () => {
      const { markdown } = await extract(`
        <html><head><title>Post / X</title></head><body>
          <article data-testid="tweet">
            <div data-testid="tweetText">Read more at <a href="https://openai.com/research">OpenAI Research</a></div>
          </article>
        </body></html>
      `, 'https://x.com/user/status/123');

      expect(markdown).toContain('openai.com');
    });

    it('x.com 搜索链接转纯文本', async () => {
      const { markdown } = await extract(`
        <html><head><title>Post / X</title></head><body>
          <article data-testid="tweet">
            <div data-testid="tweetText">Using <a href="https://x.com/search?q=%24browser">$browser</a> tool</div>
          </article>
        </body></html>
      `, 'https://x.com/user/status/123');

      expect(markdown).toContain('$browser');
      expect(markdown).not.toContain('x.com/search');
    });
  });

  describe('翻译检测', () => {
    it('检测到翻译状态时添加警告', async () => {
      const { markdown } = await extract(`
        <html class="translated-ltr"><head><title>Post / X</title></head><body>
          <article data-testid="tweet">
            <div data-testid="tweetText">Translated content here</div>
          </article>
        </body></html>
      `, 'https://x.com/user/status/123');

      expect(markdown).toContain('此页面在剪藏时处于浏览器翻译状态');
    });

    it('未翻译时无警告', async () => {
      const { markdown } = await extract(`
        <html><head><title>Post / X</title></head><body>
          <article data-testid="tweet">
            <div data-testid="tweetText">Normal content here</div>
          </article>
        </body></html>
      `, 'https://x.com/user/status/123');

      expect(markdown).not.toContain('此页面在剪藏时处于浏览器翻译状态');
    });
  });

  describe('Tweet 模式', () => {
    it('提取多条 tweet', async () => {
      const { markdown } = await extract(`
        <html><head><title>Thread / X</title></head><body>
          <article data-testid="tweet">
            <div data-testid="tweetText">Tweet 1 content</div>
          </article>
          <article data-testid="tweet">
            <div data-testid="tweetText">Tweet 2 content</div>
          </article>
          <article data-testid="tweet">
            <div data-testid="tweetText">Tweet 3 content</div>
          </article>
        </body></html>
      `, 'https://x.com/user/status/123');

      expect(markdown).toContain('Tweet 1 content');
      expect(markdown).toContain('Tweet 2 content');
      expect(markdown).toContain('Tweet 3 content');
    });

    it('移除互动按钮', async () => {
      const { markdown } = await extract(`
        <html><head><title>Post / X</title></head><body>
          <article data-testid="tweet">
            <div data-testid="tweetText">Good content</div>
            <div role="group"><button data-testid="like">42</button><button data-testid="retweet">5</button></div>
          </article>
        </body></html>
      `, 'https://x.com/user/status/123');

      expect(markdown).toContain('Good content');
      expect(markdown).not.toContain('42');
    });
  });
});
