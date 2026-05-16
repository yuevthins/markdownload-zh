#!/usr/bin/env npx tsx
/**
 * AI 常用国外站点覆盖测试
 *
 * Public mode: curl + jsdom + MarkDownload pipeline.
 * Logged-in mode: Playwright page HTML for auth-sensitive pages when a browser profile is provided.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';
import { preprocessDOM } from '../lib/preprocess/index';
import { extractContent } from '../lib/extract/index';
import { formatMarkdown } from '../lib/format/index';
import { getSiteAdapter } from '../lib/sites/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'docs/reports');
const silentVirtualConsole = new VirtualConsole();

type Mode = 'public' | 'logged-in';
type Status = 'pass' | 'partial' | 'auth-blocked' | 'unsupported' | 'network-failed' | 'failed';

type Case = {
  id: string;
  group: string;
  label: string;
  url: string;
  expectedAdapter?: string;
  minChars: number;
  required?: string[];
  forbidden?: string[];
  requiresAuth?: boolean;
  rendered?: boolean;
  allowPartial?: boolean;
};

type CaseResult = {
  id: string;
  group: string;
  label: string;
  url: string;
  expectedAdapter?: string;
  adapter?: string;
  status: Status;
  title: string;
  markdownLength: number;
  imageCount: number;
  codeFenceCount: number;
  checks: Record<string, boolean>;
  reason?: string;
};

const CASES: Case[] = [
  // 社交/社区
  { id: 'x-status', group: '社交/社区', label: 'X status', url: 'https://x.com/OpenAI/status/1806338670113976468', expectedAdapter: 'x-twitter', minChars: 40, requiresAuth: true, forbidden: ['Sign in to X', 'Log in'] },
  { id: 'twitter-status', group: '社交/社区', label: 'twitter.com status', url: 'https://twitter.com/OpenAI/status/1806338670113976468', expectedAdapter: 'x-twitter', minChars: 40, requiresAuth: true, forbidden: ['Sign in to X', 'Log in'] },
  { id: 'linkedin-post', group: '社交/社区', label: 'LinkedIn post', url: 'https://www.linkedin.com/company/openai/posts/', expectedAdapter: 'linkedin', minChars: 80, requiresAuth: true, forbidden: ['Sign in', 'Join LinkedIn'] },
  { id: 'linkedin-pulse', group: '社交/社区', label: 'LinkedIn article', url: 'https://www.linkedin.com/pulse/', expectedAdapter: 'linkedin', minChars: 80, requiresAuth: true },
  { id: 'youtube-video', group: '社交/社区', label: 'YouTube video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', expectedAdapter: 'youtube', minChars: 60, required: ['Channel'] },
  { id: 'reddit-post', group: '社交/社区', label: 'Reddit post', url: 'https://www.reddit.com/r/MachineLearning/comments/pw97o1', expectedAdapter: 'reddit', minChars: 80, rendered: true, allowPartial: true },
  { id: 'hn-item', group: '社交/社区', label: 'Hacker News item', url: 'https://news.ycombinator.com/item?id=8863', expectedAdapter: 'hacker-news', minChars: 80 },
  { id: 'lesswrong-post', group: '社交/社区', label: 'LessWrong post', url: 'https://www.lesswrong.com/posts/SwcyMEgLyd4C3Dern/the-ai-revolution-the-road-to-superintelligence', expectedAdapter: 'lesswrong', minChars: 300, required: ['AI'] },
  { id: 'lobsters-story', group: '社交/社区', label: 'Lobsters story', url: 'https://lobste.rs/', expectedAdapter: 'lobsters', minChars: 80, allowPartial: true },
  { id: 'quora-answer', group: '社交/社区', label: 'Quora answer', url: 'https://www.quora.com/What-is-artificial-intelligence', expectedAdapter: 'quora', minChars: 80, allowPartial: true },

  // GitHub/代码协作
  { id: 'github-readme', group: 'GitHub/代码协作', label: 'GitHub README', url: 'https://github.com/openai/openai-cookbook', expectedAdapter: 'github', minChars: 300, required: ['OpenAI'] },
  { id: 'github-issue', group: 'GitHub/代码协作', label: 'GitHub Issue', url: 'https://github.com/openai/openai-python/issues/1', expectedAdapter: 'github', minChars: 80, allowPartial: true },
  { id: 'github-discussion', group: 'GitHub/代码协作', label: 'GitHub Discussion', url: 'https://github.com/openai/openai-cookbook/discussions', expectedAdapter: 'github', minChars: 80, allowPartial: true },
  { id: 'github-release', group: 'GitHub/代码协作', label: 'GitHub Release', url: 'https://github.com/openai/openai-python/releases', expectedAdapter: 'github', minChars: 80 },
  { id: 'github-gist', group: 'GitHub/代码协作', label: 'GitHub Gist', url: 'https://gist.github.com/octocat/6cad326836d38bd3a7ae', expectedAdapter: 'github', minChars: 40, allowPartial: true },
  { id: 'stackoverflow-qa', group: 'GitHub/代码协作', label: 'Stack Overflow Q&A', url: 'https://stackoverflow.com/questions/594266/equation-parsing-in-python', expectedAdapter: 'stackoverflow', minChars: 300 },

  // 研究论文
  { id: 'arxiv-abs', group: '研究论文', label: 'arXiv abs', url: 'https://arxiv.org/abs/1706.03762', expectedAdapter: 'arxiv', minChars: 300, required: ['Transformer'] },
  { id: 'arxiv-html', group: '研究论文', label: 'arXiv HTML', url: 'https://arxiv.org/html/1706.03762', expectedAdapter: 'arxiv', minChars: 500, allowPartial: true },
  { id: 'ar5iv-html', group: '研究论文', label: 'ar5iv HTML', url: 'https://ar5iv.labs.arxiv.org/html/1706.03762', expectedAdapter: 'arxiv', minChars: 500, allowPartial: true },
  { id: 'paperswithcode-paper', group: '研究论文', label: 'Papers with Code paper', url: 'https://paperswithcode.com/paper/attention-is-all-you-need', expectedAdapter: 'paperswithcode', minChars: 200, required: ['Attention'] },
  { id: 'hf-paper', group: '研究论文', label: 'Hugging Face paper', url: 'https://huggingface.co/papers/1706.03762', expectedAdapter: 'huggingface', minChars: 120, required: ['Attention'] },
  { id: 'semantic-scholar', group: '研究论文', label: 'Semantic Scholar', url: 'https://www.semanticscholar.org/paper/Attention-Is-All-You-Need-Vaswani-Shazeer/204e3073870fae3d05bcbc2f6a8e263d9b72e776', expectedAdapter: 'semantic-scholar', minChars: 120, rendered: true, allowPartial: true },
  { id: 'openreview-forum', group: '研究论文', label: 'OpenReview forum', url: 'https://openreview.net/forum?id=VtmBAGCN7o', expectedAdapter: 'openreview', minChars: 120, allowPartial: true },
  { id: 'acl-anthology', group: '研究论文', label: 'ACL Anthology', url: 'https://aclanthology.org/N18-1202/', expectedAdapter: 'acl-anthology', minChars: 200 },
  { id: 'neurips-paper', group: '研究论文', label: 'NeurIPS proceedings', url: 'https://proceedings.neurips.cc/paper/2017/hash/3f5ee243547dee91fbd053c1c4a845aa-Abstract.html', expectedAdapter: 'neurips', minChars: 200 },
  { id: 'alphaxiv-paper', group: '研究论文', label: 'AlphaXiv', url: 'https://www.alphaxiv.org/abs/1706.03762', expectedAdapter: 'alphaxiv', minChars: 120, allowPartial: true },

  // Hugging Face
  { id: 'hf-model', group: 'Hugging Face', label: 'Model page', url: 'https://huggingface.co/openai/gpt-oss-120b', expectedAdapter: 'huggingface', minChars: 120, allowPartial: true },
  { id: 'hf-dataset', group: 'Hugging Face', label: 'Dataset page', url: 'https://huggingface.co/datasets/HuggingFaceH4/ultrachat_200k', expectedAdapter: 'huggingface', minChars: 120, allowPartial: true },
  { id: 'hf-space', group: 'Hugging Face', label: 'Space page', url: 'https://huggingface.co/spaces', expectedAdapter: 'huggingface', minChars: 120, allowPartial: true },
  { id: 'hf-blog', group: 'Hugging Face', label: 'Blog article', url: 'https://huggingface.co/blog', expectedAdapter: 'huggingface', minChars: 120, allowPartial: true },
  { id: 'hf-discussion', group: 'Hugging Face', label: 'Discussion page', url: 'https://huggingface.co/openai/gpt-oss-120b/discussions', expectedAdapter: 'huggingface', minChars: 80, allowPartial: true },

  // AI 官方
  { id: 'openai-blog', group: 'AI 官方', label: 'OpenAI blog/news', url: 'https://openai.com/index/gpt-4o/', expectedAdapter: 'openai', minChars: 120, rendered: true, allowPartial: true },
  { id: 'anthropic-news', group: 'AI 官方', label: 'Anthropic news', url: 'https://www.anthropic.com/news', expectedAdapter: 'anthropic', minChars: 120, allowPartial: true },
  { id: 'anthropic-docs', group: 'AI 官方', label: 'Anthropic docs', url: 'https://docs.anthropic.com/', expectedAdapter: 'anthropic', minChars: 120, allowPartial: true },
  { id: 'deepmind-blog', group: 'AI 官方', label: 'Google DeepMind blog', url: 'https://deepmind.google/discover/blog/', expectedAdapter: 'deepmind', minChars: 120, allowPartial: true },
  { id: 'google-ai-dev', group: 'AI 官方', label: 'Google AI Developers', url: 'https://ai.google.dev/', expectedAdapter: 'google-ai', minChars: 120, allowPartial: true },
  { id: 'meta-ai-blog', group: 'AI 官方', label: 'Meta AI blog', url: 'https://ai.meta.com/blog/', expectedAdapter: 'meta-ai', minChars: 120, allowPartial: true },
  { id: 'mistral-news', group: 'AI 官方', label: 'Mistral news/docs', url: 'https://mistral.ai/news', expectedAdapter: 'mistral', minChars: 120, allowPartial: true },
  { id: 'xai-news', group: 'AI 官方', label: 'xAI news/docs', url: 'https://x.ai/news', expectedAdapter: 'xai', minChars: 120, allowPartial: true },

  // AI 工具/平台
  { id: 'ms-research', group: 'AI 工具/平台', label: 'Microsoft Research blog', url: 'https://www.microsoft.com/en-us/research/blog/', expectedAdapter: 'microsoft-research', minChars: 120, allowPartial: true },
  { id: 'nvidia-blog', group: 'AI 工具/平台', label: 'NVIDIA Technical Blog', url: 'https://developer.nvidia.com/blog/category/generative-ai/', expectedAdapter: 'nvidia-blog', minChars: 120, allowPartial: true },
  { id: 'cohere-docs', group: 'AI 工具/平台', label: 'Cohere docs/blog', url: 'https://docs.cohere.com/', expectedAdapter: 'cohere', minChars: 120, allowPartial: true },
  { id: 'together-docs', group: 'AI 工具/平台', label: 'Together AI docs/blog', url: 'https://docs.together.ai/', expectedAdapter: 'together-ai', minChars: 120, allowPartial: true },
  { id: 'replicate-docs', group: 'AI 工具/平台', label: 'Replicate docs/blog', url: 'https://replicate.com/docs', expectedAdapter: 'replicate', minChars: 120, allowPartial: true },
  { id: 'modal-docs', group: 'AI 工具/平台', label: 'Modal docs/blog', url: 'https://modal.com/docs', expectedAdapter: 'modal', minChars: 120, allowPartial: true },
  { id: 'cloudflare-ai-docs', group: 'AI 工具/平台', label: 'Cloudflare AI docs', url: 'https://developers.cloudflare.com/workers-ai/', expectedAdapter: 'cloudflare-ai', minChars: 120, allowPartial: true },
  { id: 'langchain-docs', group: 'AI 工具/平台', label: 'LangChain docs/blog', url: 'https://docs.langchain.com/', expectedAdapter: 'langchain', minChars: 120, allowPartial: true },
  { id: 'llamaindex-docs', group: 'AI 工具/平台', label: 'LlamaIndex docs/blog', url: 'https://docs.llamaindex.ai/', expectedAdapter: 'llamaindex', minChars: 120, allowPartial: true },
  { id: 'vercel-ai-docs', group: 'AI 工具/平台', label: 'Vercel AI SDK docs', url: 'https://sdk.vercel.ai/docs', expectedAdapter: 'vercel-ai', minChars: 120, allowPartial: true },
  { id: 'cursor-docs', group: 'AI 工具/平台', label: 'Cursor docs/changelog', url: 'https://docs.cursor.com/context/rules', expectedAdapter: 'cursor', minChars: 120, rendered: true, allowPartial: true },

  // 榜单/资讯
  { id: 'openrouter-docs', group: '榜单/资讯', label: 'OpenRouter docs/rankings', url: 'https://openrouter.ai/docs', expectedAdapter: 'openrouter', minChars: 120, allowPartial: true },
  { id: 'lm-arena', group: '榜单/资讯', label: 'LM Arena leaderboard/blog', url: 'https://lmarena.ai/', expectedAdapter: 'lmarena', minChars: 80, allowPartial: true },
  { id: 'artificial-analysis', group: '榜单/资讯', label: 'Artificial Analysis', url: 'https://artificialanalysis.ai/models', expectedAdapter: 'artificial-analysis', minChars: 80, rendered: true, allowPartial: true },
  { id: 'simon-willison', group: '榜单/资讯', label: 'Simon Willison blog', url: 'https://simonwillison.net/', expectedAdapter: 'simon-willison', minChars: 120, allowPartial: true },
  { id: 'latent-space', group: '榜单/资讯', label: 'Latent Space newsletter', url: 'https://www.latent.space/', expectedAdapter: 'latent-space', minChars: 120, allowPartial: true },
  { id: 'interconnects', group: '榜单/资讯', label: 'Interconnects newsletter', url: 'https://www.interconnects.ai/', expectedAdapter: 'interconnects', minChars: 120, allowPartial: true },
  { id: 'the-batch', group: '榜单/资讯', label: 'The Batch', url: 'https://www.deeplearning.ai/the-batch/', expectedAdapter: 'the-batch', minChars: 120, allowPartial: true },
  { id: 'techcrunch-ai', group: '榜单/资讯', label: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/', expectedAdapter: 'techcrunch', minChars: 120, allowPartial: true },
  { id: 'verge-ai', group: '榜单/资讯', label: 'The Verge AI', url: 'https://www.theverge.com/ai-artificial-intelligence', expectedAdapter: 'verge', minChars: 120, allowPartial: true },
  { id: 'ars-ai', group: '榜单/资讯', label: 'Ars Technica AI', url: 'https://arstechnica.com/tag/artificial-intelligence/', expectedAdapter: 'ars', minChars: 120, allowPartial: true },
];

function argValue(name: string, fallback = ''): string {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

function hasArg(name: string): boolean {
  return process.argv.includes(name);
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

function reportFileName(mode: Mode, selectedCount: number): string {
  const date = today();
  if (mode === 'public' && selectedCount === CASES.length) {
    return `ai-sites-coverage-${date}.md`;
  }

  const suffix = selectedCount === CASES.length ? mode : `${mode}-limit${selectedCount}`;
  return `ai-sites-coverage-${date}-${suffix}.md`;
}

function fetchPublicHtml(url: string): string {
  return execFileSync('curl', [
    '-L',
    '--compressed',
    '-s',
    '--max-time',
    '25',
    '-A',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    url,
  ], { encoding: 'utf8', maxBuffer: 25 * 1024 * 1024 });
}

function canUseChromeAppleScript(): boolean {
  if (process.platform !== 'darwin') return false;
  try {
    return execFileSync('osascript', ['-e', 'application "Google Chrome" is running'], { encoding: 'utf8' }).trim() === 'true';
  } catch {
    return false;
  }
}

function fetchChromeAppleScriptHtml(url: string): string {
  const script = `
on run argv
  set targetUrl to item 1 of argv
  tell application "Google Chrome"
    if (count of windows) is 0 then make new window
    set w to front window
    set t to make new tab at end of tabs of w with properties {URL:targetUrl}
    set active tab index of w to (count of tabs of w)
    delay 6
    set html to execute t javascript "document.documentElement.outerHTML"
    close t
    return html
  end tell
end run
`;
  return execFileSync('osascript', ['-e', script, url], {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
    timeout: 70_000,
  });
}

async function availableCdpUrl(): Promise<string> {
  const cdpUrl = (process.env.MARKDOWNLOAD_AI_SITES_CDP_URL || 'http://127.0.0.1:9222').replace(/\/$/, '');
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1_000);
    const response = await fetch(`${cdpUrl}/json/version`, { signal: controller.signal });
    clearTimeout(timeout);
    return response.ok ? cdpUrl : '';
  } catch {
    return '';
  }
}

async function hasLoggedInBrowserSource(): Promise<boolean> {
  return Boolean(process.env.MARKDOWNLOAD_AI_SITES_BROWSER_PROFILE || canUseChromeAppleScript() || await availableCdpUrl());
}

async function fetchBrowserHtml(url: string, useProfile: boolean): Promise<string> {
  const profile = process.env.MARKDOWNLOAD_AI_SITES_BROWSER_PROFILE;
  const { chromium } = await import('playwright');
  if (useProfile) {
    const cdpUrl = await availableCdpUrl();
    if (cdpUrl) {
      const browser = await chromium.connectOverCDP(cdpUrl);
      const context = browser.contexts()[0];
      const page = await context.newPage();
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
        await page.waitForTimeout(4_000);
        return await page.content();
      } finally {
        await page.close().catch(() => undefined);
        await browser.close();
      }
    }

    if (canUseChromeAppleScript()) {
      try {
        return fetchChromeAppleScriptHtml(url);
      } catch (error) {
        if (!profile) throw error;
      }
    }
  }

  if (useProfile && profile) {
    const context = await chromium.launchPersistentContext(profile, { headless: false });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForTimeout(4_000);
    const html = await page.content();
    await context.close();
    return html;
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForTimeout(3_000);
  const html = await page.content();
  await browser.close();
  return html;
}

function blockedReason(html: string, title: string, url = ''): string {
  const sample = `${title}\n${html.slice(0, 6000)}`.toLowerCase();
  if (sample.includes('just a moment') || sample.includes('checking your browser')) return 'cloudflare / bot check';
  if (sample.includes('sign in to x') || sample.includes('log in to x')) return 'x login wall';
  if (
    (url.includes('x.com/') || url.includes('twitter.com/')) &&
    /^x$/i.test(title.trim()) &&
    !sample.includes('data-testid="tweet"') &&
    !sample.includes('tweettext')
  ) return 'x login or javascript shell';
  if (sample.includes('join linkedin') || sample.includes('sign in to linkedin') || sample.includes('linkedin login')) return 'linkedin login wall';
  if (/^linkedin$/i.test(title.trim())) return 'linkedin login shell';
  if (sample.includes('enable javascript') && html.length < 20_000) return 'javascript shell';
  if (sample.includes('access denied') || sample.includes('forbidden')) return 'access denied';
  return '';
}

function clean(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

async function extractCase(testCase: Case, mode: Mode): Promise<CaseResult> {
  if (mode === 'logged-in' && testCase.requiresAuth && !await hasLoggedInBrowserSource()) {
    return baseResult(
      testCase,
      'auth-blocked',
      'no Chrome CDP session or MARKDOWNLOAD_AI_SITES_BROWSER_PROFILE configured',
      getSiteAdapter(testCase.url)?.id
    );
  }

  let html = '';
  try {
    html = mode === 'logged-in' && testCase.requiresAuth
      ? await fetchBrowserHtml(testCase.url, true)
      : testCase.rendered
        ? await fetchBrowserHtml(testCase.url, false)
      : fetchPublicHtml(testCase.url);
  } catch (error) {
    return baseResult(testCase, 'network-failed', error instanceof Error ? error.message : String(error));
  }

  const dom = new JSDOM(html, { url: testCase.url, virtualConsole: silentVirtualConsole });
  const doc = dom.window.document;
  const adapter = getSiteAdapter(testCase.url, doc);
  const pageTitle = clean(doc.title || '');
  const blocked = blockedReason(html, pageTitle, testCase.url);

  if (blocked && testCase.requiresAuth) {
    return baseResult(testCase, 'auth-blocked', blocked, adapter?.id, pageTitle);
  }
  if (blocked) {
    return baseResult(testCase, 'network-failed', blocked, adapter?.id, pageTitle);
  }

  try {
    await preprocessDOM(doc, testCase.url, adapter);
    const extracted = await extractContent(doc, testCase.url, adapter);
    const markdown = formatMarkdown(extracted?.markdown || '');
    const title = clean(extracted?.title || pageTitle || '');
    const plain = clean(markdown.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[[^\]]+\]\([^)]*\)/g, ' '));

    const checks: Record<string, boolean> = {
      adapter: !testCase.expectedAdapter || adapter?.id === testCase.expectedAdapter,
      title: Boolean(title) && !/^(x|twitter|linkedin|youtube)$/i.test(title) && !blockedReason('', title),
      minChars: markdown.length >= testCase.minChars,
      required: (testCase.required || []).every((needle) => plain.includes(needle) || markdown.includes(needle)),
      forbidden: (testCase.forbidden || []).every((needle) => !plain.includes(needle) && !markdown.includes(needle)),
      notBlocked: !blocked,
    };

    const status: Status = Object.values(checks).every(Boolean)
      ? 'pass'
      : testCase.allowPartial && extracted && markdown.length > 0
        ? 'partial'
        : adapter ? 'failed' : 'unsupported';

    return {
      id: testCase.id,
      group: testCase.group,
      label: testCase.label,
      url: testCase.url,
      expectedAdapter: testCase.expectedAdapter,
      adapter: adapter?.id,
      status,
      title,
      markdownLength: markdown.length,
      imageCount: (markdown.match(/!\[/g) || []).length,
      codeFenceCount: (markdown.match(/```/g) || []).length,
      checks,
      reason: status === 'pass' ? undefined : failedChecks(checks),
    };
  } catch (error) {
    return baseResult(testCase, 'failed', error instanceof Error ? error.message : String(error), adapter?.id, pageTitle);
  }
}

function failedChecks(checks: Record<string, boolean>): string {
  return Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([name]) => name)
    .join(', ');
}

function baseResult(testCase: Case, status: Status, reason: string, adapter?: string, title = ''): CaseResult {
  return {
    id: testCase.id,
    group: testCase.group,
    label: testCase.label,
    url: testCase.url,
    expectedAdapter: testCase.expectedAdapter,
    adapter,
    status,
    title,
    markdownLength: 0,
    imageCount: 0,
    codeFenceCount: 0,
    checks: {},
    reason,
  };
}

function markdownReport(results: CaseResult[], mode: Mode): string {
  const counts = results.reduce<Record<string, number>>((acc, result) => {
    acc[result.status] = (acc[result.status] || 0) + 1;
    return acc;
  }, {});
  const lines = [
    `# AI 常用站点覆盖报告 ${today()}`,
    '',
    `- Mode: \`${mode}\``,
    `- Total: ${results.length}`,
    `- Pass: ${counts.pass || 0}`,
    `- Partial: ${counts.partial || 0}`,
    `- Auth-blocked: ${counts['auth-blocked'] || 0}`,
    `- Unsupported: ${counts.unsupported || 0}`,
    `- Network-failed: ${counts['network-failed'] || 0}`,
    `- Failed: ${counts.failed || 0}`,
    '',
    '| Status | Group | Case | Adapter | Chars | Images | Code | URL | Reason |',
    '|---|---|---|---:|---:|---:|---:|---|---|',
  ];

  for (const result of results) {
    lines.push([
      result.status,
      result.group,
      result.label,
      result.adapter || '',
      String(result.markdownLength),
      String(result.imageCount),
      String(result.codeFenceCount),
      result.url,
      result.reason || '',
    ].map((cell) => String(cell).replace(/\|/g, '\\|')).join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }

  lines.push('', '## Notes', '');
  lines.push('- `auth-blocked` means the page requires an authenticated browser session and was not counted as pass in public mode.');
  lines.push('- `partial` means MarkDownload extracted usable content, but one strict acceptance check was not satisfied on the live page.');
  lines.push('- Logged-in mode can use Chrome CDP, macOS Chrome AppleScript, or `MARKDOWNLOAD_AI_SITES_BROWSER_PROFILE`; credentials are never printed.');
  lines.push('- No cookies, tokens, or browser storage are written to this report.');
  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const mode = (argValue('--mode', 'public') as Mode) || 'public';
  const limit = Number(argValue('--limit', '0')) || CASES.length;
  const strict = hasArg('--strict');
  const selected = CASES.slice(0, limit);
  const results: CaseResult[] = [];

  for (const testCase of selected) {
    const result = await extractCase(testCase, mode);
    results.push(result);
    console.log(`${result.status.padEnd(14)} ${testCase.id.padEnd(24)} ${result.adapter || '-'} ${result.markdownLength}`);
  }

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const reportPath = path.join(REPORT_DIR, reportFileName(mode, selected.length));
  fs.writeFileSync(reportPath, markdownReport(results, mode), 'utf8');

  const counts = results.reduce<Record<string, number>>((acc, result) => {
    acc[result.status] = (acc[result.status] || 0) + 1;
    return acc;
  }, {});
  console.log(JSON.stringify({ mode, reportPath, total: results.length, counts }, null, 2));

  if (strict && results.some((result) => result.status === 'failed' || result.status === 'unsupported')) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
