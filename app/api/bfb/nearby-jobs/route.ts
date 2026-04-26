import { getNearbyJobs } from '@/lib/bfb/nearbyJobs';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = parseFloat(url.searchParams.get('lat') ?? '');
  const lng = parseFloat(url.searchParams.get('lng') ?? '');
  const businessId = url.searchParams.get('businessId') ?? '';

  if (isNaN(lat) || isNaN(lng)) {
    return Response.json({ error: 'lat and lng required' }, { status: 400 });
  }

  // Look up crm_integration setting for this business
  let crmIntegration = 'none';
  if (businessId) {
    try {
      const supabase = createServiceClient();
      const { data } = await supabase
        .from('businesses')
        .select('crm_integration')
        .eq('id', businessId)
        .single();
      crmIntegration = (data as { crm_integration?: string } | null)?.crm_integration ?? 'none';
    } catch {
      // default to none
    }
  }

  const jobs = await getNearbyJobs(lat, lng, crmIntegration);
  return Response.json({ jobs });
}
