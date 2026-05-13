import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'public', 'uploads');

const ALLOWED = new Map<string, string>([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
]);

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

/**
 * Resolve a user-supplied uploaded-file path segment array to an absolute path
 * INSIDE `root`. Throws if the resolved path escapes root, if segments contain
 * `..`, absolute paths, or if the input is empty. Pure — no fs access.
 */
export function resolveSafeUploadPath(root: string, parts: string[]): string {
  if (!parts || parts.length === 0) throw new Error('Empty upload path');
  for (const p of parts) {
    if (!p || p === '..' || p.includes('..') || p.startsWith('/') || p.startsWith('\\')) {
      throw new Error('Refusing path outside upload root');
    }
  }
  const joined = path.join(root, ...parts);
  const safeRoot = path.resolve(root);
  const resolved = path.resolve(joined);
  if (!resolved.startsWith(safeRoot + path.sep) && resolved !== safeRoot) {
    throw new Error('Refusing path outside upload root');
  }
  return resolved;
}

export function contentTypeFor(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return CONTENT_TYPES[ext] ?? 'application/octet-stream';
}

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
