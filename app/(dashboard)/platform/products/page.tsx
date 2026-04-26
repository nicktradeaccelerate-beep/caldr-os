'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Project {
  id: string;
  name: string;
  slug: string;
  module_type: string;
  description: string | null;
  created_at: string;
}

interface TeachingVariant {
  product_id: string;
  is_active: boolean;
  generated_at: string;
  status: string;
}

export default function ProductsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [variants, setVariants] = useState<TeachingVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    const [projRes, varRes] = await Promise.all([
      supabase.from('projects').select('id, name, slug, module_type, description, created_at').order('created_at'),
      supabase.from('teaching_masterprompts').select('product_id, is_active, generated_at, status').eq('is_active', true),
    ]);
    setProjects((projRes.data ?? []) as Project[]);
    setVariants((varRes.data ?? []) as TeachingVariant[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Link href="/platform" style={{ fontSize: 13, color: 'var(--ink-2)', textDecoration: 'none' }}>Platform</Link>
          <span style={{ color: 'var(--ink-3)' }}>/</span>
          <span style={{ fontSize: 13, color: 'var(--ink)' }}>Products</span>
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Product modules</h1>
      </div>

      {loading ? (
        <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
      ) : (
        <div>
          {projects.map(project => {
            const variant = variants.find(v => v.product_id === project.id);
            return (
              <div key={project.id} style={{
                background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)',
                padding: '18px 20px', marginBottom: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}>{project.name}</div>
                    {project.description && (
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', maxWidth: 500 }}>{project.description}</div>
                    )}
                  </div>
                  <Link href={`/platform/products/${project.id}/teaching`} style={{
                    fontSize: 12, padding: '6px 14px', background: 'var(--accent-light)',
                    color: 'var(--accent)', border: 'none', borderRadius: 6,
                    textDecoration: 'none', fontWeight: 600,
                  }}>
                    Teaching variant →
                  </Link>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, background: '#F1F5F9', color: '#64748B', padding: '2px 8px', borderRadius: 4 }}>
                    {project.module_type.toUpperCase()}
                  </span>
                  {variant ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />
                      <span style={{ fontSize: 11, color: '#16A34A' }}>
                        Teaching variant active · Generated {new Date(variant.generated_at).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#D97706', display: 'inline-block' }} />
                      <span style={{ fontSize: 11, color: '#D97706' }}>No teaching variant — Guide uses default</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
