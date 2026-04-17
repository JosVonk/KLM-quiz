import { cn } from '@/lib/utils'

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('bg-white rounded-xl shadow-sm border border-gray-100 p-4', className)}>
      {children}
    </div>
  )
}
