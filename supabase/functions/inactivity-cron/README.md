# Inactivity Cron

Supabase Edge Function that runs every minute to:
1. Drop idle players (no activity in 10+ minutes) by 1 ladder position
2. Expire pending challenges past their expiry time

## Deploy
supabase functions deploy inactivity-cron

## Schedule
In Supabase dashboard → Edge Functions → inactivity-cron → Schedule: `* * * * *`

## Environment variables required
- SUPABASE_URL (auto-provided)
- SUPABASE_SERVICE_ROLE_KEY (auto-provided)
