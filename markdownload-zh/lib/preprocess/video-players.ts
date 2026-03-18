/**
 * 通用视频播放器过滤
 *
 * 从 extractor.unlisted.ts removeVideoPlayers() 原样迁移
 */

/**
 * 视频播放器选择器（通用）
 */
const VIDEO_PLAYER_SELECTORS = [
  'video',
  '[class*="video-player"]',
  '[class*="player-container"]',
  '[class*="txp_"]',
  '[class*="vcp_"]',
  '[class*="plyr"]',
  '[class*="jw-"]',
  '[class*="flowplayer"]',
];

const POSTER_SELECTOR = 'img[class*="poster"], img[class*="cover"], img[class*="thumbnail"]';

/**
 * 通用视频播放器过滤：移除播放器 UI，保留封面图
 */
export function removeVideoPlayers(doc: Document): void {
  doc.querySelectorAll(VIDEO_PLAYER_SELECTORS.join(', ')).forEach((el) => {
    const poster = el.querySelector(POSTER_SELECTOR);
    if (poster && el.parentElement) {
      const clonedPoster = poster.cloneNode(true) as HTMLImageElement;
      clonedPoster.alt ||= '[视频封面]';
      el.parentElement.insertBefore(clonedPoster, el);
    }
    el.remove();
  });
}
