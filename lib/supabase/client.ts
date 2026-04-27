import { createBrowserClient } from '@supabase/auth-helpers-nextjs';

// Placeholder values prevent crashes at build time when env vars are not yet set.
// At runtime, real values are required.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const createClient = () =>
  createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { flowType: 'implicit' },
  });
