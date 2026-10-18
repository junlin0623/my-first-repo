import fs from 'node:fs';
import path from 'node:path';
import { zipSync } from 'fflate';
import { MEDIA_DIR } from '@/lib/legacy';
import { publishPackage } from '@/lib/publish';

// All 小红书 cards of one draft as a zip, in upload order.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const pkg = publishPackage(Number((await params).id));
  if (!pkg) return new Response('Not found', { status: 404 });
  const files = Object.fromEntries(
    pkg.xhs.cards.map((n) => [n, new Uint8Array(fs.readFileSync(path.join(MEDIA_DIR, pkg.draft.code, n)))]),
  );
  const name = encodeURIComponent(`${pkg.draft.code}-小红书卡片.zip`);
  return new Response(zipSync(files, { level: 0 }), {
    headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename*=UTF-8''${name}` },
  });
}
