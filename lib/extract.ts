// Turn an uploaded file or a link into plain text an agent can read.
const LIMIT = 30000; // characters handed to the model

export type Extracted = { name: string; text: string; image?: { data: Uint8Array; mediaType: string } };

export async function extractFile(file: File): Promise<Extracted> {
  const name = file.name;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (file.type.startsWith('image/')) return { name, text: '', image: { data: bytes, mediaType: file.type } };
  if (ext === 'pdf') {
    const { extractText } = await import('unpdf');
    const { text } = await extractText(bytes, { mergePages: true });
    return { name, text: text.slice(0, LIMIT) };
  }
  if (ext === 'docx') {
    const mammoth = await import('mammoth');
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return { name, text: value.slice(0, LIMIT) };
  }
  if (['md', 'markdown', 'txt', 'csv', 'html', 'htm'].includes(ext)) {
    return { name, text: new TextDecoder().decode(bytes).slice(0, LIMIT) };
  }
  throw new Error(`暂不支持 .${ext} 文件，可以用 PDF、Word(.docx)、Markdown、TXT 或图片`);
}

export async function extractUrl(url: string): Promise<Extracted> {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (workbench)' }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`打不开这个链接（HTTP ${res.status}）`);
  const html = await res.text();
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? url;
  const text = html
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { name: title, text: text.slice(0, LIMIT) };
}

export const findUrls = (s: string) => s.match(/https?:\/\/[^\s，。、）)]+/g) ?? [];
