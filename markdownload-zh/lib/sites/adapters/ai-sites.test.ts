import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { convertToMarkdown } from '../../convert';
import { extractContent } from '../../extract';
import { getSiteAdapter } from '..';

async function extract(html: string, url: string) {
  const dom = new JSDOM(html, { url });
  const doc = dom.window.document;
  const adapter = getSiteAdapter(url, doc);
  const result = await extractContent(doc, url, adapter);
  const markdown = convertToMarkdown(result?.html || '', url);
  return { adapter, result, markdown };
}

describe('AI 常用国外站点适配器', () => {
  it('提取 X/Twitter 已登录 tweet DOM，排除动作按钮', async () => {
    const { adapter, result, markdown } = await extract(`
      <html><head><title>Post / X</title></head><body>
        <main>
          <article data-testid="tweet">
            <div data-testid="User-Name"><span>OpenAI</span><span>@OpenAI</span><time datetime="2026-04-30T01:00:00Z">Apr 30</time></div>
            <div data-testid="tweetText">Introducing a new AI research update with code and examples.</div>
            <a href="https://openai.com/research/example">research link</a>
            <img src="https://pbs.twimg.com/media/example.jpg" alt="research chart">
            <div role="group"><button data-testid="like">Like</button></div>
          </article>
          <aside>Trends for you</aside>
        </main>
      </body></html>
    `, 'https://x.com/OpenAI/status/123');

    expect(adapter?.id).toBe('x-twitter');
    expect(result?.title).toContain('Post');
    expect(markdown).toContain('Introducing a new AI research update');
    expect(markdown).toContain('research link');
    expect(markdown).toContain('research chart');
    expect(markdown).not.toContain('Trends for you');
    expect(markdown).not.toContain('Like');
  });

  it('提取 arXiv abs 页面标题、作者和摘要', async () => {
    const { adapter, result, markdown } = await extract(`
      <html><head><title>Attention Is All You Need</title></head><body>
        <main>
          <h1 class="title">Title: Attention Is All You Need</h1>
          <div class="authors">Authors: Ashish Vaswani, Noam Shazeer</div>
          <blockquote class="abstract">Abstract: We propose a new simple network architecture, the Transformer.</blockquote>
          <td class="subjects">Computation and Language</td>
        </main>
      </body></html>
    `, 'https://arxiv.org/abs/1706.03762');

    expect(adapter?.id).toBe('arxiv');
    expect(result?.title).toBe('Attention Is All You Need');
    expect(markdown).toContain('Authors: Ashish Vaswani');
    expect(markdown).toContain('Transformer');
  });

  it('提取 Hugging Face model page 的 README/prose 内容', async () => {
    const { adapter, result, markdown } = await extract(`
      <html><head><meta property="og:title" content="openai/gpt-oss-120b"></head><body>
        <main>
          <section class="prose"><h2>Model card</h2><p>This model is designed for agentic coding and reasoning workflows.</p></section>
          <aside>Downloads this month</aside>
        </main>
      </body></html>
    `, 'https://huggingface.co/openai/gpt-oss-120b');

    expect(adapter?.id).toBe('huggingface');
    expect(result?.title).toBe('openai/gpt-oss-120b');
    expect(markdown).toContain('agentic coding and reasoning');
    expect(markdown).not.toContain('Downloads this month');
  });

  it('提取 Papers with Code 摘要区域', async () => {
    const { adapter, markdown } = await extract(`
      <html><head><title>Attention Is All You Need | Papers With Code</title></head><body>
        <main>
          <h1 class="paper-title">Attention Is All You Need</h1>
          <div class="paper-abstract">The Transformer achieves state of the art translation quality.</div>
          <div class="related">Recommended papers</div>
        </main>
      </body></html>
    `, 'https://paperswithcode.com/paper/attention-is-all-you-need');

    expect(adapter?.id).toBe('paperswithcode');
    expect(markdown).toContain('Transformer achieves state of the art');
    expect(markdown).not.toContain('Recommended papers');
  });

  it('提取 YouTube 标题、频道、描述和缩略图', async () => {
    const { adapter, markdown } = await extract(`
      <html><head>
        <meta property="og:title" content="AI demo video">
        <meta property="og:image" content="https://i.ytimg.com/vi/demo/maxresdefault.jpg">
      </head><body>
        <script>var ytInitialPlayerResponse={"videoDetails":{"title":"AI demo video","author":"Demo Channel","shortDescription":"A walkthrough of an AI workflow.\\nIncludes links and examples."}};</script>
      </body></html>
    `, 'https://www.youtube.com/watch?v=demo');

    expect(adapter?.id).toBe('youtube');
    expect(markdown).toContain('Channel: Demo Channel');
    expect(markdown).toContain('A walkthrough of an AI workflow');
    expect(markdown).toContain('maxresdefault.jpg');
  });

  it('提取 LinkedIn 已登录态 post/article 主内容', async () => {
    const { adapter, markdown } = await extract(`
      <html><head><title>OpenAI on LinkedIn</title></head><body>
        <main><article><h1>OpenAI update</h1><p>We are sharing an applied AI deployment story for enterprise teams.</p></article></main>
        <aside>People also viewed</aside>
      </body></html>
    `, 'https://www.linkedin.com/posts/openai_example');

    expect(adapter?.id).toBe('linkedin');
    expect(markdown).toContain('applied AI deployment story');
    expect(markdown).not.toContain('People also viewed');
  });

  it('识别 LessWrong 和 OpenReview 论文/长文页面', async () => {
    const lessWrong = await extract(`
      <html><head><title>AI alignment post</title></head><body><article><p>Long-form alignment analysis with concrete arguments.</p></article></body></html>
    `, 'https://www.lesswrong.com/posts/example');
    expect(lessWrong.adapter?.id).toBe('lesswrong');
    expect(lessWrong.markdown).toContain('alignment analysis');

    const openReview = await extract(`
      <html><head><title>OpenReview paper</title></head><body><main><div class="note_content"><h2>Abstract</h2><p>This submission studies transformer scaling.</p></div></main></body></html>
    `, 'https://openreview.net/forum?id=example');
    expect(openReview.adapter?.id).toBe('openreview');
    expect(openReview.markdown).toContain('transformer scaling');
  });
});
