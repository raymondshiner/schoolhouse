// Exchanges the caller's stored Google refresh token for a short-lived access
// token. The refresh token never leaves the server; the client only ever sees
// access tokens (~1h) it can use against the Google Calendar API directly.
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  const { data: userData, error: userErr } = await supa.auth.getUser(jwt)
  if (userErr || !userData.user) return json({ error: 'unauthorized' }, 401)

  const { data: row } = await supa
    .from('google_sync')
    .select('refresh_token')
    .eq('parent_id', userData.user.id)
    .maybeSingle()
  if (!row) return json({ error: 'not_connected' }, 404)

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!,
      refresh_token: row.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  const tok = await res.json()
  if (!res.ok) return json({ error: tok.error ?? 'token_exchange_failed' }, 502)

  return json({ access_token: tok.access_token, expires_in: tok.expires_in })
})
