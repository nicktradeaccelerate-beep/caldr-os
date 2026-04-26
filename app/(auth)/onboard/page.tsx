'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Step = 'validate' | 'signup' | 'provisioning' | 'done' | 'error';

function OnboardContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token');
  const supabase = createClient();

  const [step, setStep] = useState<Step>('validate');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [number, setNumber] = useState('');

  useEffect(() => {
    if (!token) { setStep('error'); setError('No provisioning token found. Scan the QR code again.'); }
  }, [token]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setStep('validate');

    // Validate token
    const res = await fetch('/api/qr/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const { valid, userId, businessId } = await res.json();

    if (!valid) { setStep('error'); setError('This QR code has expired or already been used.'); return; }

    // Create Supabase auth account
    const { error: signupError } = await supabase.auth.signUp({ email, password });
    if (signupError) { setStep('signup'); setError(signupError.message); return; }

    // Provision number
    setStep('provisioning');
    const provRes = await fetch('/api/twilio/provision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, businessId }),
    });
    const { number: provisioned, error: provError } = await provRes.json();

    if (provError) { setStep('error'); setError(provError); return; }

    setNumber(provisioned);
    setStep('done');
  }

  if (step === 'error') return (
    <Screen>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
      <h2 style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Setup failed</h2>
      <p style={{ color: 'var(--ink-2)', fontSize: 14, marginBottom: 20 }}>{error}</p>
      <button onClick={() => router.push('/login')} style={btnStyle}>Go to login</button>
    </Screen>
  );

  if (step === 'provisioning') return (
    <Screen>
      <div style={{ fontSize: 32, marginBottom: 12 }}>📡</div>
      <h2 style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Setting up your number…</h2>
      <p style={{ color: 'var(--ink-2)', fontSize: 14 }}>Provisioning your UK number. This takes a few seconds.</p>
    </Screen>
  );

  if (step === 'done') return (
    <Screen>
      <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
      <h2 style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>You're all set!</h2>
      <p style={{ color: 'var(--ink-2)', fontSize: 14, marginBottom: 8 }}>Your UK number is live:</p>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: 'var(--accent)', marginBottom: 24 }}>{number}</div>
      <button onClick={() => router.push('/')} style={btnStyle}>Open Caldr OS →</button>
    </Screen>
  );

  return (
    <Screen>
      <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--ink)', marginBottom: 6 }}>Create your account</div>
      <p style={{ color: 'var(--ink-2)', fontSize: 13, marginBottom: 24 }}>You've been invited to Caldr OS.</p>
      <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
        <input type="email" placeholder="Work email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
        <input type="password" placeholder="Choose a password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} style={inputStyle} />
        {error && <div style={{ fontSize: 12, color: 'var(--rose)', background: 'var(--rose-light)', padding: '8px 12px', borderRadius: 6 }}>{error}</div>}
        <button type="submit" style={btnStyle}>Set up my workspace →</button>
      </form>
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--ground)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'var(--white)', borderRadius: 'var(--r-lg)', padding: '40px 32px', maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}>
        {children}
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '11px 0', background: 'var(--accent)', color: 'white',
  border: 'none', borderRadius: 'var(--r-sm)', fontSize: 14, fontWeight: 600,
  cursor: 'pointer', width: '100%',
};

const inputStyle: React.CSSProperties = {
  padding: '10px 12px', border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)', fontSize: 14, color: 'var(--ink)',
  background: 'var(--white)', outline: 'none', width: '100%',
};

export default function OnboardPage() {
  return (
    <Suspense fallback={null}>
      <OnboardContent />
    </Suspense>
  );
}
