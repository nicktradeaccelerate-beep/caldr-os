'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Already installed or user dismissed before
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (localStorage.getItem('caldr-os:install-dismissed')) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!prompt || dismissed) return null;

  async function handleInstall() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      setPrompt(null);
    } else {
      dismiss();
    }
  }

  function dismiss() {
    setDismissed(true);
    localStorage.setItem('caldr-os:install-dismissed', '1');
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 32px)',
      maxWidth: 400,
      background: '#1B4332',
      borderRadius: 14,
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      zIndex: 9999,
      boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: 'rgba(255,255,255,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 3C8.13 3 5 6.13 5 10v9a1 1 0 0 0 1 1h4v-5H7v-5a5 5 0 0 1 10 0v5h-3v5h4a1 1 0 0 0 1-1v-9c0-3.87-3.13-7-7-7z" fill="white"/>
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 2 }}>
          Add Caldr OS to Home Screen
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>
          Works offline, installs like an app
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={dismiss}
          style={{
            padding: '6px 12px',
            background: 'rgba(255,255,255,0.12)',
            border: 'none',
            borderRadius: 8,
            color: 'rgba(255,255,255,0.75)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Not now
        </button>
        <button
          onClick={handleInstall}
          style={{
            padding: '6px 12px',
            background: 'white',
            border: 'none',
            borderRadius: 8,
            color: '#1B4332',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Install
        </button>
      </div>
    </div>
  );
}
