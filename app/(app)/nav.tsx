'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, CalendarDays, FileText, Lightbulb, ListChecks, Package, Settings, Sun, type LucideIcon } from 'lucide-react';

const GROUPS: { label: string; links: { href: string; label: string; icon: LucideIcon }[] }[] = [
  {
    label: '内容',
    links: [
      { href: '/', label: '今天', icon: Sun },
      { href: '/ideas', label: '灵感池', icon: Lightbulb },
      { href: '/topics', label: '选题单', icon: ListChecks },
      { href: '/drafts', label: '稿件', icon: FileText },
    ],
  },
  {
    label: '发布',
    links: [
      { href: '/publish', label: '发布包', icon: Package },
      { href: '/schedule', label: '排期', icon: CalendarDays },
    ],
  },
  {
    label: '工作台',
    links: [
      { href: '/agents', label: 'Agent', icon: Bot },
      { href: '/settings', label: '设置', icon: Settings },
    ],
  },
];

export function Nav({ account }: { account: string }) {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="主导航">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">{(account || '一').slice(0, 1)}</span>
        <span>
          <b>一人工作台</b>
          <span className="hint">{account || '未设置账号'}</span>
        </span>
      </div>
      {GROUPS.map((g) => (
        <div key={g.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div className="group">{g.label}</div>
          {g.links.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? path === '/' : path.startsWith(href);
            return (
              <Link key={href} href={href} className={active ? 'active' : undefined} aria-current={active ? 'page' : undefined}>
                <Icon aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
