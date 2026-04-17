import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { estimatePScore } from '@/lib/ai/p-score-estimator'

async function assertAdmin(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase.from('users').select('is_admin').eq('id', userId).single()
  return data?.is_admin === true
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !await assertAdmin(supabase, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data } = await supabase.from('questions').select('*').order('created_at', { ascending: false })
  return NextResponse.json({ questions: data })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !await assertAdmin(supabase, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const pScore = await estimatePScore(body.question_en, body.options, body.correct_answer, body.topic)

  const { data, error } = await supabase.from('questions').insert({
    ...body,
    p_score: pScore,
    ai_p_score_initial: pScore,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ question: data })
}
