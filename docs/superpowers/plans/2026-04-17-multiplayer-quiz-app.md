# Multiplayer Quiz App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-time multiplayer quiz app with ladder competition for 20–50 Erasmus BIP students, themed in KLM house style.

**Architecture:** Next.js 14 App Router frontend + API routes, Supabase for PostgreSQL/auth/storage/realtime, Claude API for AI P-score estimation. Business logic (psychometrics, ladder positions, scoring) lives in pure TypeScript utility modules so it can be unit-tested independently of the framework.

**Tech Stack:** Next.js 14, TypeScript, Supabase (JS SDK v2), Tailwind CSS, Vitest (unit tests), Playwright (E2E)

**Spec:** `docs/superpowers/specs/2026-04-17-multiplayer-quiz-app-design.md`

---

## File Structure

```
src/
  app/
    layout.tsx                     # Root layout: KLM fonts, theme, Supabase provider
    page.tsx                       # Redirect → /lobby or /login
    login/page.tsx
    register/page.tsx
    lobby/page.tsx                 # Ladder view + challenge UI
    match/[id]/page.tsx            # Real-time match room
    profile/page.tsx               # Edit profile photo + nationality
    admin/
      page.tsx                     # Admin dashboard redirect
      questions/page.tsx           # Question CRUD
      questions/import/page.tsx    # Bulk import
      users/page.tsx               # User management
      session/page.tsx             # Session control
  components/
    ui/
      Button.tsx                   # KLM-styled button
      Card.tsx                     # KLM-styled card
      Badge.tsx                    # Status badge (In Match, Idle)
      Modal.tsx                    # Full-screen modal overlay
    ladder/
      LadderCard.tsx               # One player row on the ladder
      ChallengeButton.tsx          # Challenge button (disabled when busy)
      ChallengeNotification.tsx    # Full-screen incoming challenge overlay
    match/
      QuestionCard.tsx             # Question + options display
      Timer.tsx                    # Countdown bar
      ScoreBoard.tsx               # End-of-match scores
    admin/
      QuestionForm.tsx             # Create/edit question form
      QualityTable.tsx             # P-score / Rit table with flag actions
      ImportForm.tsx               # CSV/JSON upload form
  lib/
    supabase/
      client.ts                    # Browser Supabase client (singleton)
      server.ts                    # Server Supabase client (cookies)
    quiz/
      scoring.ts                   # Points calculation (correctness + time bonus)
      psychometrics.ts             # P-score update, incremental Rit calculation
      question-selector.ts         # Adaptive difficulty selection by ladder tier
    ladder/
      positions.ts                 # Ladder position swap/drop logic
    ai/
      p-score-estimator.ts         # Claude API call to estimate initial P-score
  types/
    index.ts                       # All TypeScript types matching DB schema
supabase/
  migrations/
    001_initial_schema.sql
    002_rls_policies.sql
  functions/
    inactivity-cron/index.ts       # Supabase scheduled function
```

---

## Task 1: Project Bootstrap

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`
- Create: `.env.local.example`

- [ ] **Step 1: Initialise Next.js project**

```bash
cd "c:/Users/871745/Test 1 claude code"
npx create-next-app@14 . --typescript --tailwind --app --src-dir --import-alias "@/*" --no-git
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr @anthropic-ai/sdk
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @playwright/test
```

- [ ] **Step 3: Create `.env.local.example`**

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-anthropic-key
```

Copy to `.env.local` and fill in values from your Supabase project dashboard.

- [ ] **Step 4: Configure Vitest — create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

- [ ] **Step 5: Create `src/test/setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Add test script to `package.json`**

Add to scripts: `"test": "vitest run"`, `"test:watch": "vitest"`

- [ ] **Step 7: Commit**

```bash
git init && git add -A && git commit -m "feat: bootstrap Next.js project with Supabase and Vitest"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Write types**

```typescript
// src/types/index.ts

export type UserStatus = 'idle' | 'in_match'
export type QuestionType = 'multiple_choice' | 'true_false'
export type ChallengeStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'completed'
export type Topic =
  | 'klm_marketing'
  | 'klm_brand_management'
  | 'klm_brand_guide'
  | 'klm_tagless_luggage'
  | 'virtual_humans'
  | 'vibecoding'

export interface User {
  id: string
  username: string
  email: string
  ladder_position: number
  last_active_at: string
  is_admin: boolean
  photo_url: string | null
  nationality: string | null  // ISO 3166-1 alpha-2 e.g. "NL"
  status: UserStatus
  created_at: string
}

export interface Question {
  id: string
  topic: Topic
  type: QuestionType
  question_en: string
  options: string[]           // For true_false: ["True", "False"]
  correct_answer: string
  media_url: string | null
  p_score: number             // 0–1; lower = harder
  rit_value: number | null    // null until n >= 5
  times_asked: number
  flagged: boolean
  approved: boolean
  ai_p_score_initial: number | null
  created_at: string
}

export interface Challenge {
  id: string
  challenger_id: string
  challenged_id: string
  status: ChallengeStatus
  created_at: string
  expires_at: string
}

export interface Match {
  id: string
  challenge_id: string
  player1_id: string
  player2_id: string
  winner_id: string | null
  started_at: string
  ended_at: string | null
}

export interface MatchAnswer {
  id: string
  match_id: string
  player_id: string
  question_id: string
  answer: string
  time_ms: number
  is_correct: boolean
  points_awarded: number
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts && git commit -m "feat: add TypeScript types"
```

---

## Task 3: Database Schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `supabase/migrations/002_rls_policies.sql`

- [ ] **Step 1: Install Supabase CLI and link project**

```bash
npm install -g supabase
supabase login
supabase init
supabase link --project-ref YOUR_PROJECT_REF
```

- [ ] **Step 2: Create `supabase/migrations/001_initial_schema.sql`**

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  username text not null unique,
  ladder_position int not null default 0,
  last_active_at timestamptz not null default now(),
  is_admin boolean not null default false,
  photo_url text,
  nationality char(2),
  status text not null default 'idle' check (status in ('idle', 'in_match')),
  created_at timestamptz not null default now()
);

-- Questions table
create table public.questions (
  id uuid primary key default uuid_generate_v4(),
  topic text not null check (topic in (
    'klm_marketing', 'klm_brand_management', 'klm_brand_guide',
    'klm_tagless_luggage', 'virtual_humans', 'vibecoding'
  )),
  type text not null check (type in ('multiple_choice', 'true_false')),
  question_en text not null,
  options jsonb not null,
  correct_answer text not null,
  media_url text,
  p_score float not null default 0.5,
  rit_value float,
  times_asked int not null default 0,
  flagged boolean not null default false,
  approved boolean not null default true,
  ai_p_score_initial float,
  created_at timestamptz not null default now()
);

-- Challenges table
create table public.challenges (
  id uuid primary key default uuid_generate_v4(),
  challenger_id uuid not null references public.users(id),
  challenged_id uuid not null references public.users(id),
  status text not null default 'pending' check (
    status in ('pending', 'accepted', 'declined', 'expired', 'completed')
  ),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- Matches table
create table public.matches (
  id uuid primary key default uuid_generate_v4(),
  challenge_id uuid not null references public.challenges(id),
  player1_id uuid not null references public.users(id),
  player2_id uuid not null references public.users(id),
  winner_id uuid references public.users(id),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

-- Match answers table
create table public.match_answers (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references public.matches(id),
  player_id uuid not null references public.users(id),
  question_id uuid not null references public.questions(id),
  answer text not null,
  time_ms int not null,
  is_correct boolean not null,
  points_awarded int not null default 0
);

-- Indexes
create index on public.challenges(challenged_id, status);
create index on public.matches(player1_id, player2_id);
create index on public.match_answers(match_id, player_id);
create index on public.questions(topic, p_score, flagged, approved);

-- Realtime: enable for tables that need live updates
alter publication supabase_realtime add table public.challenges;
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.users;
```

- [ ] **Step 3: Create `supabase/migrations/002_rls_policies.sql`**

```sql
-- Enable RLS
alter table public.users enable row level security;
alter table public.questions enable row level security;
alter table public.challenges enable row level security;
alter table public.matches enable row level security;
alter table public.match_answers enable row level security;

-- Users: anyone authenticated can read; only own row can be updated
create policy "users_select" on public.users for select to authenticated using (true);
create policy "users_update_own" on public.users for update to authenticated using (auth.uid() = id);

-- Questions: authenticated users can read approved, unflagged questions
create policy "questions_select" on public.questions for select to authenticated
  using (approved = true and flagged = false);

-- Challenges: players see their own challenges
create policy "challenges_select" on public.challenges for select to authenticated
  using (auth.uid() = challenger_id or auth.uid() = challenged_id);
create policy "challenges_insert" on public.challenges for insert to authenticated
  with check (auth.uid() = challenger_id);
create policy "challenges_update" on public.challenges for update to authenticated
  using (auth.uid() = challenged_id or auth.uid() = challenger_id);

-- Matches: players see their own matches
create policy "matches_select" on public.matches for select to authenticated
  using (auth.uid() = player1_id or auth.uid() = player2_id);

-- Match answers: players see answers for their matches
create policy "match_answers_select" on public.match_answers for select to authenticated
  using (auth.uid() = player_id);
create policy "match_answers_insert" on public.match_answers for insert to authenticated
  with check (auth.uid() = player_id);
```

- [ ] **Step 4: Apply migrations**

```bash
supabase db push
```

Expected: migrations applied successfully, tables visible in Supabase dashboard.

- [ ] **Step 5: Commit**

```bash
git add supabase/ && git commit -m "feat: add database schema and RLS policies"
```

---

## Task 4: Supabase Client Utilities

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/middleware.ts`

- [ ] **Step 1: Create browser client `src/lib/supabase/client.ts`**

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Create server client `src/lib/supabase/server.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 3: Create `src/middleware.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  if (!user && !['/login', '/register'].includes(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && ['/login', '/register'].includes(pathname)) {
    return NextResponse.redirect(new URL('/lobby', request.url))
  }
  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/ src/middleware.ts && git commit -m "feat: add Supabase client utilities and auth middleware"
```

---

## Task 5: KLM Theme & Root Layout

**Files:**
- Create: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/Card.tsx`
- Create: `src/components/ui/Badge.tsx`
- Create: `src/components/ui/Modal.tsx`

- [ ] **Step 1: Update `tailwind.config.ts` with KLM colours**

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        klm: {
          blue: '#00A1DE',
          dark: '#003145',
          light: '#E8F7FC',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
```

- [ ] **Step 2: Update `src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-klm-light text-klm-dark font-sans;
  }
}
```

- [ ] **Step 3: Update `src/app/layout.tsx`**

```typescript
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
```

- [ ] **Step 4: Create `src/components/ui/Button.tsx`**

```typescript
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
```

- [ ] **Step 5: Create `src/lib/utils.ts`** (cn helper)

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

Install: `npm install clsx tailwind-merge`

- [ ] **Step 6: Create `src/components/ui/Card.tsx`**

```typescript
import { cn } from '@/lib/utils'

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('bg-white rounded-xl shadow-sm border border-gray-100 p-4', className)}>
      {children}
    </div>
  )
}
```

- [ ] **Step 7: Create `src/components/ui/Badge.tsx`**

```typescript
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
```

- [ ] **Step 8: Create `src/components/ui/Modal.tsx`**

```typescript
'use client'

import { useEffect } from 'react'

export function Modal({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-klm-dark/80 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat: KLM theme, layout, and base UI components"
```

---

## Task 6: Authentication Pages

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/register/page.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/auth/callback/route.ts`

- [ ] **Step 1: Create `src/app/page.tsx`** (redirect)

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  redirect(user ? '/lobby' : '/login')
}
```

- [ ] **Step 2: Create `src/app/login/page.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/lobby')
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <Card className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-klm-dark mb-6">Sign in</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-klm-blue"
              required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-klm-blue"
              required />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p className="text-sm text-center mt-4 text-gray-500">
          No account? <Link href="/register" className="text-klm-blue font-medium">Register</Link>
        </p>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Create `src/app/register/page.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { COUNTRIES } from '@/lib/countries'
import Link from 'next/link'

export default function RegisterPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nationality, setNationality] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError || !data.user) {
      setError(signUpError?.message ?? 'Registration failed')
      setLoading(false)
      return
    }
    const { error: profileError } = await supabase.from('users').insert({
      id: data.user.id,
      username,
      nationality: nationality || null,
      ladder_position: 0,
    })
    if (profileError) { setError(profileError.message); setLoading(false); return }
    router.push('/profile')
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <Card className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-klm-dark mb-6">Create account</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-klm-blue"
              required minLength={2} maxLength={30} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-klm-blue"
              required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-klm-blue"
              required minLength={8} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nationality</label>
            <select value={nationality} onChange={e => setNationality(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-klm-blue">
              <option value="">Select country…</option>
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
            </select>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Register'}
          </Button>
        </form>
        <p className="text-sm text-center mt-4 text-gray-500">
          Already registered? <Link href="/login" className="text-klm-blue font-medium">Sign in</Link>
        </p>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Create `src/lib/countries.ts`**

```typescript
export const COUNTRIES = [
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
].sort((a, b) => a.name.localeCompare(b.name))

export function countryFlag(code: string): string {
  return COUNTRIES.find(c => c.code === code)?.flag ?? '🌍'
}

export function countryName(code: string): string {
  return COUNTRIES.find(c => c.code === code)?.name ?? code
}
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: authentication pages (login, register)"
```

---

## Task 7: Business Logic — Scoring & Psychometrics

**Files:**
- Create: `src/lib/quiz/scoring.ts`
- Create: `src/lib/quiz/psychometrics.ts`
- Create: `src/lib/quiz/question-selector.ts`
- Create: `src/lib/ladder/positions.ts`
- Create: `src/lib/quiz/scoring.test.ts`
- Create: `src/lib/quiz/psychometrics.test.ts`
- Create: `src/lib/ladder/positions.test.ts`

- [ ] **Step 1: Write failing tests for scoring**

```typescript
// src/lib/quiz/scoring.test.ts
import { describe, it, expect } from 'vitest'
import { calculatePoints } from './scoring'

describe('calculatePoints', () => {
  it('returns 0 for incorrect answer', () => {
    expect(calculatePoints(false, 5000, 20000)).toBe(0)
  })
  it('returns max points for instant correct answer', () => {
    expect(calculatePoints(true, 0, 20000)).toBe(1000)
  })
  it('returns min points for correct answer at time limit', () => {
    expect(calculatePoints(true, 20000, 20000)).toBe(500)
  })
  it('returns proportional points for mid-time answer', () => {
    expect(calculatePoints(true, 10000, 20000)).toBe(750)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run src/lib/quiz/scoring.test.ts
```

Expected: FAIL — `calculatePoints` not found.

- [ ] **Step 3: Implement `src/lib/quiz/scoring.ts`**

```typescript
const MAX_POINTS = 1000
const MIN_POINTS = 500

export function calculatePoints(isCorrect: boolean, timeMs: number, timeLimitMs: number): number {
  if (!isCorrect) return 0
  const ratio = Math.max(0, 1 - timeMs / timeLimitMs)
  return Math.round(MIN_POINTS + ratio * (MAX_POINTS - MIN_POINTS))
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/lib/quiz/scoring.test.ts
```

- [ ] **Step 5: Write failing tests for psychometrics**

```typescript
// src/lib/quiz/psychometrics.test.ts
import { describe, it, expect } from 'vitest'
import { updatePScore, updateRit } from './psychometrics'

describe('updatePScore', () => {
  it('increases p_score when answered correctly', () => {
    const newScore = updatePScore(0.4, 10, true)
    expect(newScore).toBeGreaterThan(0.4)
  })
  it('decreases p_score when answered incorrectly', () => {
    const newScore = updatePScore(0.6, 10, false)
    expect(newScore).toBeLessThan(0.6)
  })
  it('stays between 0 and 1', () => {
    expect(updatePScore(0.0, 100, false)).toBeGreaterThanOrEqual(0)
    expect(updatePScore(1.0, 100, true)).toBeLessThanOrEqual(1)
  })
})

describe('updateRit', () => {
  it('returns null when fewer than 5 answers', () => {
    expect(updateRit(null, 4, true, 700, 600)).toBeNull()
  })
  it('returns a number when 5 or more answers', () => {
    const result = updateRit(null, 5, true, 800, 600)
    expect(typeof result).toBe('number')
  })
  it('adjusts existing rit incrementally without resetting', () => {
    const initial = 0.3
    const updated = updateRit(initial, 10, true, 800, 500)
    expect(updated).not.toBeNull()
    expect(updated).not.toBe(initial)
  })
})
```

- [ ] **Step 6: Run tests — expect FAIL**

```bash
npx vitest run src/lib/quiz/psychometrics.test.ts
```

- [ ] **Step 7: Implement `src/lib/quiz/psychometrics.ts`**

```typescript
/**
 * Update P-score (difficulty index) after one response.
 * P-score = proportion correct; updated as running average.
 */
export function updatePScore(currentP: number, timesAsked: number, isCorrect: boolean): number {
  const newP = (currentP * timesAsked + (isCorrect ? 1 : 0)) / (timesAsked + 1)
  return Math.max(0, Math.min(1, newP))
}

/**
 * Incrementally update Rit (point-biserial discrimination index).
 * Uses exponential moving average with α=0.1 once n >= 5.
 * Returns null if fewer than 5 responses have been recorded.
 *
 * pointBiserial approximation: correlation signal = isCorrect ? +1 : -1,
 * normalised against average performance (itemScore - meanScore) / sdScore.
 * We use a simplified incremental proxy since full recalculation requires
 * all responses in memory.
 */
export function updateRit(
  currentRit: number | null,
  timesAsked: number,
  isCorrect: boolean,
  playerPoints: number,
  avgPoints: number
): number | null {
  if (timesAsked < 5) return null
  const signal = ((isCorrect ? 1 : 0) - 0.5) * Math.sign(playerPoints - avgPoints)
  if (currentRit === null) return signal
  const alpha = 0.1
  return currentRit + alpha * (signal - currentRit)
}

export function shouldFlag(ritValue: number | null, timesAsked: number): boolean {
  return ritValue !== null && ritValue < 0 && timesAsked >= 5
}
```

- [ ] **Step 8: Run tests — expect PASS**

```bash
npx vitest run src/lib/quiz/psychometrics.test.ts
```

- [ ] **Step 9: Write failing tests for ladder positions**

```typescript
// src/lib/ladder/positions.test.ts
import { describe, it, expect } from 'vitest'
import { canChallenge, swapPositions, challengerLoses } from './positions'

describe('canChallenge', () => {
  it('allows challenge up to 3 positions higher', () => {
    expect(canChallenge(10, 7)).toBe(true)
    expect(canChallenge(10, 8)).toBe(true)
  })
  it('blocks challenge more than 3 positions higher', () => {
    expect(canChallenge(10, 6)).toBe(false)
  })
  it('blocks challenging same position or lower', () => {
    expect(canChallenge(5, 5)).toBe(false)
    expect(canChallenge(5, 6)).toBe(false)
  })
})

describe('swapPositions', () => {
  it('returns swapped positions', () => {
    expect(swapPositions(10, 7)).toEqual({ challengerPos: 7, challengedPos: 10 })
  })
})

describe('challengerLoses', () => {
  it('drops challenger by 1, keeps challenged', () => {
    expect(challengerLoses(10, 7)).toEqual({ challengerPos: 11, challengedPos: 7 })
  })
})
```

- [ ] **Step 10: Run tests — expect FAIL**

```bash
npx vitest run src/lib/ladder/positions.test.ts
```

- [ ] **Step 11: Implement `src/lib/ladder/positions.ts`**

```typescript
export function canChallenge(challengerPos: number, challengedPos: number): boolean {
  const diff = challengerPos - challengedPos
  return diff >= 1 && diff <= 3
}

export function swapPositions(challengerPos: number, challengedPos: number) {
  return { challengerPos: challengedPos, challengedPos: challengerPos }
}

export function challengerLoses(challengerPos: number, challengedPos: number) {
  return { challengerPos: challengerPos + 1, challengedPos }
}
```

- [ ] **Step 12: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 13: Implement `src/lib/quiz/question-selector.ts`**

```typescript
import { Question, User } from '@/types'

type Tier = 'hard' | 'medium' | 'easy'

export function getPlayerTier(position: number, totalPlayers: number): Tier {
  const pct = position / totalPlayers
  if (pct <= 0.33) return 'hard'
  if (pct <= 0.66) return 'medium'
  return 'easy'
}

export function pScoreRange(tier: Tier): { min: number; max: number } {
  if (tier === 'hard') return { min: 0, max: 0.4 }
  if (tier === 'medium') return { min: 0.35, max: 0.65 }
  return { min: 0.6, max: 1 }
}

export function selectQuestions(
  questions: Question[],
  tier: Tier,
  count: number
): Question[] {
  const { min, max } = pScoreRange(tier)
  const topics = [...new Set(questions.map(q => q.topic))]
  const perTopic = Math.ceil(count / topics.length)
  const selected: Question[] = []

  for (const topic of topics) {
    const pool = questions
      .filter(q => q.topic === topic && q.p_score >= min && q.p_score <= max && !q.flagged && q.approved)
      .sort(() => Math.random() - 0.5)
      .slice(0, perTopic)
    selected.push(...pool)
  }

  return selected.sort(() => Math.random() - 0.5).slice(0, count)
}
```

- [ ] **Step 14: Commit**

```bash
git add -A && git commit -m "feat: scoring, psychometrics, ladder position logic with tests"
```

---

## Task 8: AI P-Score Estimator

**Files:**
- Create: `src/lib/ai/p-score-estimator.ts`
- Create: `src/app/api/ai/estimate-p-score/route.ts`

- [ ] **Step 1: Create `src/lib/ai/p-score-estimator.ts`**

```typescript
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function estimatePScore(
  questionText: string,
  options: string[],
  correctAnswer: string,
  topic: string
): Promise<number> {
  const prompt = `You are an educational assessment expert. Estimate the difficulty of the following quiz question for university students who have studied the topic.

Topic: ${topic}
Question: ${questionText}
Options: ${options.join(' | ')}
Correct answer: ${correctAnswer}

Return ONLY a single decimal number between 0.0 and 1.0 representing the P-score (proportion of students expected to answer correctly):
- 0.0–0.3 = very hard (few students will get it right)
- 0.3–0.7 = medium difficulty
- 0.7–1.0 = easy (most students will get it right)

Respond with just the number, e.g.: 0.65`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 10,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = (message.content[0] as { type: string; text: string }).text.trim()
  const score = parseFloat(text)
  if (isNaN(score)) return 0.5
  return Math.max(0, Math.min(1, score))
}
```

- [ ] **Step 2: Create API route `src/app/api/ai/estimate-p-score/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { estimatePScore } from '@/lib/ai/p-score-estimator'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { questionText, options, correctAnswer, topic } = await request.json()
  const pScore = await estimatePScore(questionText, options, correctAnswer, topic)
  return NextResponse.json({ pScore })
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: Claude API P-score estimator"
```

---

## Task 9: Profile Page

**Files:**
- Create: `src/app/profile/page.tsx`
- Create: `src/app/api/profile/route.ts`

- [ ] **Step 1: Create `src/app/api/profile/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const nationality = formData.get('nationality') as string | null
  const photo = formData.get('photo') as File | null

  let photo_url: string | undefined

  if (photo && photo.size > 0) {
    if (photo.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Photo must be under 2 MB' }, { status: 400 })
    }
    const ext = photo.name.split('.').pop()
    const path = `avatars/${user.id}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, photo, { upsert: true })
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    photo_url = data.publicUrl
  }

  const update: Record<string, unknown> = {}
  if (nationality) update.nationality = nationality
  if (photo_url) update.photo_url = photo_url

  const { error } = await supabase.from('users').update(update).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Create Supabase storage bucket**

In Supabase dashboard → Storage → New bucket: `avatars`, set to public.

Or via SQL:
```sql
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
```

- [ ] **Step 3: Create `src/app/profile/page.tsx`**

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { COUNTRIES } from '@/lib/countries'
import { useRouter } from 'next/navigation'
import type { User } from '@/types'
import Image from 'next/image'

export default function ProfilePage() {
  const [profile, setProfile] = useState<User | null>(null)
  const [nationality, setNationality] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
      setProfile(data)
      setNationality(data?.nationality ?? '')
    }
    load()
  }, [])

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const formData = new FormData()
    formData.set('nationality', nationality)
    if (file) formData.set('photo', file)
    const res = await fetch('/api/profile', { method: 'PATCH', body: formData })
    const json = await res.json()
    setSaving(false)
    setMessage(json.error ?? 'Profile saved!')
  }

  return (
    <div className="max-w-md mx-auto mt-10 px-4">
      <Card>
        <h1 className="text-xl font-bold text-klm-dark mb-6">Your Profile</h1>
        <form onSubmit={handleSave} className="space-y-5">
          <div className="flex flex-col items-center gap-3">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-klm-light border-2 border-klm-blue">
              {(preview || profile?.photo_url) ? (
                <Image src={preview ?? profile!.photo_url!} alt="avatar" width={96} height={96} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-klm-blue text-3xl">
                  {profile?.username?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>
              Upload photo
            </Button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nationality</label>
            <select value={nationality} onChange={e => setNationality(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-klm-blue">
              <option value="">Select country…</option>
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
            </select>
          </div>
          {message && <p className="text-sm text-green-600">{message}</p>}
          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            <Button type="button" variant="secondary" onClick={() => router.push('/lobby')}>Go to lobby</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: profile page with photo upload and nationality"
```

---

## Task 10: Lobby — Ladder View

**Files:**
- Create: `src/app/lobby/page.tsx`
- Create: `src/components/ladder/LadderCard.tsx`
- Create: `src/components/ladder/ChallengeButton.tsx`
- Create: `src/components/ladder/ChallengeNotification.tsx`
- Create: `src/app/api/challenges/route.ts`

- [ ] **Step 1: Create `src/components/ladder/LadderCard.tsx`**

```typescript
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
```

- [ ] **Step 2: Create `src/components/ladder/ChallengeButton.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { User } from '@/types'
import { canChallenge } from '@/lib/ladder/positions'

interface Props {
  currentUser: User
  target: User
  totalPlayers: number
  onChallenge: (targetId: string) => Promise<void>
}

export function ChallengeButton({ currentUser, target, totalPlayers, onChallenge }: Props) {
  const [loading, setLoading] = useState(false)

  const eligible = canChallenge(currentUser.ladder_position, target.ladder_position)
  const busy = target.status === 'in_match'

  if (!eligible || target.id === currentUser.id) return null

  return (
    <Button
      variant="primary"
      className="text-xs px-3 py-1.5"
      disabled={busy || loading}
      title={busy ? 'Player is in a match' : 'Challenge this player'}
      onClick={async () => {
        setLoading(true)
        await onChallenge(target.id)
        setLoading(false)
      }}
    >
      {loading ? '…' : busy ? 'Busy' : 'Challenge'}
    </Button>
  )
}
```

- [ ] **Step 3: Create `src/components/ladder/ChallengeNotification.tsx`**

```typescript
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
    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') {
          new Notification('KLM Quiz — Challenge!', {
            body: `${challengerName} challenged you! You have 5 minutes to respond.`,
          })
        }
      })
    }
  }, [])

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
        <h2 className="text-2xl font-bold text-klm-dark">You've been challenged!</h2>
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
```

- [ ] **Step 4: Create `src/app/api/challenges/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canChallenge } from '@/lib/ladder/positions'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { challengedId } = await request.json()

  // Load both players
  const { data: players } = await supabase
    .from('users')
    .select('id, ladder_position, status')
    .in('id', [user.id, challengedId])

  const challenger = players?.find(p => p.id === user.id)
  const challenged = players?.find(p => p.id === challengedId)

  if (!challenger || !challenged) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 })
  }
  if (challenged.status === 'in_match') {
    return NextResponse.json({ error: 'Player is in a match' }, { status: 409 })
  }
  if (!canChallenge(challenger.ladder_position, challenged.ladder_position)) {
    return NextResponse.json({ error: 'Cannot challenge this player' }, { status: 403 })
  }

  // Check no pending challenge already
  const { data: existing } = await supabase
    .from('challenges')
    .select('id')
    .eq('challenger_id', user.id)
    .eq('status', 'pending')
    .single()
  if (existing) {
    return NextResponse.json({ error: 'You already have a pending challenge' }, { status: 409 })
  }

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()
  const { data: challenge, error } = await supabase
    .from('challenges')
    .insert({ challenger_id: user.id, challenged_id: challengedId, expires_at: expiresAt })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update last_active_at for challenger
  await supabase.from('users').update({ last_active_at: new Date().toISOString() }).eq('id', user.id)

  return NextResponse.json({ challenge })
}

export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { challengeId, action } = await request.json() // action: 'accept' | 'decline'

  const { data: challenge } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .eq('challenged_id', user.id)
    .single()

  if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
  if (challenge.status !== 'pending') {
    return NextResponse.json({ error: 'Challenge is no longer pending' }, { status: 409 })
  }
  if (new Date(challenge.expires_at) < new Date()) {
    await supabase.from('challenges').update({ status: 'expired' }).eq('id', challengeId)
    return NextResponse.json({ error: 'Challenge expired' }, { status: 410 })
  }

  if (action === 'decline') {
    await supabase.from('challenges').update({ status: 'declined' }).eq('id', challengeId)
    return NextResponse.json({ success: true })
  }

  // Accept: create match, update both players to in_match
  await supabase.from('challenges').update({ status: 'accepted' }).eq('id', challengeId)
  const { data: match } = await supabase
    .from('matches')
    .insert({
      challenge_id: challengeId,
      player1_id: challenge.challenger_id,
      player2_id: challenge.challenged_id,
    })
    .select()
    .single()

  await supabase
    .from('users')
    .update({ status: 'in_match', last_active_at: new Date().toISOString() })
    .in('id', [challenge.challenger_id, challenge.challenged_id])

  return NextResponse.json({ matchId: match.id })
}
```

- [ ] **Step 5: Create `src/app/lobby/page.tsx`**

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LadderCard } from '@/components/ladder/LadderCard'
import { ChallengeButton } from '@/components/ladder/ChallengeButton'
import { ChallengeNotification } from '@/components/ladder/ChallengeNotification'
import type { User, Challenge } from '@/types'

export default function LobbyPage() {
  const [players, setPlayers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [incomingChallenge, setIncomingChallenge] = useState<(Challenge & { challenger_name: string }) | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const loadPlayers = useCallback(async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('ladder_position', { ascending: true })
    setPlayers(data ?? [])
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
      setCurrentUser(data)
      await loadPlayers()

      // Subscribe to challenge notifications
      supabase.channel('challenges')
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'challenges',
          filter: `challenged_id=eq.${user.id}`,
        }, async (payload) => {
          const c = payload.new as Challenge
          const { data: challenger } = await supabase.from('users').select('username').eq('id', c.challenger_id).single()
          setIncomingChallenge({ ...c, challenger_name: challenger?.username ?? 'Someone' })
        })
        .subscribe()

      // Subscribe to ladder changes
      supabase.channel('ladder')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, loadPlayers)
        .subscribe()
    }
    init()
    return () => { supabase.removeAllChannels() }
  }, [])

  async function sendChallenge(targetId: string) {
    const res = await fetch('/api/challenges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengedId: targetId }),
    })
    if (!res.ok) {
      const { error } = await res.json()
      alert(error)
    }
  }

  async function respondToChallenge(action: 'accept' | 'decline') {
    if (!incomingChallenge) return
    const res = await fetch('/api/challenges', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId: incomingChallenge.id, action }),
    })
    const json = await res.json()
    setIncomingChallenge(null)
    if (action === 'accept' && json.matchId) {
      router.push(`/match/${json.matchId}`)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {incomingChallenge && (
        <ChallengeNotification
          challengerName={incomingChallenge.challenger_name}
          expiresAt={incomingChallenge.expires_at}
          onAccept={() => respondToChallenge('accept')}
          onDecline={() => respondToChallenge('decline')}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-klm-dark">Ladder</h1>
        <span className="text-sm text-gray-500">{players.length} players</span>
      </div>

      <div className="space-y-2">
        {players.map((player, i) => (
          <div key={player.id} className="flex items-center gap-2">
            <div className="flex-1">
              <LadderCard
                player={player}
                rank={i + 1}
                isCurrentUser={player.id === currentUser?.id}
              />
            </div>
            {currentUser && player.id !== currentUser.id && (
              <ChallengeButton
                currentUser={currentUser}
                target={player}
                totalPlayers={players.length}
                onChallenge={sendChallenge}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: lobby with live ladder, challenge system, and notifications"
```

---

## Task 11: Match Room

**Files:**
- Create: `src/app/match/[id]/page.tsx`
- Create: `src/components/match/QuestionCard.tsx`
- Create: `src/components/match/Timer.tsx`
- Create: `src/components/match/ScoreBoard.tsx`
- Create: `src/app/api/matches/[id]/route.ts`
- Create: `src/app/api/matches/[id]/answer/route.ts`

- [ ] **Step 1: Create `src/components/match/Timer.tsx`**

```typescript
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
  }, [startedAt, durationMs])

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
```

- [ ] **Step 2: Create `src/components/match/QuestionCard.tsx`**

```typescript
'use client'

import Image from 'next/image'
import { Card } from '@/components/ui/Card'
import type { Question } from '@/types'

interface Props {
  question: Question
  selectedAnswer: string | null
  onAnswer: (answer: string) => void
  disabled: boolean
}

export function QuestionCard({ question, selectedAnswer, onAnswer, disabled }: Props) {
  return (
    <Card className="space-y-4">
      {question.media_url && (
        <div className="relative w-full h-48 rounded-lg overflow-hidden">
          <Image src={question.media_url} alt="Question media" fill className="object-cover" />
        </div>
      )}
      <p className="text-lg font-semibold text-klm-dark">{question.question_en}</p>
      <div className="grid grid-cols-1 gap-2">
        {question.options.map((option, i) => (
          <button
            key={i}
            disabled={disabled}
            onClick={() => onAnswer(option)}
            className={`text-left px-4 py-3 rounded-lg border-2 font-medium text-sm transition-all
              ${selectedAnswer === option
                ? 'border-klm-blue bg-klm-blue text-white'
                : 'border-gray-200 hover:border-klm-blue hover:bg-klm-light'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {option}
          </button>
        ))}
      </div>
    </Card>
  )
}
```

- [ ] **Step 3: Create `src/components/match/ScoreBoard.tsx`**

```typescript
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

interface PlayerResult {
  name: string
  score: number
  isWinner: boolean
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
```

- [ ] **Step 4: Create `src/app/api/matches/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { selectQuestions, getPlayerTier } from '@/lib/quiz/question-selector'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: match } = await supabase
    .from('matches')
    .select('*, player1:player1_id(id,username,ladder_position), player2:player2_id(id,username,ladder_position)')
    .eq('id', params.id)
    .single()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  if (match.player1_id !== user.id && match.player2_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Select questions based on highest-ranked player's tier
  const p1Pos = match.player1.ladder_position
  const p2Pos = match.player2.ladder_position
  const highestPos = Math.min(p1Pos, p2Pos) // lower number = higher rank

  const { data: allQuestions } = await supabase
    .from('questions')
    .select('*')
    .eq('flagged', false)
    .eq('approved', true)

  const { data: totalUsersResult } = await supabase.from('users').select('id', { count: 'exact', head: true })
  const totalPlayers = totalUsersResult?.length ?? 50

  const tier = getPlayerTier(highestPos, totalPlayers)
  const questions = selectQuestions(allQuestions ?? [], tier, 10)

  return NextResponse.json({ match, questions, tier })
}
```

- [ ] **Step 5: Create `src/app/api/matches/[id]/answer/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculatePoints } from '@/lib/quiz/scoring'
import { updatePScore, updateRit, shouldFlag } from '@/lib/quiz/psychometrics'
import { swapPositions, challengerLoses } from '@/lib/ladder/positions'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { questionId, answer, timeMs, avgOpponentPoints } = await request.json()

  const { data: question } = await supabase.from('questions').select('*').eq('id', questionId).single()
  if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

  const isCorrect = answer === question.correct_answer
  const points = calculatePoints(isCorrect, timeMs, 20000)

  // Store answer
  await supabase.from('match_answers').insert({
    match_id: params.id,
    player_id: user.id,
    question_id: questionId,
    answer,
    time_ms: timeMs,
    is_correct: isCorrect,
    points_awarded: points,
  })

  // Update psychometrics
  const newTimesAsked = question.times_asked + 1
  const newPScore = updatePScore(question.p_score, question.times_asked, isCorrect)
  const newRit = updateRit(question.rit_value, newTimesAsked, isCorrect, points, avgOpponentPoints ?? 600)
  const newFlagged = shouldFlag(newRit, newTimesAsked)

  await supabase.from('questions').update({
    p_score: newPScore,
    rit_value: newRit,
    times_asked: newTimesAsked,
    flagged: newFlagged,
    approved: newFlagged ? false : question.approved,
  }).eq('id', questionId)

  return NextResponse.json({ isCorrect, points })
}
```

- [ ] **Step 6: Create API route for ending a match `src/app/api/matches/[id]/end/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { swapPositions, challengerLoses } from '@/lib/ladder/positions'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only call this once — check if already ended
  const { data: match } = await supabase.from('matches').select('*').eq('id', params.id).single()
  if (!match || match.ended_at) return NextResponse.json({ error: 'Match already ended' }, { status: 409 })

  // Tally scores
  const { data: answers } = await supabase
    .from('match_answers')
    .select('player_id, points_awarded')
    .eq('match_id', params.id)

  const scores: Record<string, number> = {}
  for (const a of answers ?? []) {
    scores[a.player_id] = (scores[a.player_id] ?? 0) + a.points_awarded
  }

  const p1Score = scores[match.player1_id] ?? 0
  const p2Score = scores[match.player2_id] ?? 0
  const winnerId = p1Score >= p2Score ? match.player1_id : match.player2_id
  const loserId = winnerId === match.player1_id ? match.player2_id : match.player1_id

  // Load positions
  const { data: players } = await supabase
    .from('users').select('id, ladder_position')
    .in('id', [match.player1_id, match.player2_id])

  const challenger = players?.find(p => p.id === match.player1_id)
  const challenged = players?.find(p => p.id === match.player2_id)

  if (!challenger || !challenged) return NextResponse.json({ error: 'Players not found' }, { status: 500 })

  let newPositions: { challengerPos: number; challengedPos: number }
  if (winnerId === challenger.id) {
    newPositions = swapPositions(challenger.ladder_position, challenged.ladder_position)
  } else {
    newPositions = challengerLoses(challenger.ladder_position, challenged.ladder_position)
  }

  // Update DB
  await supabase.from('matches').update({ winner_id: winnerId, ended_at: new Date().toISOString() }).eq('id', params.id)
  await supabase.from('users').update({ ladder_position: newPositions.challengerPos, status: 'idle', last_active_at: new Date().toISOString() }).eq('id', challenger.id)
  await supabase.from('users').update({ ladder_position: newPositions.challengedPos, status: 'idle', last_active_at: new Date().toISOString() }).eq('id', challenged.id)

  const currentUserIsChallenger = user.id === challenger.id
  const oldPos = currentUserIsChallenger ? challenger.ladder_position : challenged.ladder_position
  const newPos = currentUserIsChallenger ? newPositions.challengerPos : newPositions.challengedPos

  return NextResponse.json({ winnerId, scores, positionChange: newPos - oldPos })
}
```

- [ ] **Step 7: Create `src/app/match/[id]/page.tsx`**

```typescript
'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { QuestionCard } from '@/components/match/QuestionCard'
import { Timer } from '@/components/match/Timer'
import { ScoreBoard } from '@/components/match/ScoreBoard'
import type { Question } from '@/types'

const QUESTION_TIME_MS = 20000

export default function MatchPage({ params }: { params: { id: string } }) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [myScore, setMyScore] = useState(0)
  const [opponentScore, setOpponentScore] = useState(0)
  const [questionStartedAt, setQuestionStartedAt] = useState(Date.now())
  const [phase, setPhase] = useState<'loading' | 'playing' | 'finished'>('loading')
  const [matchResult, setMatchResult] = useState<any>(null)
  const [myUsername, setMyUsername] = useState('')
  const [opponentUsername, setOpponentUsername] = useState('')
  const answered = useRef(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const res = await fetch(`/api/matches/${params.id}`)
      const { match, questions: qs } = await res.json()
      setQuestions(qs)

      const me = match.player1.id === user.id ? match.player1 : match.player2
      const opp = match.player1.id === user.id ? match.player2 : match.player1
      setMyUsername(me.username)
      setOpponentUsername(opp.username)

      // Subscribe to opponent score updates
      supabase.channel(`match-${params.id}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'match_answers',
          filter: `match_id=eq.${params.id}`,
        }, (payload) => {
          if (payload.new.player_id !== user.id) {
            setOpponentScore(s => s + payload.new.points_awarded)
          }
        })
        .subscribe()

      setQuestionStartedAt(Date.now())
      setPhase('playing')
    }
    init()
    return () => { supabase.removeAllChannels() }
  }, [])

  const submitAnswer = useCallback(async (answer: string | null) => {
    if (answered.current) return
    answered.current = true
    const timeMs = Date.now() - questionStartedAt
    const question = questions[currentIndex]

    const res = await fetch(`/api/matches/${params.id}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: question.id, answer: answer ?? '', timeMs, avgOpponentPoints: opponentScore / Math.max(1, currentIndex) }),
    })
    const { points } = await res.json()
    setMyScore(s => s + (points ?? 0))
  }, [currentIndex, questions, questionStartedAt, opponentScore])

  const advanceQuestion = useCallback(async () => {
    await submitAnswer(selectedAnswer)
    setSelectedAnswer(null)
    answered.current = false

    if (currentIndex + 1 >= questions.length) {
      // End match
      const res = await fetch(`/api/matches/${params.id}/end`, { method: 'POST' })
      const result = await res.json()
      setMatchResult(result)
      setPhase('finished')
    } else {
      setCurrentIndex(i => i + 1)
      setQuestionStartedAt(Date.now())
    }
  }, [currentIndex, questions.length, selectedAnswer, submitAnswer])

  if (phase === 'loading') {
    return <div className="flex items-center justify-center min-h-[80vh]"><p className="text-klm-blue animate-pulse">Loading match…</p></div>
  }

  if (phase === 'finished' && matchResult) {
    return (
      <div className="max-w-md mx-auto mt-10 px-4">
        <ScoreBoard
          results={[
            { name: myUsername, score: myScore, isWinner: matchResult.winnerId !== undefined && myScore >= opponentScore, isCurrentUser: true },
            { name: opponentUsername, score: opponentScore, isWinner: myScore < opponentScore, isCurrentUser: false },
          ]}
          positionChange={matchResult.positionChange ?? 0}
        />
      </div>
    )
  }

  const question = questions[currentIndex]
  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
      <div className="flex justify-between text-sm font-semibold text-klm-dark">
        <span>Question {currentIndex + 1} / {questions.length}</span>
        <span>{myUsername}: <span className="text-klm-blue">{myScore}</span> pts</span>
        <span>{opponentUsername}: <span className="text-gray-500">{opponentScore}</span> pts</span>
      </div>
      <Timer durationMs={QUESTION_TIME_MS} startedAt={questionStartedAt} onExpire={advanceQuestion} />
      <QuestionCard
        question={question}
        selectedAnswer={selectedAnswer}
        onAnswer={(a) => { setSelectedAnswer(a) }}
        disabled={answered.current}
      />
      <button
        onClick={advanceQuestion}
        disabled={!selectedAnswer}
        className="w-full py-3 rounded-xl bg-klm-dark text-white font-semibold disabled:opacity-40 hover:bg-klm-blue transition-colors"
      >
        {currentIndex + 1 === questions.length ? 'Finish' : 'Next →'}
      </button>
    </div>
  )
}
```

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: match room with real-time scoring and psychometrics updates"
```

---

## Task 12: Admin Panel

**Files:**
- Create: `src/app/admin/questions/page.tsx`
- Create: `src/app/admin/questions/import/page.tsx`
- Create: `src/app/admin/session/page.tsx`
- Create: `src/app/api/admin/questions/route.ts`
- Create: `src/app/api/admin/questions/import/route.ts`
- Create: `src/app/api/admin/questions/[id]/route.ts`
- Create: `src/app/api/admin/session/route.ts`

- [ ] **Step 1: Create admin guard — add to middleware**

Update `src/middleware.ts` to redirect non-admins from `/admin` routes:

After the existing redirect logic, add:
```typescript
if (pathname.startsWith('/admin')) {
  const { data: profile } = await supabase.from('users').select('is_admin').eq('id', user!.id).single()
  if (!profile?.is_admin) return NextResponse.redirect(new URL('/lobby', request.url))
}
```

- [ ] **Step 2: Create `src/app/api/admin/questions/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { estimatePScore } from '@/lib/ai/p-score-estimator'

async function assertAdmin(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase.from('users').select('is_admin').eq('id', userId).single()
  return data?.is_admin === true
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !await assertAdmin(supabase, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data } = await supabase.from('questions').select('*').order('created_at', { ascending: false })
  return NextResponse.json({ questions: data })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !await assertAdmin(supabase, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const pScore = await estimatePScore(body.question_en, body.options, body.correct_answer, body.topic)

  const { data, error } = await supabase.from('questions').insert({
    ...body,
    p_score: pScore,
    ai_p_score_initial: pScore,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ question: data })
}
```

- [ ] **Step 3: Create `src/app/api/admin/questions/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('users').select('is_admin').eq('id', user?.id ?? '').single()
  if (!user || !profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { error } = await supabase.from('questions').update(body).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('users').select('is_admin').eq('id', user?.id ?? '').single()
  if (!user || !profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('questions').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 4: Create `src/app/api/admin/questions/import/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { estimatePScore } from '@/lib/ai/p-score-estimator'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('users').select('is_admin').eq('id', user?.id ?? '').single()
  if (!user || !profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { questions } = await request.json()
  // questions: array of { topic, type, question_en, options, correct_answer, media_url? }

  const enriched = await Promise.all(
    questions.map(async (q: any) => {
      const pScore = await estimatePScore(q.question_en, q.options, q.correct_answer, q.topic)
      return { ...q, p_score: pScore, ai_p_score_initial: pScore }
    })
  )

  const { error } = await supabase.from('questions').insert(enriched)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ imported: enriched.length })
}
```

- [ ] **Step 5: Create `src/app/api/admin/session/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// We use a simple DB table or env-style flag via a settings table
// For simplicity: use a "session_active" row in a settings table
export async function GET() {
  const supabase = createClient()
  const { data } = await supabase.from('app_settings').select('value').eq('key', 'session_active').single()
  return NextResponse.json({ active: data?.value === 'true' })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('users').select('is_admin').eq('id', user?.id ?? '').single()
  if (!user || !profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { active } = await request.json()
  await supabase.from('app_settings').upsert({ key: 'session_active', value: String(active) })
  return NextResponse.json({ success: true })
}
```

Add to migration `001_initial_schema.sql` (or new migration):
```sql
create table public.app_settings (
  key text primary key,
  value text not null
);
insert into public.app_settings (key, value) values ('session_active', 'false');
```

- [ ] **Step 6: Create `src/app/admin/questions/page.tsx`**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { Question } from '@/types'
import Link from 'next/link'

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [filter, setFilter] = useState<'all' | 'flagged'>('all')

  async function load() {
    const res = await fetch('/api/admin/questions')
    const { questions: qs } = await res.json()
    setQuestions(qs ?? [])
  }

  useEffect(() => { load() }, [])

  async function approve(id: string) {
    await fetch(`/api/admin/questions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flagged: false, approved: true }),
    })
    load()
  }

  async function remove(id: string) {
    if (!confirm('Delete this question?')) return
    await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' })
    load()
  }

  const shown = filter === 'flagged' ? questions.filter(q => q.flagged) : questions

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-klm-dark">Questions</h1>
        <div className="flex gap-2">
          <Link href="/admin/questions/import"><Button variant="secondary">Import</Button></Link>
          <Link href="/admin/questions/new"><Button>+ New</Button></Link>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded-full text-sm font-medium ${filter === 'all' ? 'bg-klm-blue text-white' : 'bg-gray-100 text-gray-600'}`}>All ({questions.length})</button>
        <button onClick={() => setFilter('flagged')} className={`px-3 py-1 rounded-full text-sm font-medium ${filter === 'flagged' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'}`}>Flagged ({questions.filter(q => q.flagged).length})</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 pr-4 font-medium">Question</th>
              <th className="pb-2 pr-4 font-medium">Topic</th>
              <th className="pb-2 pr-4 font-medium">P-score</th>
              <th className="pb-2 pr-4 font-medium">Rit</th>
              <th className="pb-2 pr-4 font-medium">Asked</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(q => (
              <tr key={q.id} className={`border-b ${q.flagged ? 'bg-red-50' : ''}`}>
                <td className="py-2 pr-4 max-w-xs truncate">{q.question_en}</td>
                <td className="py-2 pr-4 text-xs text-gray-500">{q.topic.replace(/_/g, ' ')}</td>
                <td className="py-2 pr-4">{q.p_score.toFixed(2)}</td>
                <td className="py-2 pr-4">{q.rit_value?.toFixed(2) ?? '—'}</td>
                <td className="py-2 pr-4">{q.times_asked}</td>
                <td className="py-2 flex gap-1">
                  {q.flagged && <Button variant="secondary" className="text-xs" onClick={() => approve(q.id)}>Approve</Button>}
                  <Button variant="danger" className="text-xs" onClick={() => remove(q.id)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Create `src/app/admin/session/page.tsx`**

```typescript
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
```

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: admin panel — question management, import, session control"
```

---

## Task 13: Inactivity Cron (Supabase Scheduled Function)

**Files:**
- Create: `supabase/functions/inactivity-cron/index.ts`

- [ ] **Step 1: Create function**

```typescript
// supabase/functions/inactivity-cron/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Check session is active
  const { data: setting } = await supabase
    .from('app_settings').select('value').eq('key', 'session_active').single()
  if (setting?.value !== 'true') return new Response('Session inactive', { status: 200 })

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()

  // Find inactive players not in a match
  const { data: inactive } = await supabase
    .from('users')
    .select('id, ladder_position')
    .eq('status', 'idle')
    .eq('is_admin', false)
    .lt('last_active_at', tenMinutesAgo)

  for (const player of inactive ?? []) {
    const newPos = player.ladder_position + 1
    await supabase.from('users').update({ ladder_position: newPos }).eq('id', player.id)
  }

  // Expire pending challenges
  await supabase.from('challenges')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString())

  return new Response(JSON.stringify({ processed: inactive?.length ?? 0 }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

- [ ] **Step 2: Deploy function**

```bash
supabase functions deploy inactivity-cron
```

- [ ] **Step 3: Schedule via Supabase dashboard**

In Supabase dashboard → Edge Functions → inactivity-cron → Schedule: `* * * * *` (every minute).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: inactivity cron edge function"
```

---

## Task 14: Import Page & Question Form

**Files:**
- Create: `src/app/admin/questions/import/page.tsx`
- Create: `src/app/admin/questions/new/page.tsx`

- [ ] **Step 1: Create `src/app/admin/questions/import/page.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useRouter } from 'next/navigation'

export default function ImportPage() {
  const [text, setText] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleImport() {
    setLoading(true)
    try {
      const questions = JSON.parse(text)
      const res = await fetch('/api/admin/questions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions }),
      })
      const json = await res.json()
      if (json.error) { setResult(`Error: ${json.error}`); return }
      setResult(`Successfully imported ${json.imported} questions.`)
    } catch {
      setResult('Invalid JSON. Check the format below.')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Card className="space-y-4">
        <h1 className="text-xl font-bold text-klm-dark">Import Questions</h1>
        <div className="bg-klm-light rounded-lg p-3 text-xs font-mono text-gray-700">
{`[
  {
    "topic": "klm_marketing",
    "type": "multiple_choice",
    "question_en": "What is KLM's primary hub airport?",
    "options": ["Schiphol", "Heathrow", "CDG", "Frankfurt"],
    "correct_answer": "Schiphol",
    "media_url": null
  }
]`}
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste JSON array of questions here…"
          className="w-full h-64 border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-klm-blue"
        />
        {result && <p className={`text-sm ${result.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{result}</p>}
        <div className="flex gap-3">
          <Button onClick={handleImport} disabled={loading || !text.trim()}>
            {loading ? 'Importing…' : 'Import'}
          </Button>
          <Button variant="secondary" onClick={() => router.push('/admin/questions')}>Cancel</Button>
        </div>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/app/admin/questions/new/page.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useRouter } from 'next/navigation'
import type { Topic, QuestionType } from '@/types'

const TOPICS: { value: Topic; label: string }[] = [
  { value: 'klm_marketing', label: 'KLM Marketing Organisation' },
  { value: 'klm_brand_management', label: 'KLM Brand Management' },
  { value: 'klm_brand_guide', label: 'KLM Brand Guide' },
  { value: 'klm_tagless_luggage', label: 'KLM Tagless Luggage' },
  { value: 'virtual_humans', label: 'Virtual Humans' },
  { value: 'vibecoding', label: 'Vibecoding' },
]

export default function NewQuestionPage() {
  const [topic, setTopic] = useState<Topic>('klm_marketing')
  const [type, setType] = useState<QuestionType>('multiple_choice')
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', '', '', ''])
  const [correct, setCorrect] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const displayOptions = type === 'true_false' ? ['True', 'False'] : options

  async function handleSave() {
    setSaving(true)
    setError(null)
    const res = await fetch('/api/admin/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic, type, question_en: question,
        options: displayOptions.filter(Boolean),
        correct_answer: correct,
      }),
    })
    const json = await res.json()
    setSaving(false)
    if (json.error) { setError(json.error); return }
    router.push('/admin/questions')
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <Card className="space-y-4">
        <h1 className="text-xl font-bold text-klm-dark">New Question</h1>
        <div>
          <label className="block text-sm font-medium mb-1">Topic</label>
          <select value={topic} onChange={e => setTopic(e.target.value as Topic)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-klm-blue">
            {TOPICS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select value={type} onChange={e => setType(e.target.value as QuestionType)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-klm-blue">
            <option value="multiple_choice">Multiple Choice</option>
            <option value="true_false">True / False</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Question (English)</label>
          <textarea value={question} onChange={e => setQuestion(e.target.value)} rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-klm-blue" />
        </div>
        {type === 'multiple_choice' && (
          <div className="space-y-2">
            <label className="block text-sm font-medium">Options</label>
            {options.map((o, i) => (
              <input key={i} value={o} onChange={e => { const n = [...options]; n[i] = e.target.value; setOptions(n) }}
                placeholder={`Option ${i + 1}`}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-klm-blue" />
            ))}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-1">Correct Answer</label>
          <select value={correct} onChange={e => setCorrect(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-klm-blue">
            <option value="">Select correct answer…</option>
            {displayOptions.filter(Boolean).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <p className="text-xs text-gray-500">AI will estimate the initial P-score automatically on save.</p>
        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={saving || !question || !correct}>
            {saving ? 'Saving…' : 'Save Question'}
          </Button>
          <Button variant="secondary" onClick={() => router.push('/admin/questions')}>Cancel</Button>
        </div>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: question creation and bulk import pages"
```

---

## Task 15: Assign Initial Ladder Positions

When the session starts, players need unique ladder positions. Currently, all register with `ladder_position = 0`.

**Files:**
- Create: `src/app/api/admin/session/route.ts` (update)

- [ ] **Step 1: Update session start to assign positions**

Update the `POST` handler in `src/app/api/admin/session/route.ts`:

```typescript
if (active) {
  // Assign random initial positions to all players with position 0
  const { data: players } = await supabase
    .from('users')
    .select('id')
    .eq('is_admin', false)
    .eq('ladder_position', 0)

  if (players && players.length > 0) {
    const shuffled = [...players].sort(() => Math.random() - 0.5)
    await Promise.all(shuffled.map((p, i) =>
      supabase.from('users').update({ ladder_position: i + 1 }).eq('id', p.id)
    ))
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: assign random ladder positions on session start"
```

---

## Task 16: Final Checks & Deploy

- [ ] **Step 1: Run all unit tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: no TypeScript or build errors.

- [ ] **Step 3: Deploy to Vercel**

```bash
npx vercel --prod
```

Set environment variables in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`

- [ ] **Step 4: Smoke test**

1. Register two student accounts
2. Admin starts session — verify both get positions
3. Student A challenges Student B — verify notification appears
4. Accept — verify match room loads with questions
5. Answer all questions — verify scoreboard and position change
6. Leave browser tab open for 11+ minutes — verify inactivity drop
7. Admin flags check: answer a question wrong 5 times with same account — verify flag in admin panel

- [ ] **Step 5: Final commit**

```bash
git add -A && git commit -m "chore: production ready"
```

---

## Self-Review Against Spec

| Spec Requirement | Task |
|---|---|
| Next.js + Supabase stack | Task 1, 4 |
| KLM house style (#00A1DE, #003145) | Task 5 |
| Student photo upload + nationality | Task 6, 9 |
| Username/password auth | Task 6 |
| Ladder with max 3-position challenge | Task 10, 7 |
| Challenge notification (full-screen + browser push) | Task 10 |
| Busy status / cannot challenge in-match player | Task 10 |
| 5-minute challenge expiry | Task 10, 13 |
| Real-time match (speed counts) | Task 11 |
| 10 questions per match | Task 11 |
| P-score dynamic update | Task 7, 11 |
| Rit incremental update | Task 7, 11 |
| Negative Rit + n≥5 → flag | Task 7, 11 |
| Admin approves flagged questions | Task 12 |
| Adaptive difficulty by ladder tier | Task 7, 11 |
| AI initial P-score estimation | Task 8 |
| Admin question CRUD | Task 12, 14 |
| CSV/JSON import with AI scoring | Task 12, 14 |
| Session control (start/stop) | Task 12, 15 |
| Inactivity penalty (10 min) | Task 13 |
| All questions in English | Enforced by field name `question_en` |
| Topics: KLM (4 subtopics), VH, Vibecoding | Task 2, 3 |
