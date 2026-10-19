import { getKv } from './db';

// Read the RSS / Atom feeds listed in 设置 → 信息源 and return recent items as text for the scout.
const strip = (s = '') => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
const tag = (block: string, name: string) => block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1];

export function newsSources() {
  return getKv('sources').split('\n').map((s) => s.trim()).filter((s) => /^https?:\/\//.test(s));
}

export async function fetchNews(maxAgeHours = 36) {
  const since = Date.now() - maxAgeHours * 3600 * 1000;
  const items: string[] = [];
  const errors: string[] = [];
  for (const url of newsSources()) {
    try {
      const xml = await (await fetch(url, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'Mozilla/5.0 (workbench)' } })).text();
      const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/g) ?? [];
      for (const b of blocks.slice(0, 15)) {
        const when = Date.parse(strip(tag(b, 'pubDate') ?? tag(b, 'updated') ?? tag(b, 'published') ?? ''));
        if (!Number.isNaN(when) && when < since) continue;
        const link = strip(tag(b, 'link')) || b.match(/<link[^>]*href="([^"]+)"/)?.[1] || '';
        const summary = strip(tag(b, 'description') ?? tag(b, 'summary') ?? '').slice(0, 200);
        items.push(`- ${strip(tag(b, 'title'))}｜${link}${summary ? `｜${summary}` : ''}`);
      }
    } catch (e) {
      errors.push(`${url}：${e instanceof Error ? e.message : e}`);
    }
  }
  return { text: items.slice(0, 60).join('\n'), count: items.length, errors };
}
