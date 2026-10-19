import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// API keys are stored encrypted with AES-256-GCM. The key comes from ENCRYPTION_KEY, or is
// generated once into data/secret.key (gitignored) so a fresh install needs no setup.
function key() {
  let raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    const file = path.join(process.cwd(), 'data', 'secret.key');
    if (!fs.existsSync(file)) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, crypto.randomBytes(32).toString('base64'), { mode: 0o600 });
    }
    raw = fs.readFileSync(file, 'utf8').trim();
  }
  return crypto.createHash('sha256').update(raw).digest(); // any string -> 32 bytes
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64')).join('.');
}

export function decrypt(stored: string): string {
  const [iv, tag, data] = stored.split('.').map((s) => Buffer.from(s, 'base64'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
