'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

function getStoredTheme(): boolean {
  const stored = localStorage.getItem('hri-theme');
  return (
    stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setDark(getStoredTheme()));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('hri-theme', next ? 'dark' : 'light');
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="rounded-md p-2 text-muted-foreground hover:bg-muted transition-colors"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
