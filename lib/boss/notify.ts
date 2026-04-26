import { Resend } from 'resend';
import { twilioClient } from '@/lib/twilio/client';
import { createServiceClient } from '@/lib/supabase/server';
import type { Business, BossUpdateType, BossUpdatePayload } from '@/types';

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!);
  return _resend;
}

export async function notifyBoss(
  type: BossUpdateType,
  payload: BossUpdatePayload,
  business: Business
) {
  const message = formatBossMessage(type, payload);
  const supabase = createServiceClient();

  // Always log to database
  await supabase.from('boss_updates').insert({
    business_id: business.id,
    va_id: payload.vaId,
    type,
    message,
    task_id: payload.taskId ?? null,
    call_id: payload.callId ?? null,
  });

  // WhatsApp — fire and forget, non-blocking
  if (business.notifyWhatsApp && business.ownerWhatsApp) {
    twilioClient.messages.create({
      from: `whatsapp:${business.whatsappNumber}`,
      to: `whatsapp:${business.ownerWhatsApp}`,
      body: message,
    }).catch(() => {}); // never block on delivery
  }

  // Email — daily summary only
  if (business.notifyEmail && business.ownerEmail && type === 'daily_summary') {
    getResend().emails.send({
      from: 'updates@caldr.ai',
      to: business.ownerEmail,
      subject: `${payload.vaName}'s shift summary — ${new Date().toLocaleDateString('en-GB')}`,
      text: message,
    }).catch(() => {});
  }
}

function formatBossMessage(type: string, payload: BossUpdatePayload): string {
  const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  switch (type) {
    case 'task_start':
      return `⏱ ${time} — ${payload.vaName} started: "${payload.taskText}"`;
    case 'task_complete':
      return `✅ ${time} — ${payload.vaName} completed: "${payload.taskText}" (${payload.duration}) ${payload.hearts}♥`;
    case 'working':
      return `🔄 ${time} — ${payload.vaName} is working on: "${payload.taskText}"`;
    case 'daily_summary':
      return formatDailySummary(payload);
    default:
      return '';
  }
}

function formatDailySummary(payload: BossUpdatePayload): string {
  const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  return `📊 Daily Summary — ${payload.vaName} — ${date}\n\nFull report available at os.caldr.ai`;
}
