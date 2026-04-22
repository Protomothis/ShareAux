'use client';

import {
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  DoorOpen,
  LayoutDashboard,
  Menu,
  Music,
  Settings,
  Shield,
  ShieldAlert,
  Ticket,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/admin', labelKey: 'dashboard', icon: LayoutDashboard },
  { href: '/admin/users', labelKey: 'users', icon: Users },
  { href: '/admin/rooms', labelKey: 'rooms', icon: DoorOpen },
  { href: '/admin/tracks', labelKey: 'tracks', icon: Music },
  { href: '/admin/invite-codes', labelKey: 'inviteCodes', icon: Ticket },
  { href: '/admin/settings', labelKey: 'settings', icon: Settings },
  { href: '/admin/cleanup', labelKey: 'cleanup', icon: Trash2 },
  { href: '/admin/audit-logs', labelKey: 'auditLogs', icon: ClipboardList },
  { href: '/admin/reports', labelKey: 'reports', icon: ShieldAlert },
  { href: '/admin/ip-bans', labelKey: 'ipBans', icon: Shield },
  { href: '/admin/errors', labelKey: 'errors', icon: AlertTriangle },
];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
  collapsed?: boolean;
}) {
  return (
    <Link
      key={href}
      href={href}
      title={collapsed ? label : undefined}
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition ${
        collapsed ? 'justify-center' : ''
      } ${
        active ? 'bg-sa-accent/10 font-medium text-sa-accent' : 'text-sa-text-muted hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon size={18} />
      {!collapsed && label}
    </Link>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const tn = useTranslations('admin.nav');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 페이지 이동 시 사이드바 닫기
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="fixed inset-0 flex bg-sa-bg-primary">
      {/* 데스크톱 사이드바 — md: icon-only (w-14), lg: full (w-56) */}
      <aside className="fixed hidden h-screen w-14 flex-col overflow-y-auto border-r border-white/5 bg-sa-bg-primary p-2 md:flex lg:w-56 lg:p-5">
        <div className="mb-6">
          <h1 className="hidden text-lg font-bold text-white lg:block">🎧 Admin</h1>
          <h1 className="text-center text-lg font-bold text-white lg:hidden">🎧</h1>
          <Link
            href="/rooms"
            className="mt-1 hidden items-center gap-1 text-xs text-sa-text-muted transition hover:text-sa-accent lg:flex"
          >
            <ArrowLeft size={12} />
            {tn('backToService')}
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => (
            <span key={item.href}>
              {/* md: icon-only */}
              <span className="block lg:hidden">
                <NavLink
                  href={item.href}
                  label={tn(item.labelKey)}
                  icon={item.icon}
                  active={pathname === item.href}
                  collapsed
                />
              </span>
              {/* lg: full */}
              <span className="hidden lg:block">
                <NavLink href={item.href} label={tn(item.labelKey)} icon={item.icon} active={pathname === item.href} />
              </span>
            </span>
          ))}
        </nav>
      </aside>

      {/* 모바일 오버레이 */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <aside
            className="absolute left-0 top-0 flex h-full w-64 flex-col bg-sa-bg-primary p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-3 top-3 text-sa-text-muted"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={18} />
            </Button>
            <div className="mb-6">
              <h1 className="text-lg font-bold text-white">🎧 Admin</h1>
              <Link
                href="/rooms"
                className="mt-1 flex items-center gap-1 text-xs text-sa-text-muted transition hover:text-sa-accent"
              >
                <ArrowLeft size={12} />
                {tn('backToService')}
              </Link>
            </div>
            <nav className="flex flex-1 flex-col gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={tn(item.labelKey)}
                  icon={item.icon}
                  active={pathname === item.href}
                />
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* 메인 콘텐츠 — md: ml-14, lg: ml-56 */}
      <main className="flex-1 overflow-y-auto p-4 md:ml-14 md:p-8 lg:ml-56">
        {/* 모바일 헤더 */}
        <div className="mb-4 flex items-center gap-3 md:hidden">
          <Button variant="ghost" size="icon-sm" onClick={() => setSidebarOpen(true)} className="text-sa-text-muted">
            <Menu size={20} />
          </Button>
          <span className="text-sm font-medium text-white">
            {navItems.find((n) => n.href === pathname)?.labelKey
              ? tn(navItems.find((n) => n.href === pathname)!.labelKey)
              : 'Admin'}
          </span>
        </div>
        {children}
      </main>
    </div>
  );
}
