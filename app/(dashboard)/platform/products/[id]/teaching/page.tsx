'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Project {
  id: string;
  name: string;
  slug: string;
}

interface TeachingVariant {
  id: string;
  product_id: string;
  content: {
    product_id?: string;
    product_name?: string;
    base_masterprompt_version?: string;
    teaching_variant?: Record<string, string>;
  };
  voice_profile: Record<string, string>;
  status: string;
  generated_at: string;
  is_active: boolean;
}

const BFB_DEFAULT_VOICE_PROFILE = {
  audience: 'Small business owners and sole traders in financial distress or recovery',
  commercial_instinct: 'Clarity > comfort. These clients need someone who tells them the truth, not someone who softens the blow.',
  key_methodology: 'Cash first, cost second, revenue third. No strategy until the immediate crisis is stabilised.',
  unacceptable: 'Vague recommendations, advice that doesn\'t account for cash flow timing, anything that sounds like consulting rather than operational action.',
  good_work: 'Specific, timed, accountable. "Do X by Friday because Y."',
};

export default function TeachingVariantPage() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [variant, setVariant] = useState<TeachingVariant | null>(null);
  const [voiceProfile, setVoiceProfile] = useState<Record<string, string>>({});
  const [editingVoice, setEditingVoice] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [savingVoice, setSavingVoice] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const supabase = createClient();

  const load = useCallback(async () => {
    const [projRes, varRes] = await Promise.all([
      supabase.from('projects').select('id, name, slug').eq('id', params.id).single(),
      supabase.from('teaching_masterprompts')
        .select('id, product_id, content, voice_profile, status, generated_at, is_active')
        .eq('product_id', params.id)
        .eq('is_active', true)
        .single(),
    ]);
    setProject(projRes.data ?? null);
    setVariant(varRes.data ?? null);
    setVoiceProfile((varRes.data?.voice_profile as Record<string, string>) ?? (projRes.data?.slug === 'bfb' ? BFB_DEFAULT_VOICE_PROFILE : {}));
  }, [supabase, params.id]);

  useEffect(() => { load(); }, [load]);

  async function generateVariant() {
    if (!project) return;
    setGenerating(true);

    try {
      const res = await fetch('/api/platform/teaching-variant/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, voiceProfile }),
      });
      const data = await res.json() as { variantId?: string; error?: string };
      if (data.error) {
        setNotification(`Error: ${data.error}`);
      } else {
        setNotification('Teaching variant generated.');
        await load();
      }
    } catch {
      setNotification('Generation failed — check Anthropic API key.');
    }
    setGenerating(false);
    setTimeout(() => setNotification(null), 4000);
  }

  async function saveVoiceProfile(regenerate: boolean) {
    if (!project) return;
    setSavingVoice(true);

    if (variant) {
      await supabase.from('teaching_masterprompts')
        .update({ voice_profile: voiceProfile })
        .eq('id', variant.id);
    }

    setEditingVoice(false);
    setSavingVoice(false);
    setNotification('Voice profile saved.');
    setTimeout(() => setNotification(null), 3000);

    if (regenerate) await generateVariant();
  }

  const voiceFields = [
    { key: 'audience', label: 'Audience' },
    { key: 'commercial_instinct', label: 'Commercial instinct' },
    { key: 'key_methodology', label: 'Key methodology principles' },
    { key: 'unacceptable', label: 'What\'s unacceptable' },
    { key: 'good_work', label: 'What good work looks like' },
  ];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Notification */}
      {notification && (
        <div style={{
          position: 'fixed', top: 20, right: 20, background: 'var(--accent)', color: 'white',
          padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 100,
        }}>
          {notification}
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Link href="/platform" style={{ fontSize: 13, color: 'var(--ink-2)', textDecoration: 'none' }}>Platform</Link>
          <span style={{ color: 'var(--ink-3)' }}>/</span>
          <Link href="/platform/products" style={{ fontSize: 13, color: 'var(--ink-2)', textDecoration: 'none' }}>Products</Link>
          <span style={{ color: 'var(--ink-3)' }}>/</span>
          <span style={{ fontSize: 13, color: 'var(--ink)' }}>{project?.name ?? '…'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
            Teaching variant — {project?.name}
          </h1>
          <button
            onClick={generateVariant}
            disabled={generating}
            style={{
              padding: '9px 18px', background: 'var(--accent)', color: 'white',
              border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: generating ? 'wait' : 'pointer',
            }}
          >
            {generating ? 'Generating…' : variant ? 'Regenerate' : 'Generate teaching variant'}
          </button>
        </div>
      </div>

      {/* Status */}
      <div style={{
        background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)',
        padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: variant ? '#16A34A' : '#D97706',
        }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
            {variant ? 'Active teaching variant' : 'No teaching variant'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
            {variant
              ? `Generated ${new Date(variant.generated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · Status: ${variant.status}`
              : 'Guide will use the default BFB voice until a variant is generated.'}
          </div>
        </div>
      </div>

      {/* Voice profile */}
      <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', padding: '18px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Voice profile</div>
          {!editingVoice && (
            <button
              onClick={() => setEditingVoice(true)}
              style={{ fontSize: 12, padding: '5px 12px', background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--ink-2)' }}
            >
              Edit voice
            </button>
          )}
        </div>

        {voiceFields.map(f => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
              {f.label}
            </div>
            {editingVoice ? (
              <textarea
                value={voiceProfile[f.key] ?? ''}
                onChange={e => setVoiceProfile(prev => ({ ...prev, [f.key]: e.target.value }))}
                rows={2}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            ) : (
              <p style={{ fontSize: 13, color: 'var(--ink)', margin: 0, lineHeight: 1.6 }}>
                {voiceProfile[f.key] ?? <span style={{ color: 'var(--ink-3)' }}>Not set</span>}
              </p>
            )}
          </div>
        ))}

        {editingVoice && (
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button
              onClick={() => saveVoiceProfile(true)}
              disabled={savingVoice}
              style={{ flex: 1, padding: '9px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Save & regenerate variant
            </button>
            <button
              onClick={() => saveVoiceProfile(false)}
              disabled={savingVoice}
              style={{ padding: '9px 16px', background: 'none', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, cursor: 'pointer', color: 'var(--ink-2)' }}
            >
              Save only
            </button>
            <button
              onClick={() => setEditingVoice(false)}
              style={{ padding: '9px 16px', background: 'none', border: 'none', fontSize: 12, cursor: 'pointer', color: 'var(--ink-3)' }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Generated content preview */}
      {variant?.content?.teaching_variant && (
        <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', padding: '18px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>Generated variant preview</div>
          {Object.entries(variant.content.teaching_variant).map(([key, value]) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
                {key.replace(/_/g, ' ')}
              </div>
              <p style={{ fontSize: 12, color: 'var(--ink)', margin: 0, lineHeight: 1.6, fontFamily: 'monospace', background: 'var(--card)', padding: '8px 10px', borderRadius: 6 }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
