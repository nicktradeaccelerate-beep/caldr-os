'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Stats {
  shipped: number;
  streak: number;
  skills: string[];
}

const MILESTONES = [1, 5, 10, 25, 50];

function milestone(shipped: number): { current: number; next: number; label: string } {
  const next = MILESTONES.find(m => m > shipped) ?? MILESTONES[MILESTONES.length - 1];
  const current = MILESTONES.filter(m => m <= shipped).pop() ?? 0;
  const pct = next === current ? 100 : Math.round(((shipped - current) / (next - current)) * 100);
  return { current, next, label: shipped >= 50 ? 'Expert' : shipped >= 25 ? 'Senior' : shipped >= 10 ? 'Practitioner' : shipped >= 5 ? 'Developing' : shipped >= 1 ? 'Started' : 'New' };
}

function milestoneBar(shipped: number): number {
  const next = MILESTONES.find(m => m > shipped) ?? 50;
  const prev = MILESTONES.filter(m => m <= shipped).pop() ?? 0;
  if (shipped >= 50) return 100;
  return Math.round(((shipped - prev) / (next - prev)) * 100);
}

function nextMilestoneLabel(shipped: number): string {
  const next = MILESTONES.find(m => m > shipped);
  if (!next) return 'Max reached';
  return `${next - shipped} to next`;
}

export default function ProgressWidget({ userId }: { userId: string | null }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const supabase = createClient();

  const load = useCallback(async () => {
    if (!userId) return;

    // Approved submissions
    const { data: subs } = await supabase
      .from('submissions')
      .select('submitted_at, projects(name, module_type)')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .order('submitted_at', { ascending: false });

    const shipped = subs?.length ?? 0;

    // Streak — consecutive days with a submission or action
    const { data: actions } = await supabase
      .from('actions')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(60);

    const days = new Set([
      ...(subs ?? []).map(s => s.submitted_at?.split('T')[0]).filter(Boolean),
      ...(actions ?? []).map(a => (a.created_at as string)?.split('T')[0]).filter(Boolean),
    ]);

    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (days.has(d.toISOString().split('T')[0])) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    // Skills from approved work
    const skillSet = new Set<string>();
    (subs ?? []).forEach(s => {
      const proj = s.projects as { name?: string; module_type?: string } | null;
      if (proj?.module_type === 'bfb' || proj?.name?.toLowerCase().includes('bfb')) skillSet.add('BFB Advisory');
      if (proj?.module_type === 'email') skillSet.add('Email Copy');
    });
    if (shipped >= 1) skillSet.add('Task Delivery');
    if (shipped >= 3) skillSet.add('Consistent');
    if (streak >= 3) skillSet.add('Active');

    setStats({ shipped, streak, skills: Array.from(skillSet) });
  }, [supabase, userId]);

  useEffect(() => { load(); }, [load]);

  if (!stats) return null;

  const { shipped, streak, skills } = stats;
  const bar = milestoneBar(shipped);
  const { label: milestoneLabel } = milestone(shipped);

  return (
    <div style={{ padding: '12px 16px', borderTop: '1px solid #E2E8F0' }}>
      {/* Section label */}
      <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
        Progress
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, background: '#F8FAFC', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1B4332', letterSpacing: '-0.5px', lineHeight: 1 }}>
            {shipped}
          </div>
          <div style={{ fontSize: 9, color: '#94A3B8', marginTop: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Shipped
          </div>
        </div>
        <div style={{ flex: 1, background: '#F8FAFC', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: streak >= 3 ? '#D97706' : '#475569', letterSpacing: '-0.5px', lineHeight: 1 }}>
            {streak}
          </div>
          <div style={{ fontSize: 9, color: '#94A3B8', marginTop: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {streak === 1 ? 'Day' : 'Day streak'}
          </div>
        </div>
      </div>

      {/* Milestone bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>{milestoneLabel}</span>
          <span style={{ fontSize: 10, color: '#94A3B8' }}>{nextMilestoneLabel(shipped)}</span>
        </div>
        <div style={{ height: 5, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${bar}%`,
            background: 'linear-gradient(90deg, #1B4332 0%, #2D6A4F 100%)',
            borderRadius: 3,
            transition: 'width 0.6s ease',
          }} />
        </div>
      </div>

      {/* Skill tags */}
      {skills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {skills.map(skill => (
            <span key={skill} style={{
              fontSize: 10, fontWeight: 600, color: '#1B4332',
              background: '#DCFCE7', padding: '2px 7px', borderRadius: 10,
              border: '1px solid #BBF7D0',
            }}>
              {skill}
            </span>
          ))}
        </div>
      )}

      {shipped === 0 && (
        <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.5 }}>
          Complete your first task to start tracking progress.
        </div>
      )}
    </div>
  );
}
