import { stripe } from '@/lib/stripe/client';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const { businessId } = await req.json() as { businessId: string };

  if (!businessId) return Response.json({ error: 'businessId required' }, { status: 400 });

  const supabase = createServiceClient();
  const { data: business } = await supabase
    .from('businesses')
    .select('stripe_customer_id')
    .eq('id', businessId)
    .single();

  if (!business?.stripe_customer_id) {
    return Response.json({ error: 'No Stripe customer found. Subscribe to a plan first.' }, { status: 400 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: business.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_URL}/admin/billing`,
  });

  return Response.json({ url: session.url });
}
