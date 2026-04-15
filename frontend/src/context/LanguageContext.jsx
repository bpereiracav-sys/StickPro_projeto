import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  translations,
  languageNames,
  defaultLanguage,
  getTranslation,
} from '../i18n/translations';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem('stickpro_language');
    if (savedLanguage && translations[savedLanguage]) {
      return savedLanguage;
    }

    const browserLanguage = navigator.language?.split('-')[0];
    if (browserLanguage && translations[browserLanguage]) {
      return browserLanguage;
    }

    return defaultLanguage;
  });

  useEffect(() => {
    localStorage.setItem('stickpro_language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback(
    (path, params = {}) => {
      let text = getTranslation(language, path);

      if (typeof text === 'string' && Object.keys(params).length > 0) {
        Object.entries(params).forEach(([key, value]) => {
          text = text.replace(new RegExp(`{${key}}`, 'g'), String(value));
        });
      }

      return text;
    },
    [language]
  );

  const changeLanguage = useCallback((newLanguage) => {
    if (!translations[newLanguage]) {
      return;
    }

    setLanguage(newLanguage);
  }, []);

  const value = useMemo(
    () => ({
      language,
      languages: Object.keys(translations),
      languageNames,
      t,
      changeLanguage,
    }),
    [language, t, changeLanguage]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }

  return context;
}

export default LanguageContext;
