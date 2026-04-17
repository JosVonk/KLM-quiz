import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'KLM Quiz — Erasmus BIP',
  description: 'Multiplayer quiz ladder competition',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <header className="bg-klm-dark text-white px-6 py-3 flex items-center gap-3 shadow-md">
          <span className="text-2xl font-bold tracking-tight text-klm-blue">KLM</span>
          <span className="text-sm font-medium opacity-80">Erasmus BIP Quiz</span>
        </header>
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  )
}
