import { twilioClient } from '@/lib/twilio/client';
import twilio from 'twilio';
import type { SupervisorMode } from '@/types';

const { VoiceResponse } = twilio.twiml;

// POST /api/twilio/conference — supervisor joins/controls a live call
export async function POST(req: Request) {
  const { action, callSid, supervisorNumber, mode } = await req.json() as {
    action: 'join' | 'leave' | 'barge' | 'whisper';
    callSid: string;
    supervisorNumber?: string;
    mode?: SupervisorMode;
  };

  try {
    if (action === 'join' && supervisorNumber) {
      // Dial supervisor into the conference
      const conferenceRoom = `caldr-conf-${callSid}`;
      await twilioClient.calls.create({
        to: supervisorNumber,
        from: process.env.TWILIO_PHONE_NUMBER!,
        twiml: buildSupervisorTwiml(conferenceRoom, mode ?? 'listen'),
      });
      return Response.json({ success: true, conferenceRoom });
    }

    if (action === 'barge') {
      // Update participant to be able to speak (un-mute)
      const participants = await twilioClient
        .conferences(`caldr-conf-${callSid}`)
        .participants.list({ limit: 20 });

      // Find the supervisor participant and unmute
      const supervisor = participants.find(p => p.label === 'supervisor');
      if (supervisor) {
        await twilioClient
          .conferences(`caldr-conf-${callSid}`)
          .participants(supervisor.callSid)
          .update({ muted: false, coaching: false });
      }
      return Response.json({ success: true });
    }

    if (action === 'whisper') {
      // Supervisor speaks only to VA (coaching mode)
      const participants = await twilioClient
        .conferences(`caldr-conf-${callSid}`)
        .participants.list({ limit: 20 });

      const supervisor = participants.find(p => p.label === 'supervisor');
      const va = participants.find(p => p.label === 'va');
      if (supervisor && va) {
        await twilioClient
          .conferences(`caldr-conf-${callSid}`)
          .participants(supervisor.callSid)
          .update({ coaching: true, callSidToCoach: va.callSid });
      }
      return Response.json({ success: true });
    }

    if (action === 'leave') {
      const participants = await twilioClient
        .conferences(`caldr-conf-${callSid}`)
        .participants.list({ limit: 20 });

      const supervisor = participants.find(p => p.label === 'supervisor');
      if (supervisor) {
        await twilioClient
          .conferences(`caldr-conf-${callSid}`)
          .participants(supervisor.callSid)
          .remove();
      }
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Conference error';
    return Response.json({ error: message }, { status: 500 });
  }
}

function buildSupervisorTwiml(conferenceRoom: string, mode: SupervisorMode): string {
  const twiml = new VoiceResponse();
  const dial = twiml.dial();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (dial as any).conference(conferenceRoom, {
    muted: mode === 'listen',
    startConferenceOnEnter: false,
    endConferenceOnExit: false,
    record: 'do-not-record',
    label: 'supervisor',
    ...(mode === 'whisper' ? { coaching: true } : {}),
  });
  return twiml.toString();
}
