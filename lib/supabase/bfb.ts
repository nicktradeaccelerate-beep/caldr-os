import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _bfbClient: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase client pointed at the BFB project.
 * Uses BFB_SUPABASE_URL + BFB_SUPABASE_SERVICE_KEY (server-side only).
 * Returns null when env vars are missing so callers can fall back gracefully.
 */
export function getBfbClient(): SupabaseClient | null {
  if (_bfbClient) return _bfbClient;

  const url = process.env.BFB_SUPABASE_URL;
  const key = process.env.BFB_SUPABASE_SERVICE_KEY ?? process.env.BFB_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  _bfbClient = createClient(url, key, {
    auth: { persistSession: false },
  });

  return _bfbClient;
}
