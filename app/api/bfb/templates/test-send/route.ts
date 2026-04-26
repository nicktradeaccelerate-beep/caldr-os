import { createServiceClient } from '@/lib/supabase/server';
import { createServerClient, type CookieOptions } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const DUMMY_VALUES: Record<string, string> = {
  '{{client_name}}': 'Sarah',
  '{{business_name}}': 'Patel Catering Ltd',
  '{{next_action}}': 'review your cash flow statement by Friday',
};

export async function POST(req: Request) {
  const { templateId } = await req.json() as { templateId: string };

  const cookieStore = cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(_n: string, _v: string, _o: CookieOptions) {},
        remove(_n: string, _o: CookieOptions) {},
      },
    }
  );
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceClient();

  const [{ data: template }, { data: userData }] = await Promise.all([
    supabase.from('email_templates').select('name, subject, body_html').eq('id', templateId).single(),
    supabase.from('users').select('email, name').eq('id', session.user.id).single(),
  ]);

  if (!template || !userData) {
    return Response.json({ error: 'Template or user not found' }, { status: 404 });
  }

  if (!process.env.RESEND_API_KEY) {
    return Response.json({ error: 'RESEND_API_KEY not set' }, { status: 500 });
  }

  // Fill dummy values
  let subject = template.subject;
  let bodyHtml = template.body_html;
  for (const [key, val] of Object.entries(DUMMY_VALUES)) {
    const re = new RegExp(key.replace(/[{}]/g, '\\$&'), 'g');
    subject = subject.replace(re, val);
    bodyHtml = bodyHtml.replace(re, val);
  }

  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: 'BFB <onboarding@resend.dev>',
      to: userData.email,
      subject: `[TEST] ${subject}`,
      html: `<div style="max-width:560px;margin:0 auto;font-family:sans-serif;">${bodyHtml.replace(/\n/g, '<br/>')}</div>
<hr style="border:1px solid #eee;margin-top:30px;"/>
<p style="font-size:11px;color:#999;">This is a test email for the template "${template.name}". Dummy data was used for variables.</p>`,
    });
    return Response.json({ sent: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Send failed';
    return Response.json({ error: msg }, { status: 500 });
  }
}
