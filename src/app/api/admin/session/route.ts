import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const supabase = createClient()
  const { data } = await supabase.from('app_settings').select('value').eq('key', 'session_active').single()
  return NextResponse.json({ active: data?.value === 'true' })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('users').select('is_admin').eq('id', user?.id ?? '').single()
  if (!user || !profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { active } = await request.json()
  const admin = serviceClient()

  if (active) {
    const { data: players } = await admin.from('users').select('id')
    if (players && players.length > 0) {
      const shuffled = [...players].sort(() => Math.random() - 0.5)
      await Promise.all(shuffled.map((p, i) =>
        admin.from('users').update({ ladder_position: i + 1 }).eq('id', p.id)
      ))
    }
  }

  const { error } = await admin
    .from('app_settings')
    .upsert({ key: 'session_active', value: String(active) })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
