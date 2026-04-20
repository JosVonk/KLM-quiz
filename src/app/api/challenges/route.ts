import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { canChallenge } from '@/lib/ladder/positions'

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = serviceClient()

  // Only redirect if the user is actively in a match
  const { data: currentUser } = await admin.from('users').select('status').eq('id', user.id).single()
  if (currentUser?.status !== 'in_match') return NextResponse.json({ matchId: null })

  // Find the MOST RECENT unfinished match where this user is the challenger (player1)
  const { data: matches, error } = await admin
    .from('matches')
    .select('id')
    .eq('player1_id', user.id)
    .is('winner_id', null)
    .order('started_at', { ascending: false })
    .limit(1)

  if (error) console.error('GET /api/challenges match lookup error:', error)
  const matchId = matches?.[0]?.id ?? null
  return NextResponse.json({ matchId })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { challengedId } = await request.json()

  const { data: players } = await supabase
    .from('users')
    .select('id, ladder_position, status')
    .in('id', [user.id, challengedId])

  const challenger = players?.find(p => p.id === user.id)
  const challenged = players?.find(p => p.id === challengedId)

  if (!challenger || !challenged) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 })
  }
  if (challenged.status === 'in_match') {
    return NextResponse.json({ error: 'Player is in a match' }, { status: 409 })
  }
  if (!canChallenge(challenger.ladder_position, challenged.ladder_position)) {
    return NextResponse.json({ error: 'Cannot challenge this player' }, { status: 403 })
  }

  const { data: existing } = await supabase
    .from('challenges')
    .select('id')
    .eq('challenger_id', user.id)
    .eq('status', 'pending')
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'You already have a pending challenge' }, { status: 409 })
  }

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()
  const { data: challenge, error } = await supabase
    .from('challenges')
    .insert({ challenger_id: user.id, challenged_id: challengedId, expires_at: expiresAt })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await supabase.from('users').update({ last_active_at: new Date().toISOString() }).eq('id', user.id)
  return NextResponse.json({ challenge })
}

export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { challengeId, action } = await request.json()

  const { data: challenge } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .eq('challenged_id', user.id)
    .single()

  if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
  if (challenge.status !== 'pending') {
    return NextResponse.json({ error: 'Challenge is no longer pending' }, { status: 409 })
  }
  if (new Date(challenge.expires_at) < new Date()) {
    await supabase.from('challenges').update({ status: 'expired' }).eq('id', challengeId)
    return NextResponse.json({ error: 'Challenge expired' }, { status: 410 })
  }

  if (action === 'decline') {
    await supabase.from('challenges').update({ status: 'declined' }).eq('id', challengeId)
    return NextResponse.json({ success: true })
  }

  const admin = serviceClient()

  await admin.from('challenges').update({ status: 'accepted' }).eq('id', challengeId)

  const { data: match, error: matchError } = await admin
    .from('matches')
    .insert({
      challenge_id: challengeId,
      player1_id: challenge.challenger_id,
      player2_id: challenge.challenged_id,
    })
    .select()
    .single()

  if (matchError || !match) {
    return NextResponse.json({ error: matchError?.message ?? 'Failed to create match' }, { status: 500 })
  }

  await admin
    .from('users')
    .update({ status: 'in_match', last_active_at: new Date().toISOString() })
    .in('id', [challenge.challenger_id, challenge.challenged_id])

  return NextResponse.json({ matchId: match.id })
}
