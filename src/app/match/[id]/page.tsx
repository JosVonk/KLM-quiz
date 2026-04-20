'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { QuestionCard } from '@/components/match/QuestionCard'
import { Timer } from '@/components/match/Timer'
import { ScoreBoard } from '@/components/match/ScoreBoard'
import type { Question } from '@/types'

const QUESTION_TIME_MS = 20000

interface MatchData {
  id: string
  player1_id: string
  player2_id: string
  player1: { id: string; username: string; ladder_position: number }
  player2: { id: string; username: string; ladder_position: number }
}

interface MatchResult {
  winnerId: string
  scores: Record<string, number>
  positionChange: number
}

export default function MatchPage({ params }: { params: { id: string } }) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [myScore, setMyScore] = useState(0)
  const [opponentScore, setOpponentScore] = useState(0)
  const [questionStartedAt, setQuestionStartedAt] = useState(Date.now())
  const [phase, setPhase] = useState<'loading' | 'playing' | 'waiting' | 'finished'>('loading')
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null)
  const [myUsername, setMyUsername] = useState('')
  const [opponentUsername, setOpponentUsername] = useState('')
  const [, setUserId] = useState('')
  const answered = useRef(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const res = await fetch(`/api/matches/${params.id}`)
      if (!res.ok) { router.push('/lobby'); return }
      const { match, questions: qs }: { match: MatchData; questions: Question[] } = await res.json()
      setQuestions(qs)

      const isP1 = match.player1_id === user.id
      setMyUsername(isP1 ? match.player1.username : match.player2.username)
      setOpponentUsername(isP1 ? match.player2.username : match.player1.username)

      supabase.channel(`match-${params.id}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'match_answers',
          filter: `match_id=eq.${params.id}`,
        }, (payload) => {
          if (payload.new.player_id !== user.id) {
            setOpponentScore(s => s + payload.new.points_awarded)
          }
        })
        .subscribe()

      setQuestionStartedAt(Date.now())
      setPhase('playing')
    }
    init()
    return () => { supabase.removeAllChannels() }
  }, [params.id])

  const submitAnswer = useCallback(async (answer: string | null) => {
    if (answered.current || questions.length === 0) return
    answered.current = true
    const timeMs = Date.now() - questionStartedAt
    const question = questions[currentIndex]

    const res = await fetch(`/api/matches/${params.id}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: question.id,
        answer: answer ?? '',
        timeMs,
        avgOpponentPoints: currentIndex > 0 ? opponentScore / currentIndex : 600,
      }),
    })
    const { points } = await res.json()
    setMyScore(s => s + (points ?? 0))
  }, [currentIndex, questions, questionStartedAt, opponentScore, params.id])

  const pollForResult = useCallback(async (matchId: string) => {
    const res = await fetch(`/api/matches/${matchId}/end`, { method: 'POST' })
    const result: MatchResult & { waiting?: boolean } = await res.json()
    if (result.waiting) return false
    setMatchResult(result)
    setPhase('finished')
    return true
  }, [])

  const advanceQuestion = useCallback(async () => {
    await submitAnswer(selectedAnswer)
    setSelectedAnswer(null)
    answered.current = false

    if (currentIndex + 1 >= questions.length) {
      setPhase('waiting')
      const done = await pollForResult(params.id)
      if (!done) {
        const interval = setInterval(async () => {
          const finished = await pollForResult(params.id)
          if (finished) clearInterval(interval)
        }, 3000)
      }
    } else {
      setCurrentIndex(i => i + 1)
      setQuestionStartedAt(Date.now())
    }
  }, [currentIndex, questions.length, selectedAnswer, submitAnswer, params.id, pollForResult])

  if (phase === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <p className="text-klm-blue animate-pulse text-lg font-semibold">Loading match…</p>
      </div>
    )
  }

  if (phase === 'waiting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-4 text-center px-4">
        <p className="text-klm-blue animate-pulse text-xl font-semibold">Waiting for opponent to finish…</p>
        <p className="text-gray-400 text-sm">Results will appear automatically</p>
        <div className="mt-2 text-3xl font-bold text-klm-dark">{myScore} pts</div>
      </div>
    )
  }

  if (phase === 'finished' && matchResult) {
    return (
      <div className="max-w-md mx-auto mt-10 px-4">
        <ScoreBoard
          results={[
            { name: myUsername, score: myScore, isCurrentUser: true },
            { name: opponentUsername, score: opponentScore, isCurrentUser: false },
          ]}
          positionChange={matchResult.positionChange ?? 0}
        />
      </div>
    )
  }

  if (questions.length === 0) return null
  const question = questions[currentIndex]

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
      <div className="flex justify-between text-sm font-semibold text-klm-dark">
        <span className="text-gray-500">Q {currentIndex + 1}/{questions.length}</span>
        <span>{myUsername}: <span className="text-klm-blue">{myScore}</span> pts</span>
        <span>{opponentUsername}: <span className="text-gray-400">{opponentScore}</span> pts</span>
      </div>
      <Timer durationMs={QUESTION_TIME_MS} startedAt={questionStartedAt} onExpire={advanceQuestion} />
      <QuestionCard
        question={question}
        selectedAnswer={selectedAnswer}
        onAnswer={setSelectedAnswer}
        disabled={answered.current}
      />
      <button
        onClick={advanceQuestion}
        disabled={!selectedAnswer}
        className="w-full py-3 rounded-xl bg-klm-dark text-white font-semibold disabled:opacity-40 hover:bg-klm-blue transition-colors"
      >
        {currentIndex + 1 === questions.length ? 'Finish' : 'Next →'}
      </button>
    </div>
  )
}
