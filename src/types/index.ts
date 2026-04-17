export type UserStatus = 'idle' | 'in_match'
export type QuestionType = 'multiple_choice' | 'true_false'
export type ChallengeStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'completed'
export type Topic =
  | 'klm_marketing'
  | 'klm_brand_management'
  | 'klm_brand_guide'
  | 'klm_tagless_luggage'
  | 'virtual_humans'
  | 'vibecoding'

export interface User {
  id: string
  username: string
  email: string
  ladder_position: number
  last_active_at: string
  is_admin: boolean
  photo_url: string | null
  nationality: string | null
  status: UserStatus
  created_at: string
}

export interface Question {
  id: string
  topic: Topic
  type: QuestionType
  question_en: string
  options: string[]
  correct_answer: string
  media_url: string | null
  p_score: number
  rit_value: number | null
  times_asked: number
  flagged: boolean
  approved: boolean
  ai_p_score_initial: number | null
  created_at: string
}

export interface Challenge {
  id: string
  challenger_id: string
  challenged_id: string
  status: ChallengeStatus
  created_at: string
  expires_at: string
}

export interface Match {
  id: string
  challenge_id: string
  player1_id: string
  player2_id: string
  winner_id: string | null
  started_at: string
  ended_at: string | null
}

export interface MatchAnswer {
  id: string
  match_id: string
  player_id: string
  question_id: string
  answer: string
  time_ms: number
  is_correct: boolean
  points_awarded: number
}
