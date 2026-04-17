'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { User } from '@/types'
import { canChallenge } from '@/lib/ladder/positions'

interface Props {
  currentUser: User
  target: User
  onChallenge: (targetId: string) => Promise<void>
}

export function ChallengeButton({ currentUser, target, onChallenge }: Props) {
  const [loading, setLoading] = useState(false)

  const eligible = canChallenge(currentUser.ladder_position, target.ladder_position)
  const busy = target.status === 'in_match'

  if (!eligible || target.id === currentUser.id) return null

  return (
    <Button
      variant="primary"
      className="text-xs px-3 py-1.5 flex-shrink-0"
      disabled={busy || loading}
      title={busy ? 'Player is in a match' : 'Challenge this player'}
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
