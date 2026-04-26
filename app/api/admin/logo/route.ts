import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get('logo') as File | null;
  const businessId = formData.get('businessId') as string | null;

  if (!file || !businessId) {
    return Response.json({ error: 'logo file and businessId required' }, { status: 400 });
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
  const allowed = ['png', 'jpg', 'jpeg', 'svg', 'webp'];
  if (!allowed.includes(ext)) {
    return Response.json({ error: 'File type not allowed. Use PNG, JPG, SVG or WebP.' }, { status: 400 });
  }

  if (file.size > 2 * 1024 * 1024) {
    return Response.json({ error: 'Logo must be under 2MB.' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const path = `logos/${businessId}/logo.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('brand-assets')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return Response.json({ error: uploadError.message }, { status: 500 });

  const { data: urlData } = supabase.storage.from('brand-assets').getPublicUrl(path);
  const logoUrl = urlData.publicUrl;

  await supabase.from('businesses').update({ logo_url: logoUrl }).eq('id', businessId);

  return Response.json({ logoUrl });
}
