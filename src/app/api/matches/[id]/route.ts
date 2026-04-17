import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { selectQuestions, getPlayerTier } from '@/lib/quiz/question-selector'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: match } = await supabase
    .from('matches')
    .select('*, player1:player1_id(id,username,ladder_position), player2:player2_id(id,username,ladder_position)')
    .eq('id', params.id)
    .single()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  if (match.player1_id !== user.id && match.player2_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const p1Pos = (match.player1 as { ladder_position: number }).ladder_position
  const p2Pos = (match.player2 as { ladder_position: number }).ladder_position
  const highestPos = Math.min(p1Pos, p2Pos)

  const { data: allQuestions } = await supabase
    .from('questions')
    .select('*')
    .eq('flagged', false)
    .eq('approved', true)

  const { count: totalPlayers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })

  const tier = getPlayerTier(highestPos, totalPlayers ?? 50)
  const questions = selectQuestions(allQuestions ?? [], tier, 10)

  return NextResponse.json({ match, questions, tier })
}
