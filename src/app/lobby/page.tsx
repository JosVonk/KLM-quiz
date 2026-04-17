'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LadderCard } from '@/components/ladder/LadderCard'
import { ChallengeButton } from '@/components/ladder/ChallengeButton'
import { ChallengeNotification } from '@/components/ladder/ChallengeNotification'
import type { User, Challenge } from '@/types'

export default function LobbyPage() {
  const [players, setPlayers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [incomingChallenge, setIncomingChallenge] = useState<(Challenge & { challenger_name: string }) | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const loadPlayers = useCallback(async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('ladder_position', { ascending: true })
    setPlayers(data ?? [])
  }, [supabase])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
      setCurrentUser(data)
      await loadPlayers()

      supabase.channel('challenges')
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'challenges',
          filter: `challenged_id=eq.${user.id}`,
        }, async (payload) => {
          const c = payload.new as Challenge
          const { data: challenger } = await supabase.from('users').select('username').eq('id', c.challenger_id).single()
          setIncomingChallenge({ ...c, challenger_name: challenger?.username ?? 'Someone' })
        })
        .subscribe()

      supabase.channel('ladder')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, loadPlayers)
        .subscribe()
    }
    init()
    return () => { supabase.removeAllChannels() }
  }, [])

  async function sendChallenge(targetId: string) {
    const res = await fetch('/api/challenges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengedId: targetId }),
    })
    if (!res.ok) {
      const { error } = await res.json()
      alert(error)
    }
  }

  async function respondToChallenge(action: 'accept' | 'decline') {
    if (!incomingChallenge) return
    const res = await fetch('/api/challenges', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId: incomingChallenge.id, action }),
    })
    const json = await res.json()
    setIncomingChallenge(null)
    if (action === 'accept' && json.matchId) {
      router.push(`/match/${json.matchId}`)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {incomingChallenge && (
        <ChallengeNotification
          challengerName={incomingChallenge.challenger_name}
          expiresAt={incomingChallenge.expires_at}
          onAccept={() => respondToChallenge('accept')}
          onDecline={() => respondToChallenge('decline')}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-klm-dark">Ladder</h1>
        <span className="text-sm text-gray-500">{players.length} players</span>
      </div>

      <div className="space-y-2">
        {players.map((player, i) => (
          <div key={player.id} className="flex items-center gap-2">
            <div className="flex-1">
              <LadderCard
                player={player}
                rank={i + 1}
                isCurrentUser={player.id === currentUser?.id}
              />
            </div>
            {currentUser && player.id !== currentUser.id && (
              <ChallengeButton
                currentUser={currentUser}
                target={player}
                onChallenge={sendChallenge}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
