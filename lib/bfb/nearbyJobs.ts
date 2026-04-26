import { getBfbClient } from '@/lib/supabase/bfb';

export interface BfbJob {
  id: string;
  address: string;
  postcode: string;
  job_type: string;
  value: number | null;
  status: string;
  completed_at: string | null;
  lat: number;
  lng: number;
}

export interface NearbyJob {
  id: string;
  address: string;
  postcode: string;
  jobType: string;
  value: string | null;
  status: string;
  completedAt: string | null;
  lat: number;
  lng: number;
  distanceKm?: number;
}

// ±0.05 lat ≈ ±5.5 km, ±0.07 lng ≈ ±4.5 km at UK latitudes
const LAT_DELTA = 0.05;
const LNG_DELTA = 0.07;

function formatValue(pence: number | null): string | null {
  if (pence == null) return null;
  // Assume values stored in pounds already; if >10000 likely pence
  const pounds = pence > 10000 ? pence / 100 : pence;
  return `£${Math.round(pounds).toLocaleString('en-GB')}`;
}

const MOCK_JOBS: NearbyJob[] = [
  { id: 'm1', address: '14 Elm Street',    postcode: 'SE1 7PB', jobType: 'Boiler replacement', value: '£3,200', status: 'completed', completedAt: '2026-03-10', lat: 51.500, lng: -0.085 },
  { id: 'm2', address: '7 Oak Avenue',     postcode: 'SE1 5AB', jobType: 'Rewire',              value: '£5,400', status: 'completed', completedAt: '2026-02-22', lat: 51.508, lng: -0.095 },
  { id: 'm3', address: '22 Cedar Road',    postcode: 'SE1 9CD', jobType: 'Survey',              value: '£850',   status: 'completed', completedAt: '2026-01-14', lat: 51.503, lng: -0.100 },
  { id: 'm4', address: '8 Birch Lane',     postcode: 'SE1 2EF', jobType: 'Solar install',       value: '£9,600', status: 'completed', completedAt: '2025-12-05', lat: 51.495, lng: -0.082 },
  { id: 'm5', address: '30 Willow Close',  postcode: 'SE1 6GH', jobType: 'Heat pump',           value: '£12,000', status: 'completed', completedAt: '2025-11-20', lat: 51.512, lng: -0.078 },
];

/**
 * Fetch the 8 most recent completed BFB jobs within a bounding box
 * centred on lat/lng.
 *
 * Falls back to MOCK_JOBS when:
 * - crmIntegration === 'none'
 * - BFB env vars are absent
 * - The BFB project is unreachable
 */
export async function getNearbyJobs(
  lat: number,
  lng: number,
  crmIntegration: string = 'none'
): Promise<NearbyJob[]> {
  if (crmIntegration !== 'supabase_shared') {
    // Return mock pins translated near the provided coordinates
    return MOCK_JOBS.map((j, i) => ({
      ...j,
      lat: lat + (i % 3 === 0 ? 0.008 : i % 3 === 1 ? -0.006 : 0.012) * (i % 2 === 0 ? 1 : -1),
      lng: lng + (i % 3 === 0 ? 0.01  : i % 3 === 1 ? -0.008 : 0.015) * (i % 2 === 0 ? 1 : -1),
    }));
  }

  const client = getBfbClient();
  if (!client) return MOCK_JOBS;

  try {
    const { data, error } = await client
      .from('bfb_jobs')
      .select('id, address, postcode, job_type, value, status, completed_at, lat, lng')
      .eq('status', 'completed')
      .gte('lat', lat - LAT_DELTA)
      .lte('lat', lat + LAT_DELTA)
      .gte('lng', lng - LNG_DELTA)
      .lte('lng', lng + LNG_DELTA)
      .not('lat', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(8);

    if (error || !data) return [];

    return (data as BfbJob[]).map(j => ({
      id:          j.id,
      address:     j.address,
      postcode:    j.postcode,
      jobType:     j.job_type,
      value:       formatValue(j.value),
      status:      j.status,
      completedAt: j.completed_at,
      lat:         j.lat,
      lng:         j.lng,
    }));
  } catch {
    return [];
  }
}
