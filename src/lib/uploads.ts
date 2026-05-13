import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'public', 'uploads');

const ALLOWED = new Map<string, string>([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
]);

const MAX_BYTES = 6 * 1024 * 1024; // 6 MB

export async function saveUploadedImage(file: File): Promise<string> {
  if (!file || !file.size) throw new Error('No file provided');
  if (file.size > MAX_BYTES) throw new Error('Image is too large (6MB max)');
  const ext = ALLOWED.get(file.type);
  if (!ext) throw new Error(`Unsupported file type: ${file.type || 'unknown'}`);

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  const full = path.join(UPLOAD_DIR, name);
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(full, buf);

  // Path relative to /public so it can be served as a static asset.
  return `/uploads/${name}`;
}
