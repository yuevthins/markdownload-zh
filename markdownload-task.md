# 任务：优化 MarkDownload 插件支持更多网站

优化 `/Volumes/BigCongCong/SynologyDrive/于文聪的Claude code文件夹/16Markdown 下载插件/markdownload-zh-extension` 中的浏览器扩展，扩展其网站适配能力。

## 目标

让插件能更好地提取以下类型网站的文章内容，在 `extractor.js` 的网站清理函数中添加适配规则。

## 需要支持的常见网站（100个）

### 中文技术社区（20个）
1. 掘金 (juejin.cn)
2. 简书 (jianshu.com)
3. 开源中国 (oschina.net)
4. SegmentFault (segmentfault.com)
5. 51CTO (51cto.com)
6. InfoQ中文 (infoq.cn)
7. V2EX (v2ex.com)
8. 极客时间 (geektime.org)
9. 慕课网 (imooc.com)
10. 牛客网 (nowcoder.com)
11. LeetCode中文 (leetcode.cn)
12. 思否 (segmentfault.com)
13. Ruby China (ruby-china.org)
14. Laravel China (learnku.com)
15. 掘金小册 (juejin.cn/book)
16. 阿里云开发者社区 (developer.aliyun.com)
17. 腾讯云开发者社区 (cloud.tencent.com/developer)
18. 华为云开发者 (huaweicloud.com)
19. 字节跳动技术博客 (tech.bytedance.com)
20. 美团技术博客 (tech.meituan.com)

### 中文内容平台（20个）
21. 豆瓣日记/文章 (douban.com)
22. 少数派 (sspai.com)
23. 36氪 (36kr.com)
24. 虎嗅 (huxiu.com)
25. 钛媒体 (tmtpost.com)
26. 品玩 (pingwest.com)
27. 爱范儿 (ifanr.com)
28. 今日头条 (toutiao.com)
29. 百度百家号 (baijiahao.baidu.com)
30. 网易新闻 (163.com)
31. 新浪新闻 (sina.com.cn)
32. 凤凰网 (ifeng.com)
33. 澎湃新闻 (thepaper.cn)
34. 界面新闻 (jiemian.com)
35. 观察者网 (guancha.cn)
36. 第一财经 (yicai.com)
37. 财新网 (caixin.com)
38. 搜狐 (sohu.com)
39. 腾讯新闻 (news.qq.com) - 已支持，优化
40. 微信公众号 (mp.weixin.qq.com) - 已支持，优化

### 国际技术社区（20个）
41. Medium (medium.com)
42. Dev.to (dev.to)
43. Hacker News (news.ycombinator.com)
44. Stack Overflow (stackoverflow.com)
45. GitHub README/Issues (github.com)
46. GitLab (gitlab.com)
47. Hashnode (hashnode.dev)
48. freeCodeCamp (freecodecamp.org)
49. CSS-Tricks (css-tricks.com)
50. Smashing Magazine (smashingmagazine.com)
51. A List Apart (alistapart.com)
52. SitePoint (sitepoint.com)
53. Scotch.io (scotch.io)
54. LogRocket Blog (blog.logrocket.com)
55. Auth0 Blog (auth0.com/blog)
56. DigitalOcean Community (digitalocean.com/community)
57. Twilio Blog (twilio.com/blog)
58. Lobsters (lobste.rs)
59. Indie Hackers (indiehackers.com)
60. Product Hunt (producthunt.com)

### 国际新闻媒体（20个）
61. The Verge (theverge.com)
62. TechCrunch (techcrunch.com)
63. Ars Technica (arstechnica.com)
64. Wired (wired.com)
65. Engadget (engadget.com)
66. The Next Web (thenextweb.com)
67. VentureBeat (venturebeat.com)
68. BBC News (bbc.com)
69. CNN (cnn.com)
70. The Guardian (theguardian.com)
71. New York Times (nytimes.com)
72. Washington Post (washingtonpost.com)
73. Reuters (reuters.com)
74. Bloomberg (bloomberg.com)
75. Forbes (forbes.com)
76. Business Insider (businessinsider.com)
77. The Economist (economist.com)
78. Financial Times (ft.com)
79. Wall Street Journal (wsj.com)
80. MIT Technology Review (technologyreview.com)

### 知识/文档平台（20个）
81. Wikipedia (wikipedia.org)
82. MDN Web Docs (developer.mozilla.org)
83. W3Schools (w3schools.com)
84. Quora (quora.com)
85. Substack (substack.com)
86. Notion公开页面 (notion.site)
87. Read the Docs (readthedocs.io)
88. GitBook (gitbook.io)
89. Docusaurus站点 (通用模式)
90. VuePress/VitePress站点 (通用模式)
91. MkDocs站点 (通用模式)
92. Confluence公开页面 (atlassian.net)
93. Zendesk帮助文档 (zendesk.com)
94. Intercom帮助文档 (intercom.help)
95. HelpScout文档 (docs.helpscout.com)
96. Freshdesk帮助 (freshdesk.com)
97. 语雀公开文档 (yuque.com)
98. 飞书文档公开页 (feishu.cn)
99. 石墨文档公开页 (shimo.im)
100. Craft公开文档 (craft.do)

## 技术要求

1. 修改 `extractor.js` 源码（需要先找到或重建源码，因为现有文件是打包后的）
2. 在网站清理函数中添加各网站的特定规则
3. 处理懒加载图片的各种方案
4. 移除广告、推荐、评论、侧边栏等无关内容
5. 保留文章主体内容完整性
6. 正确处理代码块、表格、图片等元素

## 实现策略

1. 按网站域名匹配，添加对应的清理规则
2. 定义文章内容选择器和垃圾元素选择器
3. 相似网站（如各类技术博客）可共用相同策略
4. 为特殊网站添加专门处理逻辑

## 约束

- 不破坏现有功能
- 保持代码可维护性和可读性
- 每个网站适配有清晰注释

## 不在范围内

- 需要登录的内容
- 付费/会员内容
- 无限滚动动态加载内容
