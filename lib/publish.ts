import { getKv } from './db';
import { getDraft } from './drafts';
import { draftImages } from './legacy';
import { mpHtml, splitMp } from './mp-html';
import { palette } from './palettes';
import { getBrand } from './prompt';

// Everything needed to post one draft by hand.
export function publishPackage(id: number) {
  const d = getDraft(id);
  if (!d) return undefined;
  const b = getBrand();
  const mp = splitMp(d.mp);
  const html = d.mpHtml || mpHtml(d.mp, d.sources, palette(getKv('palette')), b, d.code);
  const images = draftImages(d.code);
  const isCover = (n: string) => /公众号|900x383|500x500/.test(n);

  // 小红书 body: the "## 正文" section of the note, plus its hashtags.
  const xhsSection = d.xhs.split(/\n(?=##\s)/).find((s) => /正文/.test(s.split('\n')[0]));
  const xhsBody = (xhsSection ? xhsSection.split('\n').slice(1).join('\n') : d.xhs).trim();
  const tags = [...new Set(d.xhs.match(/#[^\s#]+/g) ?? [])].join(' ');
  const coverTitle = d.xhs.match(/封面标题[^\n]*\n+([\s\S]*?)\n\n/)?.[1]?.trim() ?? '';

  return {
    draft: d,
    mp: { titles: mp.titles.length ? mp.titles : [d.title], summary: mp.summary, html, covers: images.filter(isCover) },
    xhs: { cards: images.filter((n) => !isCover(n)), body: xhsBody.replace(/\n*#[^\s#]+(\s+#[^\s#]+)*\s*$/, '').trim(), tags, coverTitle },
  };
}
