import { updateBfbLead } from '@/lib/bfb/updateLead';
import { createServiceClient } from '@/lib/supabase/server';

export async function PATCH(req: Request) {
  const body = await req.json() as {
    leadId: string;
    businessId: string;
    status?: string;
    notes?: string;
    lastContact?: string;
  };

  if (!body.leadId || !body.businessId) {
    return Response.json({ error: 'leadId and businessId required' }, { status: 400 });
  }

  // Resolve crm_integration
  let crmIntegration = 'none';
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('businesses')
      .select('crm_integration')
      .eq('id', body.businessId)
      .single();
    crmIntegration = (data as { crm_integration?: string } | null)?.crm_integration ?? 'none';
  } catch {
    // default to none
  }

  const ok = await updateBfbLead(
    { leadId: body.leadId, status: body.status, notes: body.notes, lastContact: body.lastContact },
    crmIntegration
  );

  if (!ok) return Response.json({ error: 'BFB update failed' }, { status: 500 });
  return Response.json({ success: true });
}
