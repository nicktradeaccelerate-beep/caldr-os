'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DEFAULT_BRAND, brandToCSSVars } from '@/lib/brand/theme';
import type { BrandConfig } from '@/lib/brand/theme';

const BrandContext = createContext<BrandConfig>(DEFAULT_BRAND);

export function useBrand() {
  return useContext(BrandContext);
}

interface BrandProviderProps {
  children: React.ReactNode;
  initialBrand?: BrandConfig;
}

interface BusinessRow {
  id: string;
  name: string;
  short_name: string;
  accent_color: string;
  logo_url: string | null;
  clippy_name?: string;
  font?: string;
  domain?: string | null;
  onboarding_copy?: string | null;
  plan: string;
}

export function BrandProvider({ children, initialBrand }: BrandProviderProps) {
  const [brand, setBrand] = useState<BrandConfig>(initialBrand ?? DEFAULT_BRAND);
  const supabase = createClient();

  useEffect(() => {
    // Load brand from authenticated user's business
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: user } = await supabase
        .from('users')
        .select('business_id')
        .eq('id', data.user.id)
        .single();
      if (!user?.business_id) return;

      const { data: biz } = await supabase
        .from('businesses')
        .select('id, name, short_name, accent_color, logo_url, clippy_name, font, domain, onboarding_copy, plan')
        .eq('id', user.business_id)
        .single();

      if (biz) {
        const b = biz as BusinessRow;
        setBrand({
          businessId:    b.id,
          businessName:  b.name,
          shortName:     b.short_name,
          accentColor:   b.accent_color ?? DEFAULT_BRAND.accentColor,
          logoUrl:       b.logo_url,
          clippyName:    b.clippy_name ?? 'Clippy',
          font:          (b.font as BrandConfig['font']) ?? 'dm-sans',
          domain:        b.domain ?? null,
          onboardingCopy: b.onboarding_copy ?? null,
          plan:          b.plan ?? 'starter',
        });
      }
    });
  }, []);

  // Inject CSS variables whenever brand changes
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const vars = brandToCSSVars(brand);
    for (const [k, v] of Object.entries(vars)) {
      document.documentElement.style.setProperty(k, v);
    }
    // Font
    if (brand.font === 'inter') {
      document.documentElement.style.setProperty('--font-body', "'Inter', sans-serif");
    } else if (brand.font === 'system') {
      document.documentElement.style.setProperty('--font-body', "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif");
    } else {
      document.documentElement.style.setProperty('--font-body', "'DM Sans', sans-serif");
    }
  }, [brand]);

  return (
    <BrandContext.Provider value={brand}>
      {children}
    </BrandContext.Provider>
  );
}
