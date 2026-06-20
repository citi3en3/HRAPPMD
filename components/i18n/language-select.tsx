'use client';

import Image from 'next/image';
import { useLanguage } from '@/components/i18n/language-provider';
import { languageOptions, type LanguageCode } from '@/lib/i18n/translations';

export function LanguageSelect() {
  const { language, setLanguage, t } = useLanguage();
  const selectedLanguage =
    languageOptions.find((option) => option.code === language) ?? languageOptions[0];

  return (
    <label
      className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      data-i18n-skip
    >
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
        value={language}
        onChange={(event) => setLanguage(event.target.value as LanguageCode)}
        aria-label="Language"
        className="bg-transparent text-sm font-medium text-foreground outline-none"
      >
        {languageOptions.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
