import { twilioClient } from '@/lib/twilio/client';
import { createServiceClient } from '@/lib/supabase/server';
import twilio from 'twilio';

const { VoiceResponse } = twilio.twiml;

export async function POST(req: Request) {
  const sig = req.headers.get('x-twilio-signature') ?? '';
  const url = `${process.env.NEXT_PUBLIC_URL}/api/twilio/voice`;
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
    Direction: direction,
    To: to,
    From: from,
    CallerName: callerName,
  } = body;

  const supabase = createServiceClient();

  // Determine business from the number called / calling
  const contactNumber = direction === 'inbound' ? from : to;
  const twilioNumber = direction === 'inbound' ? to : from;

  const { data: numberRecord } = await supabase
    .from('numbers')
    .select('business_id, user_id')
    .eq('number', twilioNumber)
    .single();

  if (numberRecord) {
    // Log the call in DB
    await supabase.from('calls').insert({
      business_id: numberRecord.business_id,
      va_id: numberRecord.user_id,
      twilio_call_sid: callSid,
      contact_name: callerName || null,
      contact_number: contactNumber,
      direction: direction?.toLowerCase().includes('inbound') ? 'inbound' : 'outbound',
      status: 'active',
      started_at: new Date().toISOString(),
      flags: [],
    });
  }

  const conferenceRoom = `caldr-conf-${callSid}`;
  const twiml = new VoiceResponse();

  if (direction === 'inbound') {
    twiml.say({ voice: 'Polly.Amy' }, 'One moment, connecting you now.');
  }

  const dial = twiml.dial({
    record: 'record-from-answer-dual',
    recordingStatusCallback: `${process.env.NEXT_PUBLIC_URL}/api/twilio/status`,
    recordingStatusCallbackMethod: 'POST',
    action: `${process.env.NEXT_PUBLIC_URL}/api/twilio/status`,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (dial as any).conference(conferenceRoom, {
    startConferenceOnEnter: true,
    endConferenceOnExit: true,
    record: 'record-from-start',
    label: 'va',
    waitUrl: 'http://twimlets.com/holdmusic?Bucket=com.twilio.music.soft-rock',
  });

  // Suppress unused import warning — twilioClient is used in conference route
  void twilioClient;

  return new Response(twiml.toString(), {
    headers: { 'Content-Type': 'text/xml' },
  });
}
