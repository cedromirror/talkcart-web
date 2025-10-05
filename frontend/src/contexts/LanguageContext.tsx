import React, { createContext, useContext, useState, useEffect } from 'react';
import { syncSettings } from '@/services/settingsSync';
import { useSafeAuth } from '@/hooks/useSafeAuth';

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
    'settings.theme': 'Theme',
    'settings.fontSize': 'Font Size',
    'settings.language': 'Language',
    'settings.reducedMotion': 'Reduced Motion',
    'settings.reducedMotion.description': 'Reduce motion and animation for better performance',
    'settings.highContrast': 'High Contrast',
    'settings.highContrast.description': 'Increase contrast for better visibility',
  },
  es: {
    'social.feed': 'Feed Social',
    'post.create': 'Crear Publicación',
    'post.like': 'Me Gusta',
    'post.comment': 'Comentar',
    'post.share': 'Compartir',
    'post.bookmark': 'Guardar',
    'settings.theme': 'Tema',
    'settings.fontSize': 'Tamaño de Fuente',
    'settings.language': 'Idioma',
    'settings.reducedMotion': 'Movimiento Reducido',
    'settings.reducedMotion.description': 'Reducir movimiento y animación para mejor rendimiento',
    'settings.highContrast': 'Alto Contraste',
    'settings.highContrast.description': 'Aumentar contraste para mejor visibilidad',
  },
  fr: {
    'social.feed': 'Fil Social',
    'post.create': 'Créer un Post',
    'post.like': 'J\'aime',
    'post.comment': 'Commenter',
    'post.share': 'Partager',
    'post.bookmark': 'Enregistrer',
    'settings.theme': 'Thème',
    'settings.fontSize': 'Taille de Police',
    'settings.language': 'Langue',
    'settings.reducedMotion': 'Mouvement Réduit',
    'settings.reducedMotion.description': 'Réduire les mouvements et animations pour de meilleures performances',
    'settings.highContrast': 'Contraste Élevé',
    'settings.highContrast.description': 'Augmenter le contraste pour une meilleure visibilité',
  },
  de: {
    'social.feed': 'Soziales Feed',
    'post.create': 'Beitrag erstellen',
    'post.like': 'Gefällt mir',
    'post.comment': 'Kommentieren',
    'post.share': 'Teilen',
    'post.bookmark': 'Speichern',
    'settings.theme': 'Design',
    'settings.fontSize': 'Schriftgröße',
    'settings.language': 'Sprache',
    'settings.reducedMotion': 'Reduzierte Bewegung',
    'settings.reducedMotion.description': 'Bewegung und Animation reduzieren für bessere Leistung',
    'settings.highContrast': 'Hoher Kontrast',
    'settings.highContrast.description': 'Kontrast erhöhen für bessere Sichtbarkeit',
  },
};

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState('en');
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Safely get auth context - it might not be available during initial render
  const { isAuthenticated, user } = useSafeAuth();

  // Load saved language preference
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // First, try to load from localStorage for immediate UI update
        const savedLanguage = localStorage.getItem('talkcart-language');
        if (savedLanguage && ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'].includes(savedLanguage)) {
          setLanguageState(savedLanguage);
        }

        // If authenticated, load from backend and sync
        if (isAuthenticated && user) {
          try {
            const backendSettings = await syncSettings.load();
            if (backendSettings?.theme?.language) {
              const backendLanguage = backendSettings.theme.language;
              if (['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'].includes(backendLanguage)) {
                setLanguageState(backendLanguage);
                // Update localStorage with backend data
                localStorage.setItem('talkcart-language', backendLanguage);
              }
            }
          } catch (backendError: any) {
            // Silently handle backend connection errors during development
            if (backendError?.code !== 'ECONNREFUSED') {
              console.warn('Failed to sync language settings:', backendError?.message);
            }
          }
        }
      } catch (error: any) {
        // Only log non-connection errors
        if (error?.code !== 'ECONNREFUSED') {
          console.warn('Failed to load language preference:', error?.message);
        }
      } finally {
        setIsLoaded(true);
      }
    };

    loadSettings();
  }, [isAuthenticated, user]);

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('talkcart-language', lang);
      
      // Sync with backend if authenticated
      if (isAuthenticated && user && isLoaded) {
        syncSettings.language({ language: lang });
      }
    } catch (error) {
      console.warn('Failed to save language preference:', error);
    }
  };

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