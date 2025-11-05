export {};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        BackButton: {
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: () => void;
        };
      };
    };
  }
}
