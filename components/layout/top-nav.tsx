'use client';

import { usePathname, useRouter } from 'next/navigation';
import { LogOut, User } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSelect } from '@/components/i18n/language-select';

const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/audit': 'Organizational Audit',
  '/job-descriptions': 'Job Descriptions',
  '/raci': 'RACI Matrix',
  '/library': 'Document Library',
  '/results': 'Results',
  '/settings': 'Settings',
};

function getPageTitle(pathname: string): string {
  for (const [route, title] of Object.entries(routeTitles)) {
    if (pathname.startsWith(route)) return title;
  }
  return 'HRI';
}

export function TopNav() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6 lg:px-8">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <LanguageSelect />
        <ThemeToggle />
        <DevUserMenu />
      </div>
    </header>
  );
}

function DevUserMenu() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <User className="h-4 w-4" />
        <span>Admin</span>
      </div>
      <button
        onClick={handleLogout}
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </div>
  );
}
