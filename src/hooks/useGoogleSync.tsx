import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/AuthProvider'
import {
  createCalendar,
  deleteEvent,
  expandToDays,
  insertEvent,
  listEvents,
  patchEvent,
  type GhostEvent,
} from '@/lib/google'
import { addDays, monthGridDays, toISODate } from '@/lib/dates'
import type { SchoolEvent } from '@/lib/database.types'

const PENDING_KEY = 'schoolhouse-gcal-pending'
const SCOPES = 'https://www.googleapis.com/auth/calendar'
const FAMILY_CAL = 'Schoolhouse'

type CalendarMap = { family: string; kids: Record<string, string> }

type GoogleSyncValue = {
  connected: boolean
  loading: boolean
  syncing: boolean
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  syncNow: () => Promise<number>
  getToken: () => Promise<string>
  pushEventSafe: (e: SchoolEvent) => Promise<void>
  removeEventSafe: (
    e: Pick<SchoolEvent, 'google_event_id' | 'google_calendar_id'>,
  ) => Promise<void>
}

const GoogleSyncContext = createContext<GoogleSyncValue | undefined>(undefined)

export function GoogleSyncProvider({ children }: { children: ReactNode }) {
  const { session, user } = useAuth()
  const qc = useQueryClient()
  const [syncing, setSyncing] = useState(false)
  const tokenRef = useRef<{ token: string; exp: number } | null>(null)
  const connectedRef = useRef(false)
  const completing = useRef(false)

  const status = useQuery({
    queryKey: ['google-sync'],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('google_sync')
        .select('parent_id, family_calendar_id, connected_at')
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
  connectedRef.current = !!status.data

  const getToken = useCallback(async (): Promise<string> => {
    const now = Date.now()
    if (tokenRef.current && tokenRef.current.exp > now + 60_000)
      return tokenRef.current.token
    const { data, error } = await supabase.functions.invoke('google-token')
    if (error || !data?.access_token)
      throw new Error('Could not refresh Google access token')
    tokenRef.current = {
      token: data.access_token,
      exp: now + data.expires_in * 1000,
    }
    return data.access_token
  }, [])

  const ensureCalendars = useCallback(
    async (token: string): Promise<CalendarMap> => {
      const { data: sync } = await supabase
        .from('google_sync')
        .select('family_calendar_id')
        .maybeSingle()
      let family = sync?.family_calendar_id ?? null
      if (!family) {
        family = await createCalendar(token, FAMILY_CAL)
        await supabase
          .from('google_sync')
          .update({ family_calendar_id: family })
          .eq('parent_id', user!.id)
      }
      const { data: kids } = await supabase
        .from('kids')
        .select('id, name, google_calendar_id')
      const map: Record<string, string> = {}
      for (const k of kids ?? []) {
        let id = k.google_calendar_id
        if (!id) {
          id = await createCalendar(token, `${FAMILY_CAL} — ${k.name}`)
          await supabase
            .from('kids')
            .update({ google_calendar_id: id })
            .eq('id', k.id)
        }
        map[k.id] = id
      }
      return { family, kids: map }
    },
    [user],
  )

  const pushEvent = useCallback(
    async (token: string, cals: CalendarMap, e: SchoolEvent) => {
      const calId = e.kid_id ? cals.kids[e.kid_id] : cals.family
      if (!calId) return
      let googleEventId = e.google_event_id
      if (googleEventId && e.google_calendar_id === calId) {
        await patchEvent(token, calId, googleEventId, e)
      } else {
        if (googleEventId && e.google_calendar_id)
          await deleteEvent(token, e.google_calendar_id, googleEventId).catch(
            () => {},
          )
        googleEventId = await insertEvent(token, calId, e)
      }
      await supabase
        .from('events')
        .update({ google_event_id: googleEventId, google_calendar_id: calId })
        .eq('id', e.id)
    },
    [],
  )

  const pushEventSafe = useCallback(
    async (e: SchoolEvent) => {
      if (!connectedRef.current) return
      try {
        const token = await getToken()
        const cals = await ensureCalendars(token)
        await pushEvent(token, cals, e)
      } catch (err) {
        console.warn('Google Calendar push failed', err)
      }
    },
    [getToken, ensureCalendars, pushEvent],
  )

  const removeEventSafe = useCallback(
    async (e: Pick<SchoolEvent, 'google_event_id' | 'google_calendar_id'>) => {
      if (!connectedRef.current || !e.google_event_id || !e.google_calendar_id)
        return
      try {
        const token = await getToken()
        await deleteEvent(token, e.google_calendar_id, e.google_event_id)
      } catch (err) {
        console.warn('Google Calendar delete failed', err)
      }
    },
    [getToken],
  )

  const syncNow = useCallback(async (): Promise<number> => {
    setSyncing(true)
    try {
      const token = await getToken()
      const cals = await ensureCalendars(token)
      const { data: pending, error } = await supabase
        .from('events')
        .select('*')
        .is('google_event_id', null)
      if (error) throw error
      for (const e of pending ?? []) await pushEvent(token, cals, e)
      qc.invalidateQueries({ queryKey: ['events'] })
      qc.invalidateQueries({ queryKey: ['gcal-month'] })
      return pending?.length ?? 0
    } finally {
      setSyncing(false)
    }
  }, [getToken, ensureCalendars, pushEvent, qc])

  const connect = useCallback(async () => {
    localStorage.setItem(PENDING_KEY, '1')
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/calendar`,
        scopes: SCOPES,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
  }, [])

  // Completes the connect flow after the OAuth redirect lands back here.
  useEffect(() => {
    if (
      !localStorage.getItem(PENDING_KEY) ||
      !session?.provider_refresh_token ||
      completing.current
    )
      return
    completing.current = true
    ;(async () => {
      try {
        const { error } = await supabase.from('google_sync').upsert({
          parent_id: session.user.id,
          refresh_token: session.provider_refresh_token,
        })
        if (error) throw error
        localStorage.removeItem(PENDING_KEY)
        connectedRef.current = true
        await qc.invalidateQueries({ queryKey: ['google-sync'] })
        const n = await syncNow()
        toast.success(
          n > 0
            ? `Google Calendar connected — ${n} event${n === 1 ? '' : 's'} synced`
            : 'Google Calendar connected',
        )
      } catch (err) {
        toast.error(`Google Calendar connect failed: ${(err as Error).message}`)
      } finally {
        completing.current = false
      }
    })()
  }, [session, qc, syncNow])

  const disconnect = useCallback(async () => {
    await supabase
      .from('events')
      .update({ google_event_id: null, google_calendar_id: null })
      .not('google_event_id', 'is', null)
    await supabase
      .from('kids')
      .update({ google_calendar_id: null })
      .not('google_calendar_id', 'is', null)
    await supabase.from('google_sync').delete().eq('parent_id', user!.id)
    tokenRef.current = null
    connectedRef.current = false
    qc.invalidateQueries({ queryKey: ['google-sync'] })
    qc.invalidateQueries({ queryKey: ['events'] })
  }, [user, qc])

  const value = useMemo<GoogleSyncValue>(
    () => ({
      connected: !!status.data,
      loading: status.isLoading,
      syncing,
      connect,
      disconnect,
      syncNow,
      getToken,
      pushEventSafe,
      removeEventSafe,
    }),
    [
      status.data,
      status.isLoading,
      syncing,
      connect,
      disconnect,
      syncNow,
      getToken,
      pushEventSafe,
      removeEventSafe,
    ],
  )

  return (
    <GoogleSyncContext.Provider value={value}>
      {children}
    </GoogleSyncContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGoogleSync() {
  const ctx = useContext(GoogleSyncContext)
  if (!ctx) throw new Error('useGoogleSync must be used within GoogleSyncProvider')
  return ctx
}

/** Read-only Google Calendar (primary) events for the visible month grid. */
// eslint-disable-next-line react-refresh/only-export-components
export function useGoogleMonthEvents(month: Date) {
  const { connected, getToken } = useGoogleSync()
  const days = monthGridDays(month)
  const startISO = toISODate(days[0])
  return useQuery<GhostEvent[]>({
    queryKey: ['gcal-month', startISO],
    enabled: connected,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const token = await getToken()
      const items = await listEvents(
        token,
        'primary',
        days[0].toISOString(),
        addDays(days[days.length - 1], 1).toISOString(),
      )
      return expandToDays(items)
    },
  })
}
