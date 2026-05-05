import React, { createContext, useContext, useState } from 'react';
import translations from '../translations';

const LANGUAGES = ['en', 'nl', 'fr', 'de'];
const LABELS = { en: 'ENG', nl: 'NL', fr: 'FR', de: 'DE' };

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'en');

  const cycleLanguage = () => {
    const idx = LANGUAGES.indexOf(lang);
    const next = LANGUAGES[(idx + 1) % LANGUAGES.length];
    setLang(next);
    localStorage.setItem('lang', next);
  };

  const t = (key) => translations[lang]?.[key] ?? translations['en']?.[key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, cycleLanguage, t, LABELS }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
