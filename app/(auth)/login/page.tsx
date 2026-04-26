'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--ground)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: 'var(--white)',
        borderRadius: 'var(--r-lg)',
        padding: '40px 36px',
        width: '100%',
        maxWidth: 380,
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border)',
      }}>
        {/* Logo mark */}
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            background: 'var(--accent)',
            borderRadius: 12,
            marginBottom: 12,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 3C8.13 3 5 6.13 5 10v9a1 1 0 0 0 1 1h4v-5H7v-5a5 5 0 0 1 10 0v5h-3v5h4a1 1 0 0 0 1-1v-9c0-3.87-3.13-7-7-7z"
                fill="white" />
            </svg>
          </div>
          <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--ink)', letterSpacing: '-0.3px' }}>
            Caldr OS
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4 }}>
            Sign in to your workspace
          </div>
        </div>

        {sent ? (
          <div style={{
            textAlign: 'center',
            padding: '24px 0',
            color: 'var(--ink-2)',
            fontSize: 14,
            lineHeight: 1.6,
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📬</div>
            <strong style={{ color: 'var(--ink)', display: 'block', marginBottom: 8 }}>
              Check your email
            </strong>
            We sent a magic link to <strong>{email}</strong>.<br />
            Click it to sign in.
          </div>
        ) : (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>
                Work email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-sm)',
                  fontSize: 14,
                  color: 'var(--ink)',
                  background: 'var(--white)',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>

            {error && (
              <div style={{ fontSize: 12, color: 'var(--rose)', padding: '8px 12px', background: 'var(--rose-light)', borderRadius: 6 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              style={{
                padding: '11px 0',
                background: loading ? 'var(--accent-mid)' : 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--r-sm)',
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
                marginTop: 4,
              }}
            >
              {loading ? 'Sending…' : 'Send magic link →'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--ink-3)' }}>
          Access is by invitation only
        </div>
      </div>
    </div>
  );
}
