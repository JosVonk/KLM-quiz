import { Question } from '@/types'

type Tier = 'hard' | 'medium' | 'easy'

export function getPlayerTier(position: number, totalPlayers: number): Tier {
  const pct = position / totalPlayers
  if (pct <= 0.33) return 'hard'
  if (pct <= 0.66) return 'medium'
  return 'easy'
}

export function pScoreRange(tier: Tier): { min: number; max: number } {
  if (tier === 'hard') return { min: 0, max: 0.4 }
  if (tier === 'medium') return { min: 0.35, max: 0.65 }
  return { min: 0.6, max: 1 }
}

export function selectQuestions(
  questions: Question[],
  tier: Tier,
  count: number
): Question[] {
  const { min, max } = pScoreRange(tier)
  const topics = [...new Set(questions.map(q => q.topic))]
  const perTopic = Math.ceil(count / topics.length)
  const selected: Question[] = []

  for (const topic of topics) {
    const pool = questions
      .filter(q => q.topic === topic && q.p_score >= min && q.p_score <= max && !q.flagged && q.approved)
      .sort(() => Math.random() - 0.5)
      .slice(0, perTopic)
    selected.push(...pool)
  }

  return selected.sort(() => Math.random() - 0.5).slice(0, count)
}
