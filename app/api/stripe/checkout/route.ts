import { stripe, PLANS } from '@/lib/stripe/client';

export async function POST(req: Request) {
  const { businessId, planId, seats = 1 } = await req.json() as {
    businessId: string;
    planId: keyof typeof PLANS;
    seats?: number;
  };

  const plan = PLANS[planId];
  if (!plan) return Response.json({ error: 'Invalid plan' }, { status: 400 });

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: plan.priceId, quantity: seats }],
    metadata: { businessId, planId },
    success_url: `${process.env.NEXT_PUBLIC_URL}/?activated=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/admin/billing`,
  });

  return Response.json({ url: session.url });
}
