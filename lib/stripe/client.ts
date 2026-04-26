import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not set');
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

// Keep named export for convenience — lazy singleton
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as never)[prop];
  },
});

export const PLANS = {
  starter: {
    name: 'Starter',
    price: 1200,
    priceId: process.env.STRIPE_STARTER_PRICE_ID ?? '',
    features: ['uk_number', 'unlimited_inbound', '500_outbound_mins', 'voicemail_email'] as const,
  },
  professional: {
    name: 'Professional',
    price: 1900,
    priceId: process.env.STRIPE_PRO_PRICE_ID ?? '',
    features: ['everything_starter', 'recording', 'transcription', 'sentiment', 'crm_log', 'time_tracker', 'clippy'] as const,
  },
  intelligence: {
    name: 'Intelligence',
    price: 3500,
    priceId: process.env.STRIPE_INTEL_PRICE_ID ?? '',
    features: ['everything_professional', 'intent_detection', 'live_coaching', 'lexivo', 'priority_support'] as const,
  },
  os: {
    name: 'Caldr OS',
    price: 2900,
    priceId: process.env.STRIPE_OS_PRICE_ID ?? '',
    features: ['everything_professional', 'ai_hub', 'code_env', 'task_manager', 'daily_brief', 'boss_updates'] as const,
  },
} as const;
