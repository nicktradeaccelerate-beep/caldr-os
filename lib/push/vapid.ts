import webpush from 'web-push';

let _configured = false;

function configure() {
  if (_configured) return;
  const publicKey  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject    = process.env.VAPID_SUBJECT ?? 'mailto:hello@caldr.ai';

  if (!publicKey || !privateKey) {
    // Push notifications won't work without VAPID keys
    return;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  _configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

export interface PushSubscriptionRecord {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Send a push notification to a single subscription.
 * Returns true on success, false if the subscription is expired (410/404).
 * Throws on other errors.
 */
export async function sendPush(
  sub: PushSubscriptionRecord,
  payload: PushPayload
): Promise<boolean> {
  configure();

  const subscription: webpush.PushSubscription = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  };

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 410 || status === 404) return false; // Subscription expired
    throw err;
  }
}

/**
 * Send to all subscriptions for a user.
 * Returns the count of successful sends.
 * Expired subs are returned as a list of endpoints to remove.
 */
export async function sendPushToUser(
  subs: PushSubscriptionRecord[],
  payload: PushPayload
): Promise<{ sent: number; expiredEndpoints: string[] }> {
  configure();
  let sent = 0;
  const expiredEndpoints: string[] = [];

  await Promise.all(
    subs.map(async sub => {
      const ok = await sendPush(sub, payload);
      if (ok) sent++;
      else expiredEndpoints.push(sub.endpoint);
    })
  );

  return { sent, expiredEndpoints };
}
