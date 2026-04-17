import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Only run when session is active
  const { data: setting } = await supabase
    .from('app_settings').select('value').eq('key', 'session_active').single()
  if (setting?.value !== 'true') return new Response('Session inactive', { status: 200 })

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()

  // Drop inactive idle players by 1 position
  const { data: inactive } = await supabase
    .from('users')
    .select('id, ladder_position')
    .eq('status', 'idle')
    .eq('is_admin', false)
    .lt('last_active_at', tenMinutesAgo)

  for (const player of inactive ?? []) {
    await supabase
      .from('users')
      .update({ ladder_position: player.ladder_position + 1 })
      .eq('id', player.id)
  }

  // Expire pending challenges past their expiry time
  await supabase
    .from('challenges')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString())

  return new Response(
    JSON.stringify({ processed: inactive?.length ?? 0 }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
