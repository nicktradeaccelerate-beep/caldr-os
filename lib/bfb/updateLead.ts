import { getBfbClient } from '@/lib/supabase/bfb';

interface LeadUpdate {
  leadId: string;
  status?: string;
  notes?: string;
  lastContact?: string;   // ISO date string, defaults to today
}

/**
 * Write call outcome back to bfb_leads.
 * No-ops silently when crmIntegration !== 'supabase_shared'.
 */
export async function updateBfbLead(
  update: LeadUpdate,
  crmIntegration: string = 'none'
): Promise<boolean> {
  if (crmIntegration !== 'supabase_shared') return true; // mock success

  const client = getBfbClient();
  if (!client) return false;

  const today = new Date().toISOString().split('T')[0];

  try {
    const { error } = await client
      .from('bfb_leads')
      .update({
        ...(update.status       && { status:       update.status }),
        ...(update.notes        && { notes:         update.notes }),
        last_contact: update.lastContact ?? today,
      })
      .eq('id', update.leadId);

    return !error;
  } catch {
    return false;
  }
}
