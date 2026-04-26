import { stripe, PLANS } from '@/lib/stripe/client';
import { createServiceClient } from '@/lib/supabase/server';
import type Stripe from 'stripe';

// Map Stripe price ID → plan slug
function priceIdToPlan(priceId: string): string {
  for (const [slug, plan] of Object.entries(PLANS)) {
    if (plan.priceId === priceId) return slug;
  }
  return 'starter';
}

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')!;
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  const supabase = createServiceClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await supabase.from('businesses').update({
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        plan: session.metadata?.planId ?? 'starter',
      }).eq('id', session.metadata?.businessId);
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const priceId = sub.items.data[0]?.price?.id ?? '';
      const plan = priceIdToPlan(priceId);
      await supabase.from('businesses')
        .update({ plan, stripe_subscription_id: sub.id })
        .eq('stripe_customer_id', sub.customer as string);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await supabase.from('businesses')
        .update({ plan: 'starter', stripe_subscription_id: null })
        .eq('stripe_subscription_id', sub.id);
      break;
    }

    case 'invoice.payment_failed': {
      // Optionally: flag business as payment_failed, send email
      break;
    }
  }

  return Response.json({ received: true });
}
