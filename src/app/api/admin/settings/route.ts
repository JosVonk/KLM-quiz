import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function assertAdmin(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase.from('users').select('is_admin').eq('id', userId).single()
  return data?.is_admin === true
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !await assertAdmin(supabase, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data } = await serviceClient()
    .from('app_settings')
    .select('key, value')
    .in('key', ['gemini_api_key'])

  const settings: Record<string, string> = {}
  for (const row of data ?? []) settings[row.key] = row.value

  // Mask the key for display — show last 6 chars only
  const raw = settings['gemini_api_key'] ?? ''
  const masked = raw.length > 6 ? '*'.repeat(raw.length - 6) + raw.slice(-6) : raw ? '******' : ''

  return NextResponse.json({ gemini_api_key: masked, gemini_api_key_set: raw.length > 0 })
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !await assertAdmin(supabase, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { gemini_api_key } = await req.json()
  if (typeof gemini_api_key !== 'string' || gemini_api_key.trim() === '') {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 })
  }

  const admin = serviceClient()
  await admin.from('app_settings').upsert({ key: 'gemini_api_key', value: gemini_api_key.trim() }, { onConflict: 'key' })

  return NextResponse.json({ ok: true })
}
