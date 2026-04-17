import { cn } from '@/lib/utils'

type BadgeVariant = 'idle' | 'in_match' | 'admin'

const styles: Record<BadgeVariant, string> = {
  idle: 'bg-green-100 text-green-700',
  in_match: 'bg-yellow-100 text-yellow-700',
  admin: 'bg-klm-dark text-white',
}

export function Badge({ variant, label }: { variant: BadgeVariant; label: string }) {
  return (
    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', styles[variant])}>
      {label}
    </span>
  )
}
