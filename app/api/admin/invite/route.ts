import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = createServiceClient();

  // Verify caller is owner/operator
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: { user: caller } } = await supabase.auth.getUser(token);
  if (!caller) return Response.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: callerRow } = await supabase
    .from('users')
    .select('business_id, role')
    .eq('id', caller.id)
    .single();

  if (!callerRow || !['owner', 'operator', 'manager'].includes(callerRow.role)) {
    return Response.json({ error: 'Only owners and managers can invite users' }, { status: 403 });
  }

  const { name, email, role = 'va' } = await req.json() as { name: string; email: string; role?: string };
  if (!name?.trim() || !email?.trim()) {
    return Response.json({ error: 'name and email required' }, { status: 400 });
  }

  const businessId = callerRow.business_id;

  // Create auth user
  const { data: newAuth, error: authError } = await supabase.auth.admin.createUser({
    email: email.trim(),
    email_confirm: true,
  });

  if (authError || !newAuth.user) {
    return Response.json({ error: authError?.message ?? 'Could not create user' }, { status: 400 });
  }

  // Insert users row
  const { error: userError } = await supabase.from('users').insert({
    id: newAuth.user.id,
    business_id: businessId,
    name: name.trim(),
    email: email.trim(),
    role,
    hearts_total: 0,
    level: 1,
    streak: 0,
    status: 'offline',
  });

  if (userError) {
    // Roll back auth user
    await supabase.auth.admin.deleteUser(newAuth.user.id);
    return Response.json({ error: userError.message }, { status: 400 });
  }

  // Generate magic link so they can log in without setting a password
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: email.trim(),
  });

  if (linkError || !linkData.properties?.action_link) {
    // Account created — return userId so owner can provision manually
    return Response.json({
      userId: newAuth.user.id,
      inviteUrl: null,
      warning: 'Account created but could not generate invite link — send them a manual login link.',
    });
  }

  return Response.json({
    userId: newAuth.user.id,
    inviteUrl: linkData.properties.action_link,
  });
}
