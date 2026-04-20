import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

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

  const { data: match } = await admin.from('matches').select('*').eq('id', params.id).single()
  const { data: answers, error: answersError } = await admin
    .from('match_answers')
    .select('player_id, question_id, is_correct, points_awarded')
    .eq('match_id', params.id)

  const counts: Record<string, number> = {}
  for (const a of answers ?? []) {
    counts[a.player_id] = (counts[a.player_id] ?? 0) + 1
  }

  return NextResponse.json({
    matchId: params.id,
    currentUserId: user.id,
    match: match ? {
      player1_id: match.player1_id,
      player2_id: match.player2_id,
      winner_id: match.winner_id,
      ended_at: match.ended_at,
    } : null,
    answerCounts: counts,
    totalAnswers: answers?.length ?? 0,
    answersError: answersError?.message ?? null,
  })
}
