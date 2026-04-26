import { provisionUKNumber, createSIPCredentials } from '@/lib/twilio/provision';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const { userId, businessId, type = 'mobile' } = await req.json();

  try {
    const [number, sip] = await Promise.all([
      provisionUKNumber(userId, type),
      createSIPCredentials(userId),
    ]);

    const supabase = createServiceClient();

    await Promise.all([
      supabase.from('numbers').insert({
        business_id: businessId,
        user_id: userId,
        number: number.phoneNumber,
        twilio_sid: number.sid,
        type,
      }),
      supabase.from('users').update({
        uk_number: number.phoneNumber,
        twilio_sip_username: sip.username,
        twilio_sip_password: sip.password,
      }).eq('id', userId),
    ]);

    return Response.json({
      number: number.phoneNumber,
      sipUsername: sip.username,
      sipPassword: sip.password,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Provisioning failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
