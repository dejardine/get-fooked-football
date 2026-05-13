import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function POST(req: Request) {
  const s = await getSession();
  s.destroy();
  return NextResponse.redirect(new URL('/', req.url));
}
