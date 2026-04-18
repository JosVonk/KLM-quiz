import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { estimatePScore } from '@/lib/ai/p-score-estimator'

async function assertAdmin(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase.from('users').select('is_admin').eq('id', userId).single()
  return data?.is_admin === true
}

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !await assertAdmin(supabase, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: q } = await supabase.from('questions').select('*').eq('id', params.id).single()
  if (!q) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const p_score = await estimatePScore(q.question_en, q.options, q.correct_answer, q.topic)
  await supabase.from('questions').update({ p_score, ai_p_score_initial: p_score }).eq('id', params.id)

  return NextResponse.json({ p_score })
}
