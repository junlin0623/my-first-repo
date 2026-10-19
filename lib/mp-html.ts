// 公众号 layout: turns the draft's markdown into inline-styled HTML that survives
// copy-paste into the WeChat editor. Same structure as the 开号包 排版模板.
import { marked, type Token, type Tokens } from 'marked';
import type { Palette } from './palettes';

type Brand = Record<string, string>;

// The 公众号 field holds titles, summary and body; pull them apart.
export function splitMp(md: string) {
  const sections = md.split(/\n(?=##\s)/);
  const find = (re: RegExp) => sections.find((s) => re.test(s.split('\n')[0]));
  const body = (s?: string) => (s ? s.split('\n').slice(1).join('\n').trim() : '');
  const titles = body(find(/标题/)).split('\n').map((l) => l.replace(/^\s*\d+[.、]\s*/, '').trim()).filter(Boolean);
  const summary = body(find(/摘要/)).split('\n').find((l) => l.trim() && !l.startsWith('---'))?.trim() ?? '';
  const main = find(/正文/);
  const text = main ? md.slice(md.indexOf(main) + main.split('\n')[0].length) : md;
  const column = md.match(/栏目[：:]\s*(.+)/)?.[1]?.trim() ?? '';
  return { titles, summary, body: text.trim(), column };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function mpHtml(md: string, sources: string, p: Palette, b: Brand, code: string) {
  const { summary, body, column } = splitMp(md);
  const MONO = 'font-family:Menlo,monospace;';
  const catch_ = b.catchphrase || '划重点';
  const inline = (t: string) =>
    (marked.parseInline(t) as string)
      .replace(/<strong>/g, `<strong style="color:${p.mp};">`)
      .replace(/<a [^>]*>(.*?)<\/a>/g, '$1'); // WeChat drops external links

  // 「【说人话】…」 or 「**说人话**：…」 (as a paragraph or a quote) becomes the highlight card.
  const plainOf = (text: string) => {
    const m = text.match(/^【(.+?)】\s*([\s\S]+)$/) ?? text.match(/^\*\*(.+?)\*\*[：:]\s*([\s\S]+)$/);
    return m && (m[1] === catch_ || text.startsWith('【')) ? m[2] : null;
  };
  const plainCard = (t: string) =>
    `<section style="background:${p.bg2 === '#FFFFFF' ? '#1F2433' : p.bg2};padding:14px 16px;margin:0 0 24px;border-left:3px solid ${p.a2};"><p style="margin:0 0 4px;font-size:11px;letter-spacing:2px;color:${p.a2};${MONO}">${esc(catch_)} / PLAIN TALK</p><p style="margin:0;font-size:15px;line-height:1.8;color:#F3F5FF;font-weight:bold;">${inline(t)}</p></section>`;

  let n = 0;
  let inSummary = false;
  const out: string[] = [];
  const summaryItems: string[] = [];

  const walk = (tokens: Token[]) => {
    for (const t of tokens) {
      if (t.type === 'heading') {
        const text = (t as Tokens.Heading).text.replace(/^\d+\s*[—-]+\s*/, '');
        inSummary = /总结/.test(text);
        if (inSummary) continue;
        n++;
        out.push(`<h2 style="margin:40px 0 18px;font-size:19px;line-height:1.5;color:#0B0E1C;font-weight:bold;"><span style="display:block;font-size:12px;letter-spacing:2px;color:${p.mp};${MONO}font-weight:normal;margin-bottom:4px;">${String(n).padStart(2, '0')} ——</span>${inline(text)}</h2>`);
      } else if (t.type === 'paragraph') {
        const text = (t as Tokens.Paragraph).text;
        const plain = plainOf(text);
        if (plain) {
          out.push(plainCard(plain));
        } else if (inSummary) {
          summaryItems.push(inline(text));
        } else {
          out.push(`<p style="margin:0 0 20px;">${inline(text)}</p>`);
        }
      } else if (t.type === 'list') {
        const items = (t as Tokens.List).items.map((i) => inline(i.text));
        if (inSummary) summaryItems.push(...items);
        else out.push(...items.map((i) => `<p style="margin:0 0 12px;padding-left:14px;">· ${i}</p>`));
      } else if (t.type === 'blockquote') {
        const plain = plainOf((t as Tokens.Blockquote).text.trim());
        if (plain) {
          out.push(plainCard(plain));
          continue;
        }
        out.push(`<section style="margin:0 0 24px;padding:0 0 0 14px;border-left:2px solid #D6D9E6;color:#6B7186;font-size:15px;"><p style="margin:0;">${inline((t as Tokens.Blockquote).text)}</p></section>`);
      } else if (t.type === 'table') {
        const tb = t as Tokens.Table;
        const cell = (c: Tokens.TableCell, th = false) => `<td style="padding:8px 10px;border:1px solid #E3E5EF;font-size:14px;${th ? 'font-weight:bold;background:#F5F6FA;' : ''}">${inline(c.text)}</td>`;
        out.push(`<table style="width:100%;border-collapse:collapse;margin:0 0 24px;"><tr>${tb.header.map((c) => cell(c, true)).join('')}</tr>${tb.rows.map((r) => `<tr>${r.map((c) => cell(c)).join('')}</tr>`).join('')}</table>`);
      }
    }
  };
  walk(marked.lexer(body));

  const srcLines = sources
    .split('\n')
    .filter((l) => /https?:\/\//.test(l))
    .slice(0, 12)
    .map((l, i) => `[${i + 1}] ${esc(l.replace(/\|/g, ' ').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim())}`);

  return `<section id="article" style="font-size:16px;line-height:1.85;color:#1F2433;letter-spacing:0.5px;">
<section style="background:${p.bg};padding:22px 20px 20px;margin:0 0 28px;">
<p style="margin:0;font-size:12px;letter-spacing:2px;color:${p.muted};${MONO}"><span style="color:${p.a2};">●</span>&nbsp; ${esc([column, code].filter(Boolean).join(' / '))}</p>
${summary ? `<p style="margin:10px 0 0;font-size:15px;line-height:1.8;color:${p.body};">${inline(summary)}</p>` : ''}
<section style="height:2px;margin-top:16px;background:linear-gradient(90deg,${p.a1},${p.a2});"></section>
</section>
<section style="padding:0 18px;">
${out.join('\n')}
${summaryItems.length ? `<section style="margin:44px 0 0;background:${p.bg};padding:20px 18px 8px;"><p style="margin:0 0 14px;font-size:12px;letter-spacing:2px;color:${p.muted};${MONO}">SUMMARY</p><p style="margin:0 0 16px;font-size:20px;font-weight:bold;color:${p.a2};">${esc(catch_)}总结</p>${summaryItems.map((s, i) => `<p style="margin:0;padding:12px 0;border-top:1px solid ${p.hair};color:${p.text};font-size:15px;"><span style="color:${p.a2};${MONO}">0${i + 1}</span>&nbsp;&nbsp;${s}</p>`).join('')}</section>` : ''}
${srcLines.length ? `<section style="margin:28px 0 0;font-size:12px;line-height:1.8;color:#8A8FA3;"><p style="margin:0 0 6px;letter-spacing:2px;${MONO}">SOURCE</p><p style="margin:0;">${srcLines.join('<br>')}</p></section>` : ''}
<section style="margin:28px 0 0;padding:16px;border:1px solid #E3E5EF;text-align:center;font-size:14px;line-height:1.8;color:#1F2433;">
<p style="margin:0 0 6px;"><strong>${esc(b.name || '')}</strong>${b.positioning ? ` · ${esc(b.positioning)}` : ''}</p>
${b.signoff ? `<p style="margin:0;color:#6B7186;">${esc(b.signoff).replace('在看', `<strong style="color:${p.mp};">在看</strong>`)}</p>` : ''}
</section>
<p style="margin:20px 0 0;font-size:12px;line-height:1.7;color:#A0A4B5;text-align:center;">本文由作者使用 AI 辅助整理撰写，事实与观点已人工核对。</p>
</section>
</section>`;
}
