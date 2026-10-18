'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { agents, brand, connections } from '@/lib/schema';
import { encrypt } from '@/lib/crypto';
import { BRAND_FIELDS } from '@/lib/defaults';
import { SESSION_COOKIE } from '@/lib/session';

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

export async function addConnection(f: FormData) {
  const apiKey = str(f, 'apiKey');
  const kind = str(f, 'kind') === 'anthropic' ? 'anthropic' : 'openai';
  if (!str(f, 'name') || !apiKey) return;
  db.insert(connections)
    .values({
      name: str(f, 'name'),
      kind,
      baseUrl: str(f, 'baseUrl') || null,
      apiKeyEnc: encrypt(apiKey),
      keyHint: apiKey.slice(-4),
    })
    .run();
  revalidatePath('/settings');
}

export async function deleteConnection(f: FormData) {
  const id = Number(f.get('id'));
  db.update(agents).set({ connectionId: null }).where(eq(agents.connectionId, id)).run();
  db.delete(connections).where(eq(connections.id, id)).run();
  revalidatePath('/settings');
}

export async function saveBrand(f: FormData) {
  for (const { key } of BRAND_FIELDS) {
    const value = str(f, key);
    db.insert(brand).values({ key, value }).onConflictDoUpdate({ target: brand.key, set: { value } }).run();
  }
  revalidatePath('/', 'layout');
}

export async function saveAgent(f: FormData) {
  const id = str(f, 'id');
  const conn = str(f, 'connectionId');
  db.update(agents)
    .set({
      prompt: str(f, 'prompt'),
      connectionId: conn ? Number(conn) : null,
      model: str(f, 'model'),
      enabled: f.get('enabled') === 'on',
    })
    .where(eq(agents.id, id))
    .run();
  revalidatePath('/agents');
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect('/login');
}
