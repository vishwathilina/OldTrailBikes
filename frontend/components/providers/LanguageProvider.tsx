'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Language } from '@/lib/messages';
import { formatMessage, getMessage, type MessageKey } from '@/lib/messages';

interface LanguageState {
  language: Language;
  /** BCP-47 style locale for dates/numbers */
  locale: string;
  setLanguage: (lang: Language) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageState | null>(null);

const LANG_KEY = 'otb_language';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLangState] = useState<Language>('EN');

  useEffect(() => {
    const stored = localStorage.getItem(LANG_KEY) as Language | null;
    if (stored === 'EN' || stored === 'SI') setLangState(stored);
  }, []);

  function setLanguage(lang: Language) {
    setLangState(lang);
    localStorage.setItem(LANG_KEY, lang);
  }

  const locale = language === 'SI' ? 'si-LK' : 'en-LK';

  const t = useCallback((key: MessageKey, vars?: Record<string, string | number>): string => {
    return formatMessage(getMessage(language, key), vars);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, locale, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageState {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
}
