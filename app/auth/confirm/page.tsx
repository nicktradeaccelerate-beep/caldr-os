'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AuthConfirmPage() {
  useEffect(() => {
    const supabase = createClient();

    // getSession triggers the implicit flow token exchange from the URL hash
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.replace('/');
      } else {
        // Listen for the auth state change triggered by the hash token
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (session) {
            subscription.unsubscribe();
            window.location.replace('/');
          }
        });
        // Fallback redirect after 5s
        setTimeout(() => { window.location.replace('/login'); }, 5000);
      }
    });
  }, []);

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--ground)',
      fontFamily: 'inherit',
      fontSize: 14,
      color: 'var(--ink-2)',
    }}>
      Signing you in…
    </div>
  );
}
