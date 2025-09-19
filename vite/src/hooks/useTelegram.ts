// src/hooks/useTelegram.ts
import { useEffect, useState } from 'react';

export const useTelegram = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const initTelegram = () => {
      try {
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.expand();
          setUser(window.Telegram.WebApp.initDataUnsafe?.user);
          setIsInitialized(true);
          return true;
        } else {
          setUser({
            id: 123456789,
            first_name: 'Test',
            last_name: 'User',
            username: 'testuser',
            language_code: 'ru'
          });
          setIsInitialized(true);
          return true;
        }
        return false;
      } catch (error) {
        console.error('Telegram init error:', error);
        return false;
      }
    };

    // Пробуем инициализировать сразу
    if (!initTelegram()) {
      // Если не получилось, ждем загрузки скрипта
      const timer = setInterval(() => {
        if (window.Telegram?.WebApp) {
          initTelegram();
          clearInterval(timer);
        }
      }, 100);

      return () => clearInterval(timer);
    }
  }, []);

  return {
    isInitialized,
    user,
    userId: user?.id?.toString(),
    WebApp: window.Telegram?.WebApp,
    closeApp: () => window.Telegram?.WebApp?.close(),
    showAlert: (message: string) => window.Telegram?.WebApp?.showAlert(message),
  };
};