'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function SessionPage() {
  const [active, setActive] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/admin/session').then(r => r.json()).then(d => setActive(d.active))
  }, [])

  async function toggle() {
    setLoading(true)
    await fetch('/api/admin/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    })
    setActive(a => !a)
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto mt-10 px-4">
      <Card className="text-center space-y-6">
        <h1 className="text-2xl font-bold text-klm-dark">Session Control</h1>
        <div className={`text-5xl ${active ? 'text-green-500' : 'text-gray-400'}`}>
          {active ? '🟢' : '🔴'}
        </div>
        <p className="font-semibold text-lg">{active ? 'Session is ACTIVE' : 'Session is INACTIVE'}</p>
        <p className="text-sm text-gray-500">
          {active ? 'Ladder and challenges are live. Students can play.' : 'Challenges and ladder movements are disabled.'}
        </p>
        <Button onClick={toggle} disabled={loading} variant={active ? 'danger' : 'primary'} className="w-full">
          {loading ? '…' : active ? 'Stop Session' : 'Start Session'}
        </Button>
      </Card>
    </div>
  )
}
