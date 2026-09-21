import {StrictMode, useState, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import App from './App.tsx';
import './index.css';
import { REALTIME_PALETTES, getInitialRealtimePalette } from './utils/realtimeColors';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

// Filter out benign Vite HMR websocket and ResizeObserver notifications in dev preview
if (typeof window !== 'undefined') {
  const isBenignNotice = (arg: unknown): boolean => {
    if (!arg) return false;
    const str =
      typeof arg === 'object'
        ? (arg as Error).message || (arg as Error).stack || ''
        : String(arg);
    return (
      str.includes('[vite]') ||
      str.includes('WebSocket') ||
      str.includes('websocket') ||
      str.includes('ws://') ||
      str.includes('wss://') ||
      str.includes('ResizeObserver')
    );
  };

  const origError = console.error;
  console.error = function (...args: unknown[]) {
    if (args.some(isBenignNotice)) return;
    origError.apply(console, args);
  };

  const origWarn = console.warn;
  console.warn = function (...args: unknown[]) {
    if (args.some(isBenignNotice)) return;
    origWarn.apply(console, args);
  };

  window.addEventListener('error', (e) => {
    if (
      isBenignNotice(e.message) ||
      isBenignNotice(e.error) ||
      e.message?.includes('ResizeObserver loop')
    ) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  });

  window.addEventListener('unhandledrejection', (e) => {
    if (isBenignNotice(e.reason)) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  });
}

function RootApp() {
  const [themeProps, setThemeProps] = useState(() => {
    const initialId = getInitialRealtimePalette();
    const p = REALTIME_PALETTES.find((x) => x.id === initialId) || REALTIME_PALETTES[0];
    return {
      accentColor: (p.radixAccent || 'indigo') as any,
      grayColor: (p.radixGray || 'slate') as any,
      appearance: (p.appearance || 'dark') as 'dark' | 'light',
    };
  });

  useEffect(() => {
    const handlePaletteChange = (e: Event) => {
      const customEvt = e as CustomEvent;
      const palette = customEvt.detail;
      if (palette) {
        setThemeProps({
          accentColor: (palette.radixAccent || 'indigo') as any,
          grayColor: (palette.radixGray || 'slate') as any,
          appearance: (palette.appearance || 'dark') as 'dark' | 'light',
        });
      }
    };
    window.addEventListener('realtime-palette-change', handlePaletteChange);
    return () => window.removeEventListener('realtime-palette-change', handlePaletteChange);
  }, []);

  return (
    <Theme
      accentColor={themeProps.accentColor}
      grayColor={themeProps.grayColor}
      appearance={themeProps.appearance}
      radius="medium"
      scaling="100%"
    >
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </Theme>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
);
