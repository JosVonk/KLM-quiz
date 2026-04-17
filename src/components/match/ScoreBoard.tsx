import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

interface PlayerResult {
  name: string
  score: number
  isCurrentUser: boolean
}

export function ScoreBoard({ results, positionChange }: {
  results: PlayerResult[]
  positionChange: number
}) {
  const sorted = [...results].sort((a, b) => b.score - a.score)
  return (
    <Card className="max-w-md mx-auto text-center space-y-6">
      <h2 className="text-2xl font-bold text-klm-dark">Match Over!</h2>
      <div className="space-y-3">
        {sorted.map((p, i) => (
          <div key={p.name} className={`flex items-center justify-between px-4 py-3 rounded-lg
            ${p.isCurrentUser ? 'bg-klm-light border border-klm-blue' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{i === 0 ? '🥇' : '🥈'}</span>
              <span className="font-semibold">{p.name}</span>
              {p.isCurrentUser && <span className="text-xs text-klm-blue">(you)</span>}
            </div>
            <span className="font-bold text-klm-blue">{p.score} pts</span>
          </div>
        ))}
      </div>
      {positionChange !== 0 && (
        <p className={`font-semibold text-lg ${positionChange < 0 ? 'text-green-600' : 'text-red-500'}`}>
          {positionChange < 0 ? `↑ You climbed ${Math.abs(positionChange)} position(s)!` : `↓ You dropped ${positionChange} position(s)`}
        </p>
      )}
      <Link href="/lobby">
        <Button className="w-full">Back to Ladder</Button>
      </Link>
    </Card>
  )
}
