import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import { resolveSafeUploadPath, contentTypeFor, UPLOAD_DIR } from '@/lib/uploads';

/**
 * Serves uploaded files from the persistent volume.
 *
 * Why this exists rather than just relying on Next.js's /public handling: in
 * standalone mode, Next.js only serves files that existed at build time. Files
 * written at runtime to /public/uploads don't show up. Routing through this
 * handler reads from disk on every request — slower than the static handler,
 * but it actually works on Railway with a volume mount.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await params;
  let absPath: string;
  try {
    absPath = resolveSafeUploadPath(UPLOAD_DIR, parts);
  } catch {
    return new NextResponse('bad path', { status: 400 });
  }
  try {
    const data = await fs.readFile(absPath);
    return new NextResponse(data, {
      headers: {
        'content-type': contentTypeFor(absPath),
        // Filenames are hash-stamped so the content is immutable; long cache is safe.
        'cache-control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return new NextResponse('not found', { status: 404 });
    }
    return new NextResponse('read failed', { status: 500 });
  }
}
