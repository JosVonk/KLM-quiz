'use client'

import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface Props {
  challengerName: string
  expiresAt: string
  onAccept: () => void
  onDecline: () => void
}

export function ChallengeNotification({ challengerName, expiresAt, onAccept, onDecline }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') {
          new Notification('KLM Quiz — Challenge!', {
            body: `${challengerName} challenged you! You have 5 minutes to respond.`,
          })
        }
      })
    }
  }, [challengerName])

  useEffect(() => {
    function tick() {
      const left = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
      setSecondsLeft(left)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  return (
    <Modal>
      <div className="text-center space-y-4">
        <div className="text-5xl">⚡</div>
        <h2 className="text-2xl font-bold text-klm-dark">You&apos;ve been challenged!</h2>
        <p className="text-gray-600">
          <span className="font-semibold text-klm-blue">{challengerName}</span> wants to quiz you.
        </p>
        <div className="text-4xl font-mono font-bold text-klm-blue">
          {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
        </div>
        <p className="text-sm text-gray-500">Time remaining to accept</p>
        <div className="flex gap-3 justify-center pt-2">
          <Button onClick={onAccept} className="px-8">Accept</Button>
          <Button onClick={onDecline} variant="secondary" className="px-8">Decline</Button>
        </div>
      </div>
    </Modal>
  )
}
