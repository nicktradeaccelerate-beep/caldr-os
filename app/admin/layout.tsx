'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/admin/billing',  label: 'Billing' },
  { href: '/admin/settings', label: 'Brand Studio' },
  { href: '/admin/numbers',  label: 'Numbers' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Admin sub-nav */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 24,
        padding: '4px', background: 'var(--card)',
        borderRadius: 12, border: '1px solid var(--border)',
        width: 'fit-content',
      }}>
        {TABS.map(tab => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href} style={{
              padding: '8px 16px', borderRadius: 9,
              background: active ? 'var(--white)' : 'transparent',
              color: active ? 'var(--ink)' : 'var(--ink-2)',
              fontWeight: active ? 600 : 400,
              fontSize: 13, textDecoration: 'none',
              boxShadow: active ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s',
            }}>
              {tab.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
