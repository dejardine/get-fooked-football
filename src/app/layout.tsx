import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getSession } from '@/lib/session';
import { bootstrapAdminIfNeeded } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Get Fooked — 2026 World Cup tipping',
  description: 'Invite-only football tipping for the crew. Random teams, weird leaderboards, real prizes.',
};

const NAV: Array<[string, string]> = [
  ['Fixtures', '/fixtures'],
  ['My Teams', '/teams'],
  ['Boards', '/leaderboards'],
  ['InSwap', '/inswap'],
  ['Prizes', '/prizes'],
  ['Polymarket', '/polymarket'],
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  try {
    await bootstrapAdminIfNeeded();
  } catch {}
  let session: Awaited<ReturnType<typeof getSession>> | undefined;
  try {
    session = await getSession();
  } catch {}

  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b-[3px] border-black bg-neon-lime">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="text-2xl font-black uppercase tracking-tight">Get Fooked</span>
              <span className="text-xs font-bold opacity-70">⚽ 2026</span>
            </Link>
            <nav className="hidden gap-1 md:flex">
              {NAV.map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="border-[3px] border-transparent px-3 py-1 font-bold uppercase tracking-wide hover:border-black hover:bg-white"
                >
                  {label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-2 text-sm">
              {session?.userId ? (
                <>
                  <span className="hidden sm:inline font-bold">Hi, {session.name}</span>
                  {session.isAdmin && (
                    <Link className="brutal-btn-ghost text-xs" href="/admin">
                      Admin
                    </Link>
                  )}
                  <form action="/api/auth/logout" method="post">
                    <button className="brutal-btn-ghost text-xs" type="submit">Sign out</button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="brutal-btn-pink text-xs">
                  Sign in
                </Link>
              )}
            </div>
          </div>
          <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 md:hidden">
            {NAV.map(([label, href]) => (
              <Link key={href} href={href} className="whitespace-nowrap border-[2px] border-black bg-white px-3 py-1 text-xs font-bold uppercase">
                {label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-8 text-xs">
          <span className="brutal-pill">Get Fooked</span> · World Cup 2026 · Built for friends, not bookies.
        </footer>
      </body>
    </html>
  );
}
