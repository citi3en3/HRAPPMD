import { createNavigation } from 'next-intl/navigation';
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'fr', 'es', 'it', 'de', 'pl', 'sk', 'sr', 'ro', 'ru', 'uk'],
  defaultLocale: 'en',
  localePrefix: 'never',
});

export type Locale = (typeof routing.locales)[number];

export const locales = routing.locales;

export function isLocale(value: string | undefined): value is Locale {
  return Boolean(value && (locales as readonly string[]).includes(value));
}

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
