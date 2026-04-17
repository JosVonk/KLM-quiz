import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { estimatePScore } from '@/lib/ai/p-score-estimator'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('users').select('is_admin').eq('id', user?.id ?? '').single()
  if (!user || !profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { questions } = await request.json()

  const enriched = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    questions.map(async (q: any) => {
      const pScore = await estimatePScore(q.question_en, q.options, q.correct_answer, q.topic)
      return { ...q, p_score: pScore, ai_p_score_initial: pScore }
    })
  )

  const { error } = await supabase.from('questions').insert(enriched)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ imported: enriched.length })
}
