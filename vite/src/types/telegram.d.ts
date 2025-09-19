// src/types/telegram.d.ts
declare global {
  interface Window {
    Telegram: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
        };
        sendData: (data: string) => void;
        expand: () => void;
        close: () => void;
        showAlert: (message: string) => void;
      };
    };
  }
}

export {};