import { createServiceClient } from '@/lib/supabase/server';

export async function PATCH(req: Request) {
  const body = await req.json() as {
    businessId: string;
    accentColor?: string;
    clippyName?: string;
    font?: string;
    domain?: string;
    onboardingCopy?: string;
    notifyWhatsApp?: boolean;
    notifyEmail?: boolean;
    ownerWhatsApp?: string;
    ownerEmail?: string;
  };

  if (!body.businessId) return Response.json({ error: 'businessId required' }, { status: 400 });

  const supabase = createServiceClient();

  const update: Record<string, unknown> = {};
  if (body.accentColor   !== undefined) update.accent_color    = body.accentColor;
  if (body.clippyName    !== undefined) update.clippy_name     = body.clippyName;
  if (body.font          !== undefined) update.font             = body.font;
  if (body.domain        !== undefined) update.domain          = body.domain;
  if (body.onboardingCopy !== undefined) update.onboarding_copy = body.onboardingCopy;
  if (body.notifyWhatsApp !== undefined) update.notify_whatsapp = body.notifyWhatsApp;
  if (body.notifyEmail    !== undefined) update.notify_email   = body.notifyEmail;
  if (body.ownerWhatsApp  !== undefined) update.owner_whatsapp = body.ownerWhatsApp;
  if (body.ownerEmail     !== undefined) update.owner_email    = body.ownerEmail;

  const { error } = await supabase.from('businesses').update(update).eq('id', body.businessId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
