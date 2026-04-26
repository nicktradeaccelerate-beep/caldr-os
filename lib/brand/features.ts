import type { PlanId } from '@/types';

// Feature flags per plan tier
// Each plan includes all features of the tiers below it
export const PLAN_FEATURES = {
  starter: [
    'calls',           // Basic VoIP calling
    'tasks',           // Task manager
    'inbound',         // Unlimited inbound
    'outbound_500',    // 500 outbound minutes
    'voicemail_email', // Voicemail to email
  ],
  professional: [
    'calls', 'tasks', 'inbound', 'outbound_500', 'voicemail_email',
    'recording',       // Call recording
    'transcription',   // AI transcription
    'sentiment',       // Sentiment analysis
    'crm_log',         // CRM call logging
    'time_tracker',    // Shift clock + hearts
    'clippy',          // Clippy AI assistant
    'boss_updates',    // Boss WhatsApp + email updates
  ],
  intelligence: [
    'calls', 'tasks', 'inbound', 'outbound_500', 'voicemail_email',
    'recording', 'transcription', 'sentiment', 'crm_log', 'time_tracker', 'clippy', 'boss_updates',
    'intent_detection', // Live intent signals
    'live_coaching',    // Real-time call coaching
    'pre_call_brief',   // AI pre-call brief
    'post_call_debrief',// AI post-call debrief
    'supervisor',       // Listen/whisper/barge
    'call_map',         // Geographic call map
  ],
  os: [
    'calls', 'tasks', 'inbound', 'outbound_500', 'voicemail_email',
    'recording', 'transcription', 'sentiment', 'crm_log', 'time_tracker', 'clippy', 'boss_updates',
    'intent_detection', 'live_coaching', 'pre_call_brief', 'post_call_debrief', 'supervisor', 'call_map',
    'ai_hub',           // Multi-model AI hub
    'code_env',         // Code environment
    'daily_brief',      // Morning AI briefing
    'master_view',      // Manager dashboard
    'white_label',      // Brand customisation
    'api_access',       // API integrations
  ],
} as const;

export type Feature = typeof PLAN_FEATURES['os'][number];

export function hasFeature(plan: PlanId | null | undefined, feature: Feature): boolean {
  const p = plan ?? 'starter';
  const features = PLAN_FEATURES[p] as readonly string[];
  return features.includes(feature);
}

// Plan tier order for upgrade/downgrade comparisons
const TIER_ORDER: PlanId[] = ['starter', 'professional', 'intelligence', 'os'];

export function planTier(plan: PlanId): number {
  return TIER_ORDER.indexOf(plan);
}

export function isUpgrade(from: PlanId, to: PlanId): boolean {
  return planTier(to) > planTier(from);
}
