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

  // Admin guard
  if (pathname.startsWith('/admin')) {
    const { data: profile } = await supabase.from('users').select('is_admin').eq('id', user!.id).single()
    if (!profile?.is_admin) return NextResponse.redirect(new URL('/lobby', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
