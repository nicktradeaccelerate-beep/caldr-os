/**
 * Geocode BFB jobs that have no lat/lng.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/geocode-bfb-jobs.ts
 *
 * Required env vars (can be in .env.local or set in shell):
 *   BFB_SUPABASE_URL
 *   BFB_SUPABASE_SERVICE_KEY
 */

import { createClient } from '@supabase/supabase-js';

const BFB_URL  = process.env.BFB_SUPABASE_URL;
const BFB_KEY  = process.env.BFB_SUPABASE_SERVICE_KEY;
const RATE_MS  = 50;   // 50ms between postcodes.io calls

if (!BFB_URL || !BFB_KEY) {
  console.error('ERROR: BFB_SUPABASE_URL and BFB_SUPABASE_SERVICE_KEY must be set.');
  process.exit(1);
}

const supabase = createClient(BFB_URL, BFB_KEY, { auth: { persistSession: false } });

interface BfbJobRow {
  id: string;
  postcode: string | null;
}

interface PostcodesResult {
  result: { latitude: number; longitude: number } | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function geocodePostcode(postcode: string): Promise<{ lat: number; lng: number } | null> {
  const clean = postcode.replace(/\s+/g, '').toUpperCase();
  const url = `https://api.postcodes.io/postcodes/${encodeURIComponent(clean)}`;
  try {
    const res  = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json() as PostcodesResult;
    if (!json.result) return null;
    return { lat: json.result.latitude, lng: json.result.longitude };
  } catch {
    return null;
  }
}

async function main() {
  console.log('Fetching bfb_jobs where lat IS NULL…');

  const { data: jobs, error } = await supabase
    .from('bfb_jobs')
    .select('id, postcode')
    .is('lat', null);

  if (error) {
    console.error('Supabase error:', error.message);
    process.exit(1);
  }

  if (!jobs || jobs.length === 0) {
    console.log('All jobs already geocoded. Nothing to do.');
    return;
  }

  console.log(`Found ${jobs.length} un-geocoded jobs.`);

  let ok = 0, skipped = 0, failed = 0;

  for (let i = 0; i < (jobs as BfbJobRow[]).length; i++) {
    const job = (jobs as BfbJobRow[])[i];

    if (!job.postcode) {
      console.log(`[${i + 1}/${jobs.length}] ${job.id} — no postcode, skipping`);
      skipped++;
      continue;
    }

    const coords = await geocodePostcode(job.postcode);

    if (!coords) {
      console.warn(`[${i + 1}/${jobs.length}] ${job.id} — postcode "${job.postcode}" not found`);
      failed++;
    } else {
      const { error: updateError } = await supabase
        .from('bfb_jobs')
        .update({ lat: coords.lat, lng: coords.lng })
        .eq('id', job.id);

      if (updateError) {
        console.error(`[${i + 1}/${jobs.length}] ${job.id} — update failed: ${updateError.message}`);
        failed++;
      } else {
        console.log(`[${i + 1}/${jobs.length}] ${job.id} — ${job.postcode} → ${coords.lat}, ${coords.lng}`);
        ok++;
      }
    }

    // Rate limit: 50ms between API calls (postcodes.io allows ~50 rps)
    if (i < jobs.length - 1) await sleep(RATE_MS);
  }

  console.log('\n─────────────────────────────');
  console.log(`Done. Geocoded: ${ok}  Skipped: ${skipped}  Failed: ${failed}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
