import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculatePoints } from '@/lib/quiz/scoring'
import { updatePScore, updateRit, shouldFlag } from '@/lib/quiz/psychometrics'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { questionId, answer, timeMs, avgOpponentPoints } = await request.json()

  const { data: question } = await supabase.from('questions').select('*').eq('id', questionId).single()
  if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

  const isCorrect = answer === question.correct_answer
  const points = calculatePoints(isCorrect, timeMs, 20000)

  await supabase.from('match_answers').insert({
    match_id: params.id,
    player_id: user.id,
    question_id: questionId,
    answer,
    time_ms: timeMs,
    is_correct: isCorrect,
    points_awarded: points,
  })

  const newTimesAsked = question.times_asked + 1
  const newPScore = updatePScore(question.p_score, question.times_asked, isCorrect)
  const newRit = updateRit(question.rit_value, newTimesAsked, isCorrect, points, avgOpponentPoints ?? 600)
  const newFlagged = shouldFlag(newRit, newTimesAsked)

  await supabase.from('questions').update({
    p_score: newPScore,
    rit_value: newRit,
    times_asked: newTimesAsked,
    flagged: newFlagged,
    approved: newFlagged ? false : question.approved,
  }).eq('id', questionId)

  return NextResponse.json({ isCorrect, points })
}
