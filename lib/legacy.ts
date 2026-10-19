import fs from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { drafts, ideas, topics } from './schema';
import { now } from './agent';

export const MEDIA_DIR = path.join(process.cwd(), 'data', 'media');

const read = (p: string) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '');

// Parse one 选题单 markdown file: "## N. title 🔥" followed by "- **label**：value" bullets.
function parseTopicList(md: string, date: string) {
  return md.split(/\n(?=## \d+\. )/).slice(1).map((block) => {
    const head = block.match(/^## (\d+)\. (.+)$/m)!;
    const field = (label: string) => block.match(new RegExp(`\\*\\*${label}\\*\\*：(.+)`))?.[1]?.trim() ?? '';
    const kind = head[2].includes('🔥') ? 'hot' : head[2].includes('🌲') ? 'green' : 'week';
    return {
      date,
      no: Number(head[1]),
      kind: kind as 'hot' | 'week' | 'green',
      title: head[2].replace(/[🔥⏳🌲]/gu, '').trim(),
      what: field('发生了什么'),
      why: field('为什么值得做'),
      angle: field('建议角度'),
      platforms: field('平台'),
      sources: field('来源'),
    };
  });
}

// Import an exported 「AI说人话」-style project folder: content/选题单, content/drafts, content/灵感池.md.
// Safe to run twice: existing topic dates and draft codes are skipped.
export function importLegacy(root: string) {
  const content = fs.existsSync(path.join(root, 'content')) ? path.join(root, 'content') : root;
  if (!fs.existsSync(content)) throw new Error(`找不到文件夹：${root}`);
  const report = { topics: 0, drafts: 0, images: 0, ideas: 0 };

  const listDir = path.join(content, '选题单');
  for (const f of fs.existsSync(listDir) ? fs.readdirSync(listDir) : []) {
    const date = f.match(/(\d{4}-\d{2}-\d{2})\.md$/)?.[1];
    if (!date || db.select().from(topics).where(eq(topics.date, date)).get()) continue;
    for (const t of parseTopicList(read(path.join(listDir, f)), date)) {
      db.insert(topics).values(t).run();
      report.topics++;
    }
  }

  // Titles come from 选题记录.md rows: | date | title（No.001） | platforms | status | drafts/folder |
  const titles = new Map<string, { title: string; code: string }>();
  for (const m of read(path.join(content, '选题记录.md')).matchAll(/^\|\s*\d{4}-\d{2}-\d{2}\s*\|\s*(.+?)（(No\.\d+)）\s*\|.*\|\s*drafts\/([^|\s]+)\s*\|/gm)) {
    titles.set(m[3], { title: m[1].trim(), code: m[2] });
  }

  const draftsDir = path.join(content, 'drafts');
  for (const folder of fs.existsSync(draftsDir) ? fs.readdirSync(draftsDir).sort() : []) {
    const dir = path.join(draftsDir, folder);
    if (!fs.statSync(dir).isDirectory()) continue;
    const meta = titles.get(folder) ?? { title: folder, code: `No.${String(report.drafts + 1).padStart(3, '0')}` };
    if (db.select().from(drafts).where(eq(drafts.code, meta.code)).get()) continue;
    db.insert(drafts)
      .values({
        code: meta.code,
        title: meta.title,
        mp: read(path.join(dir, '公众号.md')),
        xhs: read(path.join(dir, '小红书.md')),
        sources: read(path.join(dir, '来源.md')),
        updatedAt: now(),
      })
      .run();
    report.drafts++;

    const imgDir = path.join(dir, '图片');
    if (fs.existsSync(imgDir)) {
      const out = path.join(MEDIA_DIR, meta.code);
      fs.mkdirSync(out, { recursive: true });
      for (const img of fs.readdirSync(imgDir).filter((n) => /\.(png|jpe?g|webp)$/i.test(n))) {
        fs.copyFileSync(path.join(imgDir, img), path.join(out, img));
        report.images++;
      }
    }
  }

  // 灵感池.md lines: "- date · source · idea · status"
  for (const line of read(path.join(content, '灵感池.md')).split('\n')) {
    const parts = line.replace(/^- /, '').split(' · ');
    if (!line.startsWith('- ') || parts.length < 3) continue;
    db.insert(ideas).values({ text: parts[2], source: parts[1], createdAt: now() }).run();
    report.ideas++;
  }
  return report;
}

export function draftImages(code: string) {
  const dir = path.join(MEDIA_DIR, code);
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => /\.(png|jpe?g|webp)$/i.test(n)).sort() : [];
}
