// Card renderer, ported from the 开号包 render.mjs: same layouts, colors from the chosen palette,
// brand name from settings. Renders with the system Chrome via playwright-core.
import fs from 'node:fs';
import path from 'node:path';
import type { Palette } from './palettes';

export type SpecItem = { template: keyof ReturnType<typeof templates>; file: string; data?: Record<string, unknown> };

const CN = `'Noto Sans SC',sans-serif`, MONO = `'JetBrains Mono',monospace`, LAT = `'Space Grotesk','Noto Sans SC',sans-serif`;
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export type BrandText = { name: string; catchphrase: string; follow: string };

function templates(S: Palette, b: BrandText) {
  const GRAD = `linear-gradient(90deg, ${S.a1}, ${S.a2})`;
  const GT = `background:${GRAD};-webkit-background-clip:text;background-clip:text;color:transparent`;
  // 【】 -> accent gradient, **x** -> bold title color
  const hl = (t: unknown) =>
    esc(t).replace(/【(.+?)】/g, `<span style="${GT}">$1</span>`).replace(/\*\*(.+?)\*\*/g, `<b style="color:${S.text};font-weight:700">$1</b>`).replace(/\n/g, '<br>');

  let gid = 0;
  // Symbol: cut-corner speech bubble + sound wave
  const mark = (size: number, { stroke = 6, mono }: { stroke?: number; mono?: string } = {}) => {
    const g = `g${gid++}`, paint = mono || `url(#${g})`;
    const P = 'M20 12 H80 L90 22 V60 L80 70 H42 L26 86 V70 H20 L10 60 V22 Z';
    return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" style="display:block;overflow:visible">
  <defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${S.a1}"/><stop offset="1" stop-color="${S.a2}"/></linearGradient>
  <filter id="f${g}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.5"/></filter></defs>
  ${mono ? '' : `<g filter="url(#f${g})" opacity=".55"><path d="${P}" fill="none" stroke="${paint}" stroke-width="${stroke}"/></g>`}
  <path d="${P}" fill="none" stroke="${paint}" stroke-width="${stroke}"/>
  ${[[30, 12], [41, 26], [52, 18], [63, 30], [74, 14]].map(([x, h]) => `<rect x="${x - 2.75}" y="${41 - h / 2}" width="5.5" height="${h}" fill="${paint}"/>`).join('')}
</svg>`;
  };
  const wordmark = (px: number, color = S.text) =>
    `<div style="font-family:${LAT};font-weight:700;color:${color};letter-spacing:${px * 0.06}px;line-height:1;font-size:${px}px">${esc(b.name)}</div>`;
  const brand = (m: number, w: number) => `<div style="display:flex;align-items:center;gap:${w * 0.55}px">${mark(m, { stroke: 7 })}${wordmark(w)}</div>`;
  const label = (t: unknown, px: number) => `<span style="font-family:${MONO};font-size:${px}px;letter-spacing:${px * 0.1}px;color:${S.muted}"><span style="${GT}">●</span>&nbsp; ${esc(t)}</span>`;
  const bgLayer = (w: number, h: number, { gx = 85, gy = 10, grid = 60, glow = 1 } = {}) => `
  <div style="position:absolute;inset:0;background:${S.bg}"></div>
  <div style="position:absolute;inset:0;background-image:linear-gradient(${S.line} 1px,transparent 1px),linear-gradient(90deg,${S.line} 1px,transparent 1px);background-size:${grid}px ${grid}px;-webkit-mask-image:radial-gradient(ellipse at ${gx}% ${gy}%,#000 0%,transparent 70%)"></div>
  <div style="position:absolute;inset:0;opacity:${glow};background:radial-gradient(ellipse ${w * 0.9}px ${h * 0.55}px at ${gx}% ${gy}%, ${S.a2}38, transparent 70%)"></div>
  <div style="position:absolute;inset:0;opacity:${glow};background:radial-gradient(ellipse ${w * 0.6}px ${h * 0.4}px at ${100 - gx}% ${110 - gy}%, ${S.a1}14, transparent 70%)"></div>`;
  const footer = (pad = 40) => `<div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid ${S.hair};padding-top:${pad}px">
  ${brand(62, 38)}<div style="font-family:${MONO};font-size:24px;color:${S.muted};letter-spacing:2px">AI-ASSISTED</div></div>`;
  type D = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

  return {
    xhsCover: (d: D) => [1242, 1656, `${bgLayer(1242, 1656, { gx: 90, gy: 8 })}
    <div style="position:absolute;right:-180px;bottom:180px;opacity:.07">${mark(820, { stroke: 1.2 })}</div>
    <div style="position:absolute;inset:0;padding:96px 92px 88px;display:flex;flex-direction:column">
      <div style="display:flex;justify-content:space-between">${label(d.tag, 30)}<span style="font-family:${MONO};font-size:30px;letter-spacing:3px;color:${S.muted}">${esc(d.no)}</span></div>
      <div style="height:1px;background:linear-gradient(90deg,${S.a1}88,transparent);margin-top:30px"></div>
      <div style="margin-top:150px;font-size:${d.titleSize || 136}px;line-height:1.16;font-weight:900;color:${S.text};letter-spacing:-1px">${hl(d.title)}</div>
      <div style="margin-top:56px;font-size:46px;line-height:1.6;color:${S.muted};max-width:900px">${hl(d.sub)}</div>
      <div style="flex:1"></div>${footer()}</div>`],
    xhsPage: (d: D) => [1242, 1656, `${bgLayer(1242, 1656, { gx: 100, gy: 0, grid: 60, glow: 0.55 })}
    <div style="position:absolute;inset:0;padding:96px 92px 88px;display:flex;flex-direction:column">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-family:${MONO};font-size:34px;font-weight:600;letter-spacing:3px;${GT}">${esc(d.num)}</span>
        <span style="font-family:${MONO};font-size:26px;letter-spacing:2px;color:${S.muted}">${esc(d.series)}</span></div>
      <div style="height:1px;background:linear-gradient(90deg,${S.a1}88,transparent);margin-top:30px"></div>
      <div style="margin-top:72px;font-size:${d.headingSize || 84}px;line-height:1.25;font-weight:900;color:${S.text}">${hl(d.heading)}</div>
      <div style="margin-top:56px;font-size:46px;line-height:1.72;color:${S.body}">
        ${((d.points as string[]) || []).map((p) => `<div style="display:flex;gap:28px;margin-bottom:34px"><div style="flex:none;width:10px;height:10px;margin-top:30px;background:${GRAD}"></div><div>${hl(p)}</div></div>`).join('')}</div>
      ${d.plain ? `<div style="position:relative;margin-top:14px;padding:2px;background:${GRAD};border-radius:20px"><div style="background:${S.bg2};border-radius:18px;padding:38px 44px;font-size:46px;line-height:1.6;color:${S.text};font-weight:700">
        <div style="font-family:${MONO};font-size:24px;letter-spacing:3px;margin-bottom:12px;${GT}">${esc(b.catchphrase)} / PLAIN TALK</div>${hl(d.plain)}</div></div>` : ''}
      <div style="flex:1"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid ${S.hair};padding-top:36px">
        <div style="font-family:${MONO};font-size:24px;color:${S.muted};max-width:760px">${d.source ? 'SOURCE · ' + esc(d.source) : ''}</div>${brand(48, 30)}</div>
    </div>`],
    xhsEnd: (d: D) => [1242, 1656, `${bgLayer(1242, 1656, { gx: 15, gy: 95 })}
    <div style="position:absolute;inset:0;padding:110px 92px 88px;display:flex;flex-direction:column">
      ${label('SUMMARY', 28)}
      <div style="margin-top:40px;font-size:112px;font-weight:900;line-height:1.1;${GT}">${esc(d.heading || b.catchphrase + '总结')}</div>
      <div style="margin-top:84px">${((d.points as string[]) || []).map((p, i) => `<div style="display:flex;gap:40px;padding:38px 0;border-top:1px solid ${S.hair}">
        <div style="flex:none;font-family:${MONO};font-size:44px;font-weight:600;${GT};padding-top:8px">0${i + 1}</div>
        <div style="font-size:50px;line-height:1.5;color:${S.text};font-weight:700">${hl(p)}</div></div>`).join('')}</div>
      <div style="flex:1"></div>
      <div style="font-size:48px;line-height:1.6;color:${S.body}">${hl(d.question || '你怎么看？评论区聊聊')}</div>
      <div style="margin-top:64px;display:flex;justify-content:space-between;align-items:center">
        ${brand(72, 44)}
        <div style="padding:2px;background:${GRAD};border-radius:60px"><div style="background:${S.bg};border-radius:58px;padding:22px 44px;font-size:38px;font-weight:700;color:${S.text}">${esc(d.follow || b.follow)}</div></div></div>
      <div style="margin-top:44px;font-family:${MONO};font-size:22px;color:${S.muted};letter-spacing:1px">本内容由 AI 辅助创作，事实与观点经人工核对</div>
    </div>`],
    mpCover: (d: D) => [900, 383, `${bgLayer(900, 383, { gx: 88, gy: 30, grid: 32 })}
    <div style="position:absolute;right:40px;top:50%;transform:translateY(-50%)">${mark(230, { stroke: 2.2 })}</div>
    <div style="position:absolute;left:56px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;width:600px">
      <div>${label(d.tag + (d.no ? '  /  ' + d.no : ''), 15)}</div>
      <div style="margin-top:22px;font-size:${d.titleSize || 50}px;line-height:1.22;font-weight:900;color:${S.text}">${hl(d.title)}</div>
      <div style="margin-top:20px;display:flex;align-items:center;gap:10px">${mark(22, { stroke: 8 })}${wordmark(17, S.muted)}</div></div>`],
    mpSquare: (d: D) => [500, 500, `${bgLayer(500, 500, { gx: 80, gy: 15, grid: 30 })}
    <div style="position:absolute;inset:0;padding:48px;display:flex;flex-direction:column">
      ${label(d.tag, 16)}
      <div style="margin-top:auto;font-size:${d.titleSize || 52}px;line-height:1.22;font-weight:900;color:${S.text}">${hl(d.title)}</div>
      <div style="margin-top:28px;display:flex;align-items:center;gap:10px">${mark(26, { stroke: 8 })}${wordmark(19, S.muted)}</div></div>`],
  } as const;
}

export const TEMPLATE_NAMES = ['xhsCover', 'xhsPage', 'xhsEnd', 'mpCover', 'mpSquare'] as const;

const FONTS = 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&family=Space+Grotesk:wght@700&family=JetBrains+Mono:wght@400;600&display=block';
const wrap = (w: number, h: number, inner: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}"><style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:${w}px;height:${h}px;overflow:hidden;background:#000}body{font-family:${CN};-webkit-font-smoothing:antialiased}</style></head><body><div style="position:relative;width:${w}px;height:${h}px;overflow:hidden">${inner}</div></body></html>`;

export async function renderSpec(spec: SpecItem[], outDir: string, pal: Palette, b: BrandText) {
  const { chromium } = await import('playwright-core');
  fs.mkdirSync(outDir, { recursive: true });
  const T = templates(pal, b);
  // System Chrome first; set CHROME_PATH to use another Chromium.
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' });
  try {
    for (const item of spec) {
      const make = T[item.template];
      if (!make) continue;
      const [w, h, inner] = make(item.data || {}) as [number, number, string];
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      await page.setContent(wrap(w, h, inner), { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(outDir, path.basename(item.file)) });
      await page.close();
    }
  } finally {
    await browser.close();
  }
}
