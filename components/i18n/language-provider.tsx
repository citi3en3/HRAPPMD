'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  defaultLanguage,
  isLanguageCode,
  translateText,
  type LanguageCode,
} from '@/lib/i18n/translations';

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: (text: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);
const originalText = new WeakMap<Text, string>();

function getStoredLanguage(): LanguageCode {
  const stored = window.localStorage.getItem('hri-language');
  return stored && isLanguageCode(stored) ? stored : defaultLanguage;
}

function shouldSkipElement(element: Element | null): boolean {
  if (!element) return false;
  return Boolean(element.closest('script, style, code, pre, textarea, [data-i18n-skip]'));
}

function translateNode(node: Text, language: LanguageCode) {
  if (shouldSkipElement(node.parentElement)) return;

  const raw = node.nodeValue ?? '';
  if (!raw.trim()) return;

  const source = originalText.get(node) ?? raw;
  originalText.set(node, source);

  const leadingWhitespace = source.match(/^\s*/)?.[0] ?? '';
  const trailingWhitespace = source.match(/\s*$/)?.[0] ?? '';
  const trimmedSource = source.trim();
  const translated = translateText(trimmedSource, language);
  const nextValue = `${leadingWhitespace}${translated}${trailingWhitespace}`;

  if (node.nodeValue !== nextValue) {
    node.nodeValue = nextValue;
  }
}

function translateAttribute(
  element: Element,
  attribute: 'aria-label' | 'placeholder' | 'title',
  language: LanguageCode,
) {
  const current = element.getAttribute(attribute);
  if (!current) return;

  const originalAttribute = `data-i18n-original-${attribute}`;
  const source = element.getAttribute(originalAttribute) ?? current;
  element.setAttribute(originalAttribute, source);

  const translated = translateText(source, language);
  if (current !== translated) {
    element.setAttribute(attribute, translated);
  }
}

function translateDocument(language: LanguageCode) {
  if (typeof document === 'undefined') return;

  document.documentElement.lang = language;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    translateNode(node as Text, language);
    node = walker.nextNode();
  }

  document.querySelectorAll('[aria-label], [placeholder], [title]').forEach((element) => {
    if (shouldSkipElement(element)) return;
    translateAttribute(element, 'aria-label', language);
    translateAttribute(element, 'placeholder', language);
    translateAttribute(element, 'title', language);
  });
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(defaultLanguage);

  const setLanguage = useCallback((nextLanguage: LanguageCode) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem('hri-language', nextLanguage);
  }, []);

  const t = useCallback((text: string) => translateText(text, language), [language]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setLanguageState(getStoredLanguage()));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let frame = window.requestAnimationFrame(() => translateDocument(language));

    const observer = new MutationObserver(() => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => translateDocument(language));
    });

    observer.observe(document.body, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
