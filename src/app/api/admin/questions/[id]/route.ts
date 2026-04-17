import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function assertAdmin(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase.from('users').select('is_admin').eq('id', userId).single()
  return data?.is_admin === true
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !await assertAdmin(supabase, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { error } = await supabase.from('questions').update(body).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !await assertAdmin(supabase, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('questions').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
