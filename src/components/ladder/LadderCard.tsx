import Image from 'next/image'
import { Badge } from '@/components/ui/Badge'
import { countryFlag } from '@/lib/countries'
import type { User } from '@/types'

interface Props {
  player: User
  rank: number
  isCurrentUser: boolean
}

export function LadderCard({ player, rank, isCurrentUser }: Props) {
  return (
    <div className={`flex items-center gap-4 p-3 rounded-xl border transition-all
      ${isCurrentUser ? 'border-klm-blue bg-klm-light' : 'border-gray-100 bg-white hover:border-klm-blue/30'}`}>
      <span className="w-8 text-center font-bold text-klm-dark text-lg">{rank}</span>
      <div className="w-10 h-10 rounded-full overflow-hidden bg-klm-light border border-klm-blue/20 flex-shrink-0">
        {player.photo_url ? (
          <Image src={player.photo_url} alt={player.username} width={40} height={40} className="object-cover w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-klm-blue font-bold">
            {player.username[0].toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-klm-dark truncate">{player.username}</span>
          {player.nationality && <span title={player.nationality}>{countryFlag(player.nationality)}</span>}
        </div>
      </div>
      <Badge variant={player.status === 'in_match' ? 'in_match' : 'idle'}
        label={player.status === 'in_match' ? 'In Match' : 'Ready'} />
    </div>
  )
}
