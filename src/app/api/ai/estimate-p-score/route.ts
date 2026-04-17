import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { estimatePScore } from '@/lib/ai/p-score-estimator'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { questionText, options, correctAnswer, topic } = await request.json()
  const pScore = await estimatePScore(questionText, options, correctAnswer, topic)
  return NextResponse.json({ pScore })
}
