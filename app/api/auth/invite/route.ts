import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const { email, name, role, businessId } = await req.json() as {
    email: string;
    name: string;
    role: 'va' | 'manager' | 'owner';
    businessId?: string;
  };

  if (!email || !name || !role) {
    return Response.json({ error: 'email, name and role required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Look up business from auth header or provided id
  let bizId = businessId;
  if (!bizId) {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const { data: u } = await supabase.from('users').select('business_id').eq('id', user.id).single();
        bizId = u?.business_id;
      }
    }
  }

  if (!bizId) return Response.json({ error: 'Could not determine business' }, { status: 400 });

  // Invite via Supabase magic link — creates auth user + triggers sign-in
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { name, role, business_id: bizId },
    redirectTo: `${process.env.NEXT_PUBLIC_URL}/onboard`,
  });

  if (error) {
    // Graceful fallback — user may already exist
    if (error.message.includes('already registered')) {
      return Response.json({ success: true, note: 'User already exists — they can sign in directly.' });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Pre-create user record so they appear in the team before accepting invite
  if (data.user) {
    await supabase.from('users').upsert({
      id: data.user.id,
      business_id: bizId,
      email,
      name,
      role,
      status: 'offline',
      hearts_total: 0,
      level: 1,
      streak: 0,
      port_status: 'new',
      ai_usage: { claude: 0, gpt: 0, gemini: 0 },
    }, { onConflict: 'id' });
  }

  return Response.json({ success: true });
}
