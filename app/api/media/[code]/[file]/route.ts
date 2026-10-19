import fs from 'node:fs';
import path from 'node:path';
import { MEDIA_DIR } from '@/lib/legacy';

const TYPES: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

// Serves draft images from data/media/<code>/<file>. Behind the login proxy.
export async function GET(_req: Request, { params }: { params: Promise<{ code: string; file: string }> }) {
  const { code, file } = await params;
  const p = path.join(MEDIA_DIR, path.basename(code), path.basename(file));
  const type = TYPES[path.extname(p).toLowerCase()];
  if (!type || !fs.existsSync(p)) return new Response('Not found', { status: 404 });
  return new Response(fs.readFileSync(p), { headers: { 'Content-Type': type, 'Cache-Control': 'private, max-age=3600' } });
}
