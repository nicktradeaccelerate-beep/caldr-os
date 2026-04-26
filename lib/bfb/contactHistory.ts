import { getBfbClient } from '@/lib/supabase/bfb';

export interface BfbContact {
  id: string;
  name: string | null;
  email: string | null;
  phone: string;
  status: string | null;          // e.g. 'lead', 'quoted', 'customer', 'lost'
  lastContact: string | null;     // ISO date string
  notes: string | null;
  quoteValue: number | null;
  jobType: string | null;
  address: string | null;
}

const MOCK_CONTACTS: Record<string, BfbContact> = {
  '+442079460123': {
    id: 'mock-1',
    name: 'David Chen',
    email: 'david@example.com',
    phone: '+442079460123',
    status: 'quoted',
    lastContact: '2026-03-28',
    notes: 'Interested in boiler replacement. Quoted £3,200. Asked about finance options.',
    quoteValue: 3200,
    jobType: 'Boiler replacement',
    address: '14 Elm Street, London SE1 7PB',
  },
  '+447700900456': {
    id: 'mock-2',
    name: 'Sarah Williams',
    email: 'sarah.w@example.com',
    phone: '+447700900456',
    status: 'lead',
    lastContact: '2026-04-01',
    notes: 'Called about rewiring an old Victorian terrace. Needs survey first.',
    quoteValue: null,
    jobType: 'Rewire',
    address: '7 Oak Avenue, Brighton BN1 3AB',
  },
};

/**
 * Normalise a phone number to E.164 for matching.
 * Handles +44..., 044..., 07..., 01..., 02... formats.
 */
function normalisePhone(raw: string): string {
  const stripped = raw.replace(/[\s\-().]/g, '');
  if (stripped.startsWith('+44')) return stripped;
  if (stripped.startsWith('0044')) return '+44' + stripped.slice(4);
  if (stripped.startsWith('0')) return '+44' + stripped.slice(1);
  return stripped;
}

/**
 * Look up a phone number in bfb_leads.
 * Tries both E.164 (+44...) and local (0...) formats.
 *
 * Falls back to null gracefully when:
 * - crmIntegration === 'none' (returns mock if demo number matches)
 * - BFB env vars absent
 * - Lead not found
 */
export async function getContactHistory(
  rawNumber: string,
  crmIntegration: string = 'none'
): Promise<BfbContact | null> {
  const e164  = normalisePhone(rawNumber);
  const local = e164.replace(/^\+44/, '0');

  if (crmIntegration !== 'supabase_shared') {
    return MOCK_CONTACTS[e164] ?? MOCK_CONTACTS[local] ?? null;
  }

  const client = getBfbClient();
  if (!client) return null;

  try {
    // Try E.164 first, then local format
    const { data } = await client
      .from('bfb_leads')
      .select('id, name, email, phone, status, last_contact, notes, quote_value, job_type, address')
      .or(`phone.eq.${e164},phone.eq.${local}`)
      .order('last_contact', { ascending: false })
      .limit(1)
      .single();

    if (!data) return null;

    const row = data as {
      id: string;
      name: string | null;
      email: string | null;
      phone: string;
      status: string | null;
      last_contact: string | null;
      notes: string | null;
      quote_value: number | null;
      job_type: string | null;
      address: string | null;
    };

    return {
      id:          row.id,
      name:        row.name,
      email:       row.email,
      phone:       row.phone,
      status:      row.status,
      lastContact: row.last_contact,
      notes:       row.notes,
      quoteValue:  row.quote_value,
      jobType:     row.job_type,
      address:     row.address,
    };
  } catch {
    return null;
  }
}
