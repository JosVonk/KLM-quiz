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

  const { data: answers } = await admin
    .from('match_answers')
    .select('question_id, answer, is_correct, points_awarded, questions(question_en, correct_answer, options, topic)')
    .eq('match_id', params.id)
    .eq('player_id', user.id)
    .order('id', { ascending: true })

  const { data: me } = await admin.from('users').select('ladder_position').eq('id', user.id).single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const review = ((answers ?? []) as any[]).map((a) => ({
    questionId: a.question_id,
    questionText: a.questions?.question_en ?? '',
    topic: a.questions?.topic ?? '',
    myAnswer: a.answer,
    correctAnswer: a.questions?.correct_answer ?? '',
    isCorrect: a.is_correct,
    points: a.points_awarded,
  }))

  return NextResponse.json({ review, newPosition: me?.ladder_position ?? null })
}
