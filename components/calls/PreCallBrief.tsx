'use client';

import { useState, useEffect } from 'react';
import ClippyCharacter from '@/components/clippy/ClippyCharacter';
import type { IncomingCall } from '@/types';
import type { BfbContact } from '@/lib/bfb/contactHistory';

interface PreCallBriefProps {
  call: IncomingCall;
  businessId: string;
  onAnswer: () => void;
  onDecline: () => void;
  onLeadResolved?: (leadId: string | null) => void;
}

interface BriefData {
  brief: string | null;
  contactHistory: BfbContact | null;
}

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  lead:     { color: '#B45309', bg: 'rgba(245,158,11,0.1)' },
  quoted:   { color: '#1E40AF', bg: 'rgba(30,64,175,0.1)' },
  customer: { color: 'var(--accent)', bg: 'var(--accent-light)' },
  lost:     { color: 'var(--rose)', bg: 'var(--rose-light)' },
};

function statusStyle(status: string | null) {
  return STATUS_COLORS[status ?? ''] ?? { color: 'var(--ink-2)', bg: 'var(--card)' };
}

export default function PreCallBrief({ call, businessId, onAnswer, onDecline, onLeadResolved }: PreCallBriefProps) {
  const [data, setData] = useState<BriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    fetch('/api/ai/pre-call-brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ call, businessId }),
    })
      .then(r => r.json())
      .then((d: BriefData) => {
        setData(d);
        setLoading(false);
        if (d.contactHistory?.id) {
          onLeadResolved?.(d.contactHistory.id);
        }
      })
      .catch(() => {
        setData(null);
        setLoading(false);
      });
  }, []);

  // Countdown ring
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const lines = data?.brief
    ? data.brief.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 4)
    : [];

  const crm = data?.contactHistory ?? null;
  const displayName = call.contactName ?? crm?.name ?? call.number;
  const area = call.area ?? 'Unknown area';

  const circumference = 2 * Math.PI * 26;
  const offset = circumference * (1 - countdown / 10);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(26,25,24,0.6)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 440,
        background: 'var(--white)',
        borderRadius: 24,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)',
        animation: 'slideUp 0.25s ease-out',
      }}>
        {/* Incoming strip */}
        <div style={{
          padding: '18px 20px 14px',
          background: 'var(--accent)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.58a1 1 0 0 1-.25 1.02L6.6 10.8z" stroke="white" strokeWidth="1.5" fill="none"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
              Incoming call
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'white', letterSpacing: '-0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
              {call.number !== displayName ? `${call.number} · ` : ''}{area}
            </div>
          </div>
          {/* Countdown ring */}
          <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
            <svg width="56" height="56" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="28" cy="28" r="26" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3"/>
              <circle cx="28" cy="28" r="26" fill="none" stroke="white" strokeWidth="3"
                strokeDasharray={circumference} strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, color: 'white',
            }}>
              {countdown}
            </div>
          </div>
        </div>

        {/* CRM card — shown when a BFB contact was found */}
        {crm && (
          <div style={{
            padding: '10px 20px',
            background: '#F5F9FF',
            borderBottom: '1px solid #E0EAFF',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="8" r="4" stroke="#1E40AF" strokeWidth="1.5" fill="none"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#1E40AF" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#1E3A8A' }}>BFB CRM — </span>
              {crm.status && (
                <span style={{
                  display: 'inline-block',
                  padding: '1px 7px',
                  background: statusStyle(crm.status).bg,
                  color: statusStyle(crm.status).color,
                  borderRadius: 20, fontSize: 10, fontWeight: 700,
                  textTransform: 'capitalize', marginRight: 6,
                }}>
                  {crm.status}
                </span>
              )}
              {crm.quoteValue && (
                <span style={{ fontSize: 11, color: '#1E40AF', fontWeight: 600 }}>
                  £{crm.quoteValue.toLocaleString()} quote
                </span>
              )}
            </div>
            {crm.lastContact && (
              <div style={{ fontSize: 10, color: '#6B7280', flexShrink: 0 }}>
                Last: {new Date(crm.lastContact).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </div>
            )}
          </div>
        )}

        {/* CRM notes snippet */}
        {crm?.notes && (
          <div style={{
            padding: '8px 20px',
            background: '#F5F9FF',
            borderBottom: '1px solid #E0EAFF',
          }}>
            <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5, fontStyle: 'italic' }}>
              &ldquo;{crm.notes.length > 120 ? crm.notes.slice(0, 117) + '…' : crm.notes}&rdquo;
            </div>
          </div>
        )}

        {/* AI Brief */}
        <div style={{ padding: '14px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <ClippyCharacter mood={loading ? 'thinking' : 'happy'} size={32} />
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              AI Pre-call Brief
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', gap: 6, padding: '12px 0' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--accent-mid)',
                  animation: `bounce 1s ${i * 0.15}s infinite`,
                }}/>
              ))}
            </div>
          ) : lines.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lines.map((line, i) => (
                <div key={i} style={{
                  padding: '10px 12px',
                  background: i === lines.length - 1 ? 'var(--accent-light)' : 'var(--card)',
                  borderRadius: 10,
                  border: `1px solid ${i === lines.length - 1 ? 'var(--accent-light)' : 'var(--border)'}`,
                  fontSize: 13,
                  color: i === lines.length - 1 ? 'var(--accent)' : 'var(--ink)',
                  fontWeight: i === lines.length - 1 ? 600 : 400,
                  lineHeight: 1.5,
                }}>
                  {line}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '10px 12px', background: 'var(--card)', borderRadius: 10, fontSize: 13, color: 'var(--ink-2)' }}>
              {crm
                ? `Known ${crm.status ?? 'contact'} — ${crm.jobType ?? 'no job type on file'}. Be warm and reference their history.`
                : `New contact from ${area} — no history. Be warm and ask how you can help.`}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, padding: '0 20px 20px' }}>
          <button
            onClick={onDecline}
            style={{
              flex: 1, padding: '13px 0',
              background: 'var(--rose-light)',
              color: 'var(--rose)',
              border: '1px solid rgba(225,29,72,0.2)',
              borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Decline
          </button>
          <button
            onClick={onAnswer}
            style={{
              flex: 2, padding: '13px 0',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Answer
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
