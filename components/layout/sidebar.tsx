'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LogoMark } from '@/components/logo';
import {
  LayoutDashboard,
  ClipboardCheck,
  FileText,
  Grid3X3,
  Library,
  BarChart3,
  Coins,
  Settings,
  ChevronLeft,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Audit', href: '/audit', icon: ClipboardCheck },
  { name: 'Job Descriptions', href: '/job-descriptions', icon: FileText },
  { name: 'RACI Matrix', href: '/raci', icon: Grid3X3 },
  { name: 'Library', href: '/library', icon: Library },
  { name: 'Results', href: '/results', icon: BarChart3 },
  { name: 'Pricing', href: '/pricing', icon: Coins },
];

const bottomNavigation = [{ name: 'Settings', href: '/settings', icon: Settings }];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border bg-card transition-all duration-300',
        collapsed ? 'w-[68px]' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-4">
        <LogoMark className="h-9 w-9 shrink-0" />
        {!collapsed && (
          <div className="min-w-0">
            <span className="block text-lg font-bold tracking-tight">HRI</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <div key={item.name}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  collapsed && 'justify-center px-0',
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border p-3 space-y-1">
        {bottomNavigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                collapsed && 'justify-center px-0',
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}

        <button
          onClick={onToggle}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200',
            collapsed && 'justify-center px-0',
          )}
        >
          <ChevronLeft
            className={cn(
              'h-5 w-5 shrink-0 transition-transform duration-300',
              collapsed && 'rotate-180',
            )}
          />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
