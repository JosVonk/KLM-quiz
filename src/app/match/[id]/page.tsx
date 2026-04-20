'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { QuestionCard } from '@/components/match/QuestionCard'
import { Timer } from '@/components/match/Timer'
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

interface QuestionReview {
  questionId: string
  questionText: string
  topic: string
  myAnswer: string
  correctAnswer: string
  isCorrect: boolean
  points: number
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
  const [review, setReview] = useState<QuestionReview[]>([])
  const [newPosition, setNewPosition] = useState<number | null>(null)
  const [myUsername, setMyUsername] = useState('')
  const [opponentUsername, setOpponentUsername] = useState('')
  const [userId, setUserId] = useState('')
  const answered = useRef(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const res = await fetch(`/api/matches/${params.id}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error('Match load failed:', res.status, err)
        router.push('/lobby')
        return
      }
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

  const fetchReview = useCallback(async () => {
    const res = await fetch(`/api/matches/${params.id}/results`)
    if (res.ok) {
      const data = await res.json()
      setReview(data.review ?? [])
      setNewPosition(data.newPosition)
    }
  }, [params.id])

  const pollForResult = useCallback(async (matchId: string) => {
    const res = await fetch(`/api/matches/${matchId}/end`, { method: 'POST' })
    const result: MatchResult & { waiting?: boolean } = await res.json()
    if (result.waiting) return false
    setMatchResult(result)
    await fetchReview()
    setPhase('finished')
    return true
  }, [fetchReview])

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
    const iWon = matchResult.winnerId === userId
    const myFinalScore = matchResult.scores[userId] ?? myScore
    const opponentId = Object.keys(matchResult.scores).find(id => id !== userId) ?? ''
    const opponentFinalScore = matchResult.scores[opponentId] ?? opponentScore
    const posChange = matchResult.positionChange ?? 0
    const correct = review.filter(r => r.isCorrect).length

    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className={`rounded-2xl p-6 text-center text-white ${iWon ? 'bg-green-600' : 'bg-klm-dark'}`}>
          <div className="text-4xl mb-2">{iWon ? '🏆' : '💪'}</div>
          <h1 className="text-2xl font-bold">{iWon ? 'You won!' : 'You lost'}</h1>
          <p className="mt-1 opacity-80 text-sm">{iWon ? 'Great job!' : 'Better luck next time'}</p>
        </div>

        {/* Score comparison */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl shadow p-4 text-center border-2 border-klm-blue">
            <p className="text-xs text-gray-500 mb-1">You ({myUsername})</p>
            <p className="text-3xl font-bold text-klm-blue">{myFinalScore}</p>
            <p className="text-xs text-gray-400 mt-1">pts</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">{opponentUsername}</p>
            <p className="text-3xl font-bold text-gray-600">{opponentFinalScore}</p>
            <p className="text-xs text-gray-400 mt-1">pts</p>
          </div>
        </div>

        {/* Position change */}
        <div className="bg-white rounded-xl shadow p-4 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">Ladder position</span>
          <div className="flex items-center gap-2">
            {posChange < 0 && <span className="text-green-600 font-bold">↑ {Math.abs(posChange)} place{Math.abs(posChange) !== 1 ? 's' : ''}</span>}
            {posChange > 0 && <span className="text-red-500 font-bold">↓ {posChange} place{posChange !== 1 ? 's' : ''}</span>}
            {posChange === 0 && <span className="text-gray-500 font-medium">No change</span>}
            {newPosition && <span className="text-xs text-gray-400">→ #{newPosition}</span>}
          </div>
        </div>

        {/* Question review */}
        {review.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-klm-dark">
              Question review — {correct}/{review.length} correct
            </h2>
            {review.map((r, i) => (
              <div
                key={r.questionId}
                className={`bg-white rounded-xl shadow p-4 border-l-4 ${r.isCorrect ? 'border-green-500' : 'border-red-400'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs text-gray-400 shrink-0">Q{i + 1}</span>
                  <span className={`text-xs font-semibold shrink-0 ${r.isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                    {r.isCorrect ? `+${r.points} pts` : '0 pts'}
                  </span>
                </div>
                <p className="text-sm font-medium text-klm-dark mt-1">{r.questionText}</p>
                {!r.isCorrect && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-red-500">Your answer: <span className="font-medium">{r.myAnswer || '(no answer)'}</span></p>
                    <p className="text-xs text-green-600">Correct: <span className="font-medium">{r.correctAnswer}</span></p>
                  </div>
                )}
                {r.isCorrect && (
                  <p className="text-xs text-green-600 mt-1">Correct: <span className="font-medium">{r.correctAnswer}</span></p>
                )}
              </div>
            ))}
          </div>
        )}

        <Link
          href="/lobby"
          className="block w-full py-3 rounded-xl bg-klm-dark text-white font-semibold text-center hover:bg-klm-blue transition-colors"
        >
          Back to Ladder
        </Link>
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
