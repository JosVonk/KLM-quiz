import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { swapPositions, challengerLoses } from '@/lib/ladder/positions'

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: match } = await supabase.from('matches').select('*').eq('id', params.id).single()
  if (!match || match.ended_at) return NextResponse.json({ error: 'Match already ended' }, { status: 409 })

  const { data: answers } = await supabase
    .from('match_answers')
    .select('player_id, points_awarded')
    .eq('match_id', params.id)

  const scores: Record<string, number> = {}
  for (const a of answers ?? []) {
    scores[a.player_id] = (scores[a.player_id] ?? 0) + a.points_awarded
  }

  const p1Score = scores[match.player1_id] ?? 0
  const p2Score = scores[match.player2_id] ?? 0
  const winnerId = p1Score >= p2Score ? match.player1_id : match.player2_id

  const { data: players } = await supabase
    .from('users').select('id, ladder_position')
    .in('id', [match.player1_id, match.player2_id])

  const challenger = players?.find(p => p.id === match.player1_id)
  const challenged = players?.find(p => p.id === match.player2_id)

  if (!challenger || !challenged) return NextResponse.json({ error: 'Players not found' }, { status: 500 })

  const newPositions = winnerId === challenger.id
    ? swapPositions(challenger.ladder_position, challenged.ladder_position)
    : challengerLoses(challenger.ladder_position, challenged.ladder_position)

  await supabase.from('matches').update({ winner_id: winnerId, ended_at: new Date().toISOString() }).eq('id', params.id)
  await supabase.from('users').update({ ladder_position: newPositions.challengerPos, status: 'idle', last_active_at: new Date().toISOString() }).eq('id', challenger.id)
  await supabase.from('users').update({ ladder_position: newPositions.challengedPos, status: 'idle', last_active_at: new Date().toISOString() }).eq('id', challenged.id)

  const isChallenger = user.id === challenger.id
  const oldPos = isChallenger ? challenger.ladder_position : challenged.ladder_position
  const newPos = isChallenger ? newPositions.challengerPos : newPositions.challengedPos

  return NextResponse.json({ winnerId, scores, positionChange: newPos - oldPos })
}
