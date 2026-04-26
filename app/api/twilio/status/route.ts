import { createServiceClient } from '@/lib/supabase/server';
import twilio from 'twilio';

// Twilio status callback — fires when call ends, updates DB + triggers post-call AI
export async function POST(req: Request) {
  const sig = req.headers.get('x-twilio-signature') ?? '';
  const url = `${process.env.NEXT_PUBLIC_URL}/api/twilio/status`;
  const bodyText = await req.text();
  const body = Object.fromEntries(new URLSearchParams(bodyText));

  const valid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    sig,
    url,
    body,
  );

  if (!valid) return new Response('Forbidden', { status: 403 });

  const {
    CallSid: callSid,
    CallStatus: callStatus,
    CallDuration: durationStr,
    RecordingUrl: recordingUrl,
    To: to,
    From: from,
    Direction: direction,
  } = body;

  const durationSeconds = parseInt(durationStr ?? '0', 10);
  const supabase = createServiceClient();

  // Find the call record by twilio_call_sid
  const { data: existingCall } = await supabase
    .from('calls')
    .select('id, business_id, va_id')
    .eq('twilio_call_sid', callSid)
    .single();

  const contactNumber = direction === 'inbound' ? from : to;

  if (existingCall) {
    await supabase.from('calls').update({
      status: callStatus === 'completed' ? 'completed' : 'missed',
      duration_seconds: durationSeconds,
      recording_url: recordingUrl ?? null,
      ended_at: new Date().toISOString(),
    }).eq('id', existingCall.id);
  } else {
    // Create record if not already tracked (e.g. inbound calls not pre-registered)
    await supabase.from('calls').insert({
      twilio_call_sid: callSid,
      contact_number: contactNumber,
      direction: direction?.toLowerCase().includes('inbound') ? 'inbound' : 'outbound',
      duration_seconds: durationSeconds,
      recording_url: recordingUrl ?? null,
      status: callStatus === 'completed' ? 'completed' : 'missed',
      ended_at: new Date().toISOString(),
      flags: [],
    });
  }

  return new Response('OK', { status: 200 });
}
