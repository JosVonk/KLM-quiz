import { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
}

export function Button({ variant = 'primary', className, children, ...props }: ButtonProps) {
  const variants = {
    primary: 'bg-klm-blue hover:bg-blue-500 text-white',
    secondary: 'bg-white border border-klm-blue text-klm-blue hover:bg-klm-light',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  }
  return (
    <button
      className={cn(
        'px-4 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
