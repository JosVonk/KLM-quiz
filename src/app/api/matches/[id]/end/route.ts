import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { swapPositions, challengerLoses } from '@/lib/ladder/positions'

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const QUESTIONS_PER_MATCH = 10

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: match } = await supabase.from('matches').select('*').eq('id', params.id).single()
  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  // If already fully finalized, just return current result
  if (match.winner_id) {
    const { data: answers } = await supabase.from('match_answers').select('player_id, points_awarded').eq('match_id', params.id)
    const scores: Record<string, number> = {}
    for (const a of answers ?? []) scores[a.player_id] = (scores[a.player_id] ?? 0) + a.points_awarded
    return NextResponse.json({ winnerId: match.winner_id, scores, positionChange: 0, waiting: false })
  }

  const admin = serviceClient()

  const { data: answers } = await supabase
    .from('match_answers')
    .select('player_id, points_awarded')
    .eq('match_id', params.id)

  const scores: Record<string, number> = {}
  const answerCounts: Record<string, number> = {}
  for (const a of answers ?? []) {
    scores[a.player_id] = (scores[a.player_id] ?? 0) + a.points_awarded
    answerCounts[a.player_id] = (answerCounts[a.player_id] ?? 0) + 1
  }

  const opponentId = user.id === match.player1_id ? match.player2_id : match.player1_id
  const opponentDone = (answerCounts[opponentId] ?? 0) >= QUESTIONS_PER_MATCH

  // Mark ended_at when first player finishes (if not set yet)
  if (!match.ended_at) {
    await admin.from('matches').update({ ended_at: new Date().toISOString() }).eq('id', params.id)
  }

  if (!opponentDone) {
    return NextResponse.json({ waiting: true, scores })
  }

  // Both done — finalize
  const p1Score = scores[match.player1_id] ?? 0
  const p2Score = scores[match.player2_id] ?? 0
  const winnerId = p1Score >= p2Score ? match.player1_id : match.player2_id

  const { data: players } = await admin.from('users').select('id, ladder_position').in('id', [match.player1_id, match.player2_id])
  const challenger = players?.find(p => p.id === match.player1_id)
  const challenged = players?.find(p => p.id === match.player2_id)
  if (!challenger || !challenged) return NextResponse.json({ error: 'Players not found' }, { status: 500 })

  const newPositions = winnerId === challenger.id
    ? swapPositions(challenger.ladder_position, challenged.ladder_position)
    : challengerLoses(challenger.ladder_position, challenged.ladder_position)

  await admin.from('matches').update({ winner_id: winnerId }).eq('id', params.id)
  await admin.from('users').update({ ladder_position: newPositions.challengerPos, status: 'idle', last_active_at: new Date().toISOString() }).eq('id', challenger.id)
  await admin.from('users').update({ ladder_position: newPositions.challengedPos, status: 'idle', last_active_at: new Date().toISOString() }).eq('id', challenged.id)

  const isChallenger = user.id === challenger.id
  const oldPos = isChallenger ? challenger.ladder_position : challenged.ladder_position
  const newPos = isChallenger ? newPositions.challengerPos : newPositions.challengedPos

  return NextResponse.json({ winnerId, scores, positionChange: newPos - oldPos, waiting: false })
}
