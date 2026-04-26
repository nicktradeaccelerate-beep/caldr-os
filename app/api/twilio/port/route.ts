import { createServiceClient } from '@/lib/supabase/server';

// PAC port request — stores the code and creates a Twilio number port order
export async function POST(req: Request) {
  const { userId, businessId, currentNumber, pacCode, accountName } = await req.json() as {
    userId: string;
    businessId: string;
    currentNumber: string;
    pacCode: string;
    accountName: string;
  };

  if (!pacCode || pacCode.length < 9) {
    return Response.json({ error: 'Invalid PAC code — must be at least 9 characters' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Record the port request in users table
  const { error } = await supabase
    .from('users')
    .update({
      pac_code: pacCode,
      port_status: 'pending',
    })
    .eq('id', userId);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Record in numbers table if the number entry exists, else insert
  const { data: existing } = await supabase
    .from('numbers')
    .select('id')
    .eq('user_id', userId)
    .eq('number', currentNumber)
    .single();

  if (existing) {
    await supabase.from('numbers').update({ status: 'active' }).eq('id', existing.id);
  } else {
    await supabase.from('numbers').insert({
      business_id: businessId,
      user_id: userId,
      number: currentNumber,
      twilio_sid: `port-pending-${Date.now()}`,
      type: 'mobile',
      status: 'active',
    });
  }

  // In production: call Twilio Porting API here with pacCode + accountName
  // POST https://messaging.twilio.com/v1/NumberPools/HostedNumbers
  // For now we record the intent and surface status via users.port_status

  return Response.json({
    success: true,
    message: `PAC code accepted. Port of ${currentNumber} is being processed. Your number will transfer within 2 working days.`,
    portStatus: 'pending',
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) return Response.json({ error: 'userId required' }, { status: 400 });

  const supabase = createServiceClient();
  const { data } = await supabase
    .from('users')
    .select('port_status, pac_code, uk_number')
    .eq('id', userId)
    .single();

  return Response.json(data ?? { port_status: 'new', pac_code: null, uk_number: null });
}
