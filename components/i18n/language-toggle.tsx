'use client';

import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { type Locale, locales, usePathname, useRouter } from '@/i18n/routing';

const languageOptions: Record<Locale, { label: string; flagSrc: string }> = {
  en: { label: 'English', flagSrc: '/flags/us.svg' },
  ro: { label: 'Română', flagSrc: '/flags/ro.svg' },
};

export function LanguageToggle() {
  const t = useTranslations('Legacy');
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const selectedLanguage = languageOptions[locale];

  function switchLocale(nextLocale: Locale) {
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <label className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted">
      <span className="sr-only">{t('Language')}</span>
      <Image
        src={selectedLanguage.flagSrc}
        alt=""
        width={24}
        height={16}
        unoptimized
        aria-hidden="true"
        className="h-4 w-6 rounded-sm object-cover"
      />
      <select
        value={locale}
        disabled={isPending}
        onChange={(event) => switchLocale(event.target.value as Locale)}
        aria-label={t('Language')}
        className="bg-transparent text-sm font-medium text-foreground outline-none disabled:opacity-60"
      >
        {locales.map((optionLocale) => (
          <option key={optionLocale} value={optionLocale}>
            {languageOptions[optionLocale].label}
          </option>
        ))}
      </select>
    </label>
  );
}
