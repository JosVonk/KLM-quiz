'use client'

import { useEffect, useState } from 'react'

export function Timer({ durationMs, startedAt, onExpire }: {
  durationMs: number
  startedAt: number
  onExpire: () => void
}) {
  const [pct, setPct] = useState(100)

  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = Date.now() - startedAt
      const remaining = Math.max(0, durationMs - elapsed)
      setPct((remaining / durationMs) * 100)
      if (remaining === 0) { clearInterval(id); onExpire() }
    }, 100)
    return () => clearInterval(id)
  }, [startedAt, durationMs, onExpire])

  return (
    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full transition-all rounded-full"
        style={{
          width: `${pct}%`,
          backgroundColor: pct > 33 ? '#00A1DE' : '#ef4444',
        }}
      />
    </div>
  )
}
