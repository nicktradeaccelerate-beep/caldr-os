import { getBfbClient } from '@/lib/supabase/bfb';

// Real BFB database row shape (client_jobs table)
interface ClientJobRow {
  id: string;
  address: string;
  postcode: string;
  finish_type: string;
  property_type: string;
  job_date: string | null;
  latitude: number | null;
  longitude: number | null;
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

// Chichester-area fallback pins (PO19/PO20 postcodes — BFB home base)
const MOCK_JOBS: NearbyJob[] = [
  { id: 'm1', address: '4 The Hornet',         postcode: 'PO19 7JG', jobType: 'Victorian lime render',      value: null, status: 'completed', completedAt: '2026-03-10', lat: 50.836, lng: -0.774 },
  { id: 'm2', address: '12 Westgate',          postcode: 'PO19 3EX', jobType: 'Heritage masonry restoration', value: null, status: 'completed', completedAt: '2026-02-22', lat: 50.831, lng: -0.782 },
  { id: 'm3', address: '7 St Pancras',         postcode: 'PO19 7LT', jobType: 'Period property exterior',   value: null, status: 'completed', completedAt: '2026-01-14', lat: 50.838, lng: -0.778 },
  { id: 'm4', address: '22 Lavant Road',       postcode: 'PO19 5RG', jobType: 'Lime wash & repoint',        value: null, status: 'completed', completedAt: '2025-12-05', lat: 50.843, lng: -0.769 },
  { id: 'm5', address: '3 Cawley Road',        postcode: 'PO19 1XB', jobType: 'Exterior restoration',       value: null, status: 'completed', completedAt: '2025-11-20', lat: 50.829, lng: -0.785 },
];

/**
 * Fetch the 8 most recent geolocated BFB client jobs within a bounding box
 * centred on lat/lng.
 *
 * Uses the real BFB client_jobs table when BFB_SUPABASE_URL +
 * BFB_SUPABASE_SERVICE_KEY are configured; falls back to Chichester-area
 * mock pins otherwise.
 */
export async function getNearbyJobs(
  lat: number,
  lng: number,
  _crmIntegration: string = 'none'
): Promise<NearbyJob[]> {
  const client = getBfbClient();

  if (!client) {
    // No env vars — return mock pins translated near the provided coordinates
    return MOCK_JOBS.map((j, i) => ({
      ...j,
      lat: lat + (i % 3 === 0 ? 0.008 : i % 3 === 1 ? -0.006 : 0.012) * (i % 2 === 0 ? 1 : -1),
      lng: lng + (i % 3 === 0 ? 0.01  : i % 3 === 1 ? -0.008 : 0.015) * (i % 2 === 0 ? 1 : -1),
    }));
  }

  try {
    const { data, error } = await client
      .from('client_jobs')
      .select('id, address, postcode, finish_type, property_type, job_date, latitude, longitude')
      .gte('latitude', lat - LAT_DELTA)
      .lte('latitude', lat + LAT_DELTA)
      .gte('longitude', lng - LNG_DELTA)
      .lte('longitude', lng + LNG_DELTA)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('job_date', { ascending: false })
      .limit(8);

    if (error || !data || (data as ClientJobRow[]).length === 0) return MOCK_JOBS;

    return (data as ClientJobRow[]).map(j => ({
      id:          j.id,
      address:     j.address,
      postcode:    j.postcode,
      jobType:     j.finish_type || j.property_type || 'Restoration',
      value:       null,
      status:      'completed',
      completedAt: j.job_date,
      lat:         j.latitude!,
      lng:         j.longitude!,
    }));
  } catch {
    return MOCK_JOBS;
  }
}
