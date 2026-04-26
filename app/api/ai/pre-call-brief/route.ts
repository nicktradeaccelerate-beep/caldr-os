import { generateText } from '@/lib/ai/claude';
import { PROMPTS } from '@/lib/ai/prompts';
import { createServiceClient } from '@/lib/supabase/server';
import { getContactHistory } from '@/lib/bfb/contactHistory';
import type { IncomingCall, CallHistory, Business } from '@/types';

export async function POST(req: Request) {
  const { call, businessId } = await req.json() as {
    call: IncomingCall;
    businessId: string;
  };

  const supabase = createServiceClient();

  const [businessResult, historyResult] = await Promise.all([
    supabase.from('businesses').select('*').eq('id', businessId).single(),
    supabase
      .from('calls')
      .select('outcome, ended_at')
      .eq('contact_number', call.number)
      .eq('business_id', businessId)
      .order('ended_at', { ascending: false })
      .limit(5),
  ]);

  const business = businessResult.data as Business | null;

  if (!business) {
    // Dev / demo mode — proceed without business context
  }

  const history: CallHistory[] = (historyResult.data ?? []).map(c => ({
    summary: c.outcome ?? 'Call completed',
    date: c.ended_at ?? '',
  }));

  // BFB CRM lookup
  const crmIntegration = (business as (Business & { crm_integration?: string }) | null)?.crm_integration ?? 'none';
  const contactHistory = await getContactHistory(call.number, crmIntegration);

  const systemPrompt = business
    ? PROMPTS.preCallBrief(call, history, business, contactHistory)
    : `You are a pre-call AI brief. Caller: ${call.contactName ?? 'Unknown'} from ${call.area ?? 'Unknown area'}. Give a 3-line brief.`;

  try {
    const brief = await generateText('Give me the pre-call brief now.', systemPrompt, 220);
    return Response.json({ brief, contactHistory });
  } catch {
    return Response.json({ brief: null, contactHistory }, { status: 200 });
  }
}
