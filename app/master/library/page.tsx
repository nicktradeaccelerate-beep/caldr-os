'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import CallReviewModal from '@/components/master/CallReviewModal';
import type { Call } from '@/types';

// Demo call data — replaced by live DB
const DEMO_CALLS: Call[] = [
  { id: '1', business_id: 'b1', va_id: 'v1', twilio_call_sid: null, contact_name: 'David Chen', contact_number: '+44 207 946 0100', direction: 'outbound', area: 'Central London', duration_seconds: 394, sentiment_score: 91, intent_signal: 'High intent', ai_score: 88, flags: [], recording_url: null, transcript: null, coaching_note: null, outcome: 'booked', channel: 'phone', status: 'completed', started_at: '2026-04-16T09:14:00Z', ended_at: '2026-04-16T09:20:34Z' },
  { id: '2', business_id: 'b1', va_id: 'v2', twilio_call_sid: null, contact_name: 'Sarah Williams', contact_number: '+44 161 496 0200', direction: 'inbound', area: 'Manchester', duration_seconds: 187, sentiment_score: 58, intent_signal: 'Price sensitive', ai_score: 61, flags: ['price objection', 'long silence'], recording_url: null, transcript: null, coaching_note: null, outcome: 'callback', channel: 'phone', status: 'completed', started_at: '2026-04-16T10:02:00Z', ended_at: '2026-04-16T10:05:07Z' },
  { id: '3', business_id: 'b1', va_id: 'v1', twilio_call_sid: null, contact_name: null, contact_number: '+44 121 496 0300', direction: 'outbound', area: 'Birmingham', duration_seconds: 28, sentiment_score: 30, intent_signal: null, ai_score: 32, flags: ['low sentiment'], recording_url: null, transcript: null, coaching_note: null, outcome: 'not_interested', channel: 'phone', status: 'completed', started_at: '2026-04-16T11:30:00Z', ended_at: '2026-04-16T11:30:28Z' },
  { id: '4', business_id: 'b1', va_id: 'v2', twilio_call_sid: null, contact_name: 'Tom Barnes', contact_number: '+44 113 496 0400', direction: 'outbound', area: 'Leeds', duration_seconds: 521, sentiment_score: 79, intent_signal: 'Interested', ai_score: 82, flags: [], recording_url: null, transcript: null, coaching_note: null, outcome: 'quote_sent', channel: 'phone', status: 'completed', started_at: '2026-04-16T13:15:00Z', ended_at: '2026-04-16T13:23:41Z' },
  { id: '5', business_id: 'b1', va_id: 'v1', twilio_call_sid: null, contact_name: 'Emma Clarke', contact_number: '+44 117 496 0500', direction: 'inbound', area: 'Bristol', duration_seconds: 302, sentiment_score: 85, intent_signal: 'Ready to book', ai_score: 91, flags: [], recording_url: null, transcript: null, coaching_note: null, outcome: 'booked', channel: 'phone', status: 'completed', started_at: '2026-04-16T14:00:00Z', ended_at: '2026-04-16T14:05:02Z' },
];

const OUTCOME_COLORS: Record<string, string> = {
  booked:         '#4ADE80',
  callback:       '#F59E0B',
  not_interested: '#FB7185',
  voicemail:      'rgba(255,255,255,0.3)',
  quote_sent:     '#818CF8',
  follow_up:      '#A78BFA',
};

type Filter = 'all' | 'booked' | 'callback' | 'flagged';

export default function LibraryPage() {
  const [calls, setCalls] = useState<Call[]>(DEMO_CALLS);
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<Call | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const supabase = createClient();

  useEffect(() => {
    setLoading(true);
    supabase
      .from('calls')
      .select('*')
      .eq('status', 'completed')
      .order('started_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data && data.length > 0) setCalls(data as Call[]);
        setLoading(false);
      });
  }, []);

  const filtered = calls.filter(c => {
    const matchSearch = !search || (c.contact_name?.toLowerCase().includes(search.toLowerCase()) || c.contact_number.includes(search) || c.area?.toLowerCase().includes(search.toLowerCase()));
    const matchFilter =
      filter === 'all' ? true :
      filter === 'booked' ? c.outcome === 'booked' :
      filter === 'callback' ? c.outcome === 'callback' :
      filter === 'flagged' ? c.flags.length > 0 : true;
    return matchSearch && matchFilter;
  });

  function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  function fmtDuration(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'white', letterSpacing: '-0.4px', marginBottom: 4 }}>Call Library</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{calls.length} calls · Click any row to review</div>
      </div>

      {selected && (
        <CallReviewModal call={selected} businessId="demo" onClose={() => setSelected(null)} />
      )}

      {/* Filters + search */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search contact, area…"
          style={{
            flex: 1, padding: '8px 12px',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10, fontSize: 13, color: 'white', outline: 'none',
          }}
        />
        {(['all','booked','callback','flagged'] as Filter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '7px 14px',
            background: filter === f ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
            color: filter === f ? 'white' : 'rgba(255,255,255,0.35)',
            border: `1px solid ${filter === f ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
            borderRadius: 8, fontSize: 12, fontWeight: filter === f ? 600 : 400, cursor: 'pointer',
            textTransform: 'capitalize',
          }}>{f}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1.8fr 1fr 0.7fr 0.7fr 0.8fr 1.2fr',
          padding: '10px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)',
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          <span>Contact</span><span>Area</span><span>Duration</span><span>Sentiment</span><span>Score</span><span>Outcome</span>
        </div>

        {/* Rows */}
        {filtered.map((call, i) => {
          const s = call.sentiment_score ?? 0;
          const sentColor = s >= 70 ? '#4ADE80' : s >= 45 ? '#F59E0B' : '#FB7185';
          return (
            <div
              key={call.id}
              onClick={() => setSelected(call)}
              style={{
                display: 'grid', gridTemplateColumns: '1.8fr 1fr 0.7fr 0.7fr 0.8fr 1.2fr',
                padding: '12px 16px',
                borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                cursor: 'pointer',
                transition: 'background 0.1s',
                alignItems: 'center',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div>
                <div style={{ fontSize: 13, color: 'white', fontWeight: 500, marginBottom: 2 }}>
                  {call.contact_name ?? call.contact_number}
                </div>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{fmtTime(call.started_at)} · {call.direction}</span>
                  {call.flags.map(f => <span key={f} style={{ fontSize: 9, color: '#F59E0B', fontWeight: 600, background: 'rgba(245,158,11,0.1)', padding: '1px 5px', borderRadius: 4 }}>{f}</span>)}
                </div>
              </div>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{call.area ?? '—'}</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'DM Mono, monospace' }}>{fmtDuration(call.duration_seconds)}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: sentColor }}>{s}%</div>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2, marginTop: 4, width: 48, overflow: 'hidden' }}>
                  <div style={{ width: `${s}%`, height: '100%', background: sentColor, borderRadius: 2 }}/>
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: (call.ai_score ?? 0) >= 70 ? '#4ADE80' : (call.ai_score ?? 0) >= 50 ? '#F59E0B' : '#FB7185' }}>
                {call.ai_score ?? '—'}
              </span>
              <span style={{
                display: 'inline-block', padding: '3px 8px',
                background: `${OUTCOME_COLORS[call.outcome ?? ''] ?? 'rgba(255,255,255,0.06)'}20`,
                color: OUTCOME_COLORS[call.outcome ?? ''] ?? 'rgba(255,255,255,0.3)',
                borderRadius: 20, fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
                border: `1px solid ${OUTCOME_COLORS[call.outcome ?? ''] ?? 'rgba(255,255,255,0.06)'}30`,
              }}>
                {(call.outcome ?? 'unknown').replace('_', ' ')}
              </span>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>No calls match this filter.</div>
        )}
      </div>
    </div>
  );
}
