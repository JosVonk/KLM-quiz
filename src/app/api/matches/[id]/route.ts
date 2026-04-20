import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { selectQuestions, getPlayerTier } from '@/lib/quiz/question-selector'

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = serviceClient()

  // Fetch match and players with separate queries to avoid FK join issues
  const { data: match, error: matchError } = await admin
    .from('matches')
    .select('*')
    .eq('id', params.id)
    .single()

  if (matchError) console.error('Match fetch error:', matchError)
  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  if (match.player1_id !== user.id && match.player2_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: players, error: playersError } = await admin
    .from('users')
    .select('id, username, ladder_position')
    .in('id', [match.player1_id, match.player2_id])

  if (playersError) console.error('Players fetch error:', playersError)

  const player1 = players?.find(p => p.id === match.player1_id)
  const player2 = players?.find(p => p.id === match.player2_id)

  if (!player1 || !player2) {
    console.error('Players not found for match:', match.id, { player1_id: match.player1_id, player2_id: match.player2_id, players })
    return NextResponse.json({ error: 'Players not found' }, { status: 500 })
  }

  const highestPos = Math.min(player1.ladder_position, player2.ladder_position)

  const { data: allQuestions } = await admin
    .from('questions')
    .select('*')
    .eq('flagged', false)
    .eq('approved', true)

  const { count: totalPlayers } = await admin
    .from('users')
    .select('*', { count: 'exact', head: true })

  const tier = getPlayerTier(highestPos, totalPlayers ?? 50)
  const questions = selectQuestions(allQuestions ?? [], tier, 10)

  const matchWithPlayers = { ...match, player1, player2 }
  return NextResponse.json({ match: matchWithPlayers, questions, tier })
}
