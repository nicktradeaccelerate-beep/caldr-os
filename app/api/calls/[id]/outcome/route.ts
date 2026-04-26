import { createServiceClient } from '@/lib/supabase/server';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const { outcome, note, coachingNote } = await req.json() as {
    outcome: string;
    note?: string;
    coachingNote?: string;
  };

  if (!outcome) return Response.json({ error: 'outcome required' }, { status: 400 });

  const supabase = createServiceClient();

  const { error } = await supabase
    .from('calls')
    .update({
      outcome,
      coaching_note: coachingNote ?? null,
      ...(note ? { flags: [note] } : {}),
    })
    .eq('id', params.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true });
}
