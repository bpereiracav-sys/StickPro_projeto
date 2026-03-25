import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, languageNames, defaultLanguage, getTranslation } from '../i18n/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    // Try to get saved language from localStorage
    const saved = localStorage.getItem('stickpro_language');
    if (saved && translations[saved]) {
      return saved;
    }
    // Try to detect browser language
    const browserLang = navigator.language?.split('-')[0];
    if (browserLang && translations[browserLang]) {
      return browserLang;
    }
    return defaultLanguage;
  });

  useEffect(() => {
    localStorage.setItem('stickpro_language', language);
    // Update HTML lang attribute
    document.documentElement.lang = language;
  }, [language]);

  // Translation function
  const t = useCallback((path, params = {}) => {
    let text = getTranslation(language, path);
    
    // Replace parameters like {name}
    if (typeof text === 'string' && Object.keys(params).length > 0) {
      Object.entries(params).forEach(([key, value]) => {
        text = text.replace(new RegExp(`{${key}}`, 'g'), value);
      });
    }
    
    return text;
  }, [language]);

  // Change language function
  const changeLanguage = useCallback((newLang) => {
    if (translations[newLang]) {
      setLanguage(newLang);
    }
  }, []);

  const value = {
    language,
    languages: Object.keys(translations),
    languageNames,
    t,
    changeLanguage,
  };

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
