'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { LadderCard } from '@/components/ladder/LadderCard'
import { ChallengeButton } from '@/components/ladder/ChallengeButton'
import { ChallengeNotification } from '@/components/ladder/ChallengeNotification'
import type { User, Challenge } from '@/types'

export default function LobbyPage() {
  const [players, setPlayers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [incomingChallenge, setIncomingChallenge] = useState<(Challenge & { challenger_name: string }) | null>(null)
  const [pendingChallengeTargetId, setPendingChallengeTargetId] = useState<string | null>(null)
  const [sessionActive, setSessionActive] = useState<boolean | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const loadPlayers = useCallback(async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('ladder_position', { ascending: true })
    setPlayers(data ?? [])
  }, [supabase])

  const loadPendingChallenge = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('challenges')
      .select('challenged_id')
      .eq('challenger_id', userId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()
    setPendingChallengeTargetId(data?.challenged_id ?? null)
  }, [supabase])

  const checkIncomingChallenge = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('challenges')
      .select('*, challenger:challenger_id(username)')
      .eq('challenged_id', userId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()
    if (data) {
      const name = (data.challenger as { username: string } | null)?.username ?? 'Someone'
      setIncomingChallenge({ ...data, challenger_name: name })
    } else {
      setIncomingChallenge(null)
    }
  }, [supabase])

  useEffect(() => {
    let cancelled = false
    let pollInterval: ReturnType<typeof setInterval> | null = null

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) { router.push('/login'); return }

      const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
      if (cancelled) return
      setCurrentUser(data)

      const { data: setting } = await supabase.from('app_settings').select('value').eq('key', 'session_active').single()
      const active = setting?.value === 'true'
      setSessionActive(active)
      if (cancelled) return

      if (!active && !data?.is_admin) return

      await loadPlayers()
      await loadPendingChallenge(user.id)
      await checkIncomingChallenge(user.id)
      if (cancelled) return

      // Poll every 5s: challenge notifications + session status
      pollInterval = setInterval(async () => {
        if (cancelled) return
        checkIncomingChallenge(user.id)
        loadPendingChallenge(user.id)
        const { data: s } = await supabase.from('app_settings').select('value').eq('key', 'session_active').single()
        setSessionActive(s?.value === 'true')
      }, 5000)

      supabase.removeAllChannels()

      supabase.channel(`challenges-${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'challenges',
          filter: `challenged_id=eq.${user.id}`,
        }, () => checkIncomingChallenge(user.id))
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'challenges',
          filter: `challenger_id=eq.${user.id}`,
        }, (payload) => {
          const c = payload.new as Challenge
          if (c.status !== 'pending') setPendingChallengeTargetId(null)
        })
        .subscribe()

      supabase.channel('ladder')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, loadPlayers)
        .subscribe()
    }

    init()
    return () => {
      cancelled = true
      if (pollInterval) clearInterval(pollInterval)
      supabase.removeAllChannels()
    }
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
    } else {
      setPendingChallengeTargetId(targetId)
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

  if (sessionActive === null) {
    return <div className="flex justify-center mt-20 text-klm-blue animate-pulse">Loading…</div>
  }

  if (!sessionActive && !currentUser?.is_admin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center space-y-4">
        <div className="text-5xl">🔴</div>
        <h1 className="text-2xl font-bold text-klm-dark">Session not started yet</h1>
        <p className="text-gray-500 max-w-sm">The quiz session hasn&apos;t started yet. Please wait for the admin to start the session.</p>
      </div>
    )
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
        <div className="flex items-center gap-3">
          {currentUser?.is_admin && (
            <Link href="/admin" className="px-3 py-1.5 rounded-lg bg-klm-dark text-white text-sm font-medium hover:bg-klm-blue transition-colors">
              Admin
            </Link>
          )}
          <span className="text-sm text-gray-500">{players.length} players</span>
        </div>
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
                isPending={pendingChallengeTargetId === player.id}
                hasOutgoingChallenge={pendingChallengeTargetId !== null}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
