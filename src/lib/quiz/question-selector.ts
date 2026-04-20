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
  const approved = questions.filter(q => !q.flagged && q.approved)
  const topics = [...new Set(approved.map(q => q.topic))]
  const perTopic = Math.ceil(count / topics.length)
  const selected: Question[] = []

  for (const topic of topics) {
    let pool = approved
      .filter(q => q.topic === topic && q.p_score >= min && q.p_score <= max)
      .sort(() => Math.random() - 0.5)
      .slice(0, perTopic)

    // Fall back to all questions for this topic if tier filter yields nothing
    if (pool.length === 0) {
      pool = approved
        .filter(q => q.topic === topic)
        .sort(() => Math.random() - 0.5)
        .slice(0, perTopic)
    }

    selected.push(...pool)
  }

  // If still not enough, fill from entire pool
  if (selected.length < count) {
    const used = new Set(selected.map(q => q.id))
    const extras = approved
      .filter(q => !used.has(q.id))
      .sort(() => Math.random() - 0.5)
      .slice(0, count - selected.length)
    selected.push(...extras)
  }

  return selected.sort(() => Math.random() - 0.5).slice(0, count)
}
