'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { User } from '@/types'
import { canChallenge } from '@/lib/ladder/positions'

interface Props {
  currentUser: User
  target: User
  onChallenge: (targetId: string) => Promise<void>
  isPending: boolean
  hasOutgoingChallenge: boolean
}

export function ChallengeButton({ currentUser, target, onChallenge, isPending, hasOutgoingChallenge }: Props) {
  const [loading, setLoading] = useState(false)

  const eligible = canChallenge(currentUser.ladder_position, target.ladder_position)
  const busy = target.status === 'in_match'

  if (!eligible || target.id === currentUser.id) return null

  if (isPending) {
    return (
      <span className="text-xs px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 font-medium flex-shrink-0 border border-amber-200">
        Pending…
      </span>
    )
  }

  return (
    <Button
      variant="primary"
      className="text-xs px-3 py-1.5 flex-shrink-0"
      disabled={busy || loading || hasOutgoingChallenge}
      title={busy ? 'Player is in a match' : hasOutgoingChallenge ? 'You already have a pending challenge' : 'Challenge this player'}
      onClick={async () => {
        setLoading(true)
        await onChallenge(target.id)
        setLoading(false)
      }}
    >
      {loading ? '…' : busy ? 'Busy' : 'Challenge'}
    </Button>
  )
}
