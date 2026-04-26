import { twilioClient } from './client';
import type { SupervisorMode } from '@/types';

export async function supervisorJoin(callSid: string, mode: SupervisorMode) {
  await twilioClient.calls(callSid).update({
    url: `${process.env.NEXT_PUBLIC_URL}/api/twilio/conference/supervise?mode=${mode}`,
    method: 'POST',
  });
}

export async function supervisorLeave(callSid: string) {
  await twilioClient.calls(callSid).update({
    url: `${process.env.NEXT_PUBLIC_URL}/api/twilio/conference/supervise?mode=end`,
    method: 'POST',
  });
}
