import { defineConfig } from 'wxt';
import { resolve } from 'path';

export default defineConfig({
  alias: {
    '@': resolve(__dirname, './'),
  },
  manifest: {
    name: 'MarkDownload 中文版',
    description: '将网页内容剪藏为 Markdown 文件，专为 Obsidian 用户优化',
    version: '0.2.0',
    permissions: ['activeTab', 'scripting', 'downloads', 'storage'],
    action: {
      default_title: 'MarkDownload',
      default_popup: 'popup.html',
      default_icon: {
        16: 'icon/icon-16.png',
        48: 'icon/icon-48.png',
        128: 'icon/icon-128.png',
      },
    },
    icons: {
      16: 'icon/icon-16.png',
      48: 'icon/icon-48.png',
      128: 'icon/icon-128.png',
    },
    web_accessible_resources: [
      {
        resources: ['extractor.js'],
        matches: ['<all_urls>'],
      },
    ],
  },
});
