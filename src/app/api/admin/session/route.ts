import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  if (active) {
    const { data: players } = await supabase
      .from('users')
      .select('id')
      .eq('is_admin', false)
      .eq('ladder_position', 0)

    if (players && players.length > 0) {
      const shuffled = [...players].sort(() => Math.random() - 0.5)
      await Promise.all(shuffled.map((p, i) =>
        supabase.from('users').update({ ladder_position: i + 1 }).eq('id', p.id)
      ))
    }
  }

  await supabase.from('app_settings').upsert({ key: 'session_active', value: String(active) })
  return NextResponse.json({ success: true })
}
