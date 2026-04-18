'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/admin/session', label: 'Session' },
  { href: '/admin/questions', label: 'Questions' },
  { href: '/admin/users', label: 'Users' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div>
      <nav className="bg-klm-dark text-white">
        <div className="max-w-5xl mx-auto px-4 flex items-center gap-1 h-12">
          <span className="font-bold text-klm-blue mr-4">Admin</span>
          {NAV.map(n => (
            <Link
              key={n.href}
              href={n.href}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                pathname.startsWith(n.href) ? 'bg-klm-blue text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {n.label}
            </Link>
          ))}
          <div className="ml-auto">
            <Link href="/lobby" className="text-xs text-gray-400 hover:text-white">← Back to lobby</Link>
          </div>
        </div>
      </nav>
      {children}
    </div>
  )
}
