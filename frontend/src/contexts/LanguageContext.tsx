import React, { createContext, useContext, useState } from 'react';

export type Language = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ru' | 'ja' | 'ko' | 'zh';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: React.ReactNode;
}

// Simple translation function (in a real app, this would be more sophisticated)
const translations: Record<string, Record<string, string>> = {
  en: {
    'social.feed': 'Social Feed',
    'post.create': 'Create Post',
    'post.like': 'Like',
    'post.comment': 'Comment',
    'post.share': 'Share',
    'post.bookmark': 'Bookmark',
  },
  es: {
    'social.feed': 'Feed Social',
    'post.create': 'Crear Publicación',
    'post.like': 'Me Gusta',
    'post.comment': 'Comentar',
    'post.share': 'Compartir',
    'post.bookmark': 'Guardar',
  },
};

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState('en');

  const t = (key: string): string => {
    return translations[language]?.[key] || key;
  };

  const value = {
    language,
    setLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};