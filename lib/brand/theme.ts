// Brand theme loaded from businesses table — injected into BrandContext
export interface BrandConfig {
  businessId: string;
  businessName: string;
  shortName: string;
  accentColor: string;       // hex, e.g. #1B4332
  logoUrl: string | null;
  clippyName: string;        // default 'Clippy'
  font: 'dm-sans' | 'inter' | 'system';
  domain: string | null;
  onboardingCopy: string | null;
  plan: string;
}

export const DEFAULT_BRAND: BrandConfig = {
  businessId: '',
  businessName: 'Caldr OS',
  shortName: 'Caldr',
  // Newton & Sinclair house default: oxblood.
  // Per-business white-label can override via businesses.accent_color.
  accentColor: '#5C1A1A',
  logoUrl: null,
  clippyName: 'Clippy',
  font: 'dm-sans',
  domain: null,
  onboardingCopy: null,
  plan: 'starter',
};

// Derive CSS variables from brand config
export function brandToCSSVars(brand: BrandConfig): Record<string, string> {
  const hex = brand.accentColor;
  // Derive mid and light from base accent (simplified — no external colour lib)
  return {
    '--accent':       hex,
    '--accent-mid':   lighten(hex, 20),
    '--accent-light': lighten(hex, 80),
    '--accent-pale':  lighten(hex, 90),
  };
}

// Minimal hex lightener — no deps
function lighten(hex: string, percent: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (n >> 16) + Math.round((255 - (n >> 16)) * percent / 100));
  const g = Math.min(255, ((n >> 8) & 0xFF) + Math.round((255 - ((n >> 8) & 0xFF)) * percent / 100));
  const b = Math.min(255, (n & 0xFF) + Math.round((255 - (n & 0xFF)) * percent / 100));
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}
