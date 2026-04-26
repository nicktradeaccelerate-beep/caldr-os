import { twilioClient } from './client';

export async function provisionUKNumber(userId: string, type: 'mobile' | 'landline' = 'mobile') {
  const available = type === 'mobile'
    ? await twilioClient.availablePhoneNumbers('GB').mobile.list({ limit: 5 })
    : await twilioClient.availablePhoneNumbers('GB').local.list({ limit: 5 });

  if (!available.length) throw new Error('No UK numbers available');

  const number = await twilioClient.incomingPhoneNumbers.create({
    phoneNumber: available[0].phoneNumber,
    voiceUrl: `${process.env.NEXT_PUBLIC_URL}/api/twilio/voice`,
    voiceMethod: 'POST',
    statusCallback: `${process.env.NEXT_PUBLIC_URL}/api/twilio/voice/status`,
    smsUrl: `${process.env.NEXT_PUBLIC_URL}/api/twilio/whatsapp`,
  });

  return number;
}

export async function createSIPCredentials(userId: string) {
  const credList = await twilioClient.sip.credentialLists.create({
    friendlyName: `VA-${userId}`,
  });

  const password = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const username = `va_${userId.slice(0, 8)}`;

  await twilioClient.sip.credentialLists(credList.sid)
    .credentials.create({ username, password });

  return { username, password, credentialListSid: credList.sid };
}

export async function releaseTwilioNumber(sid: string) {
  await twilioClient.incomingPhoneNumbers(sid).remove();
}
