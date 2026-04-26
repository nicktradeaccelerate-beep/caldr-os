import twilio from 'twilio';
import type { Twilio } from 'twilio';

let _client: Twilio | null = null;

export function getTwilioClient(): Twilio {
  if (!_client) {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not set');
    }
    _client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return _client;
}

export const twilioClient = new Proxy({} as Twilio, {
  get(_target, prop) {
    return (getTwilioClient() as never)[prop];
  },
});
