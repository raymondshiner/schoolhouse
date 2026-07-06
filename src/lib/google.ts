// Thin Google Calendar v3 REST client. All Schoolhouse events are all-day
// (date-only), so start/end use { date } — no timezone handling needed.
import { addDays, fromISO, toISODate } from '@/lib/dates'
import type { SchoolEvent } from '@/lib/database.types'

const BASE = 'https://www.googleapis.com/calendar/v3'

export type GCalEvent = {
  id: string
  summary?: string
  status?: string
  start?: { date?: string; dateTime?: string }
  end?: { date?: string; dateTime?: string }
}

/** A read-only Google event mapped onto a single grid day. */
export type GhostEvent = { id: string; date: string; title: string }

export class GoogleAuthError extends Error {
  constructor() {
    super('Google access token rejected')
  }
}

async function gcal<T>(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
  if (res.status === 401) throw new GoogleAuthError()
  if (!res.ok) throw new Error(`Google Calendar ${res.status}: ${await res.text()}`)
  return res.json()
}

export async function createCalendar(
  token: string,
  summary: string,
): Promise<string> {
  const cal = await gcal<{ id: string }>(token, '/calendars', {
    method: 'POST',
    body: JSON.stringify({ summary }),
  })
  return cal.id
}

function allDayBody(e: Pick<SchoolEvent, 'date' | 'title' | 'notes'>) {
  return {
    summary: e.title,
    description: e.notes ?? '',
    start: { date: e.date },
    end: { date: toISODate(addDays(fromISO(e.date), 1)) },
  }
}

export async function insertEvent(
  token: string,
  calendarId: string,
  e: Pick<SchoolEvent, 'date' | 'title' | 'notes'>,
): Promise<string> {
  const created = await gcal<{ id: string }>(
    token,
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    { method: 'POST', body: JSON.stringify(allDayBody(e)) },
  )
  return created.id
}

export async function patchEvent(
  token: string,
  calendarId: string,
  eventId: string,
  e: Pick<SchoolEvent, 'date' | 'title' | 'notes'>,
): Promise<void> {
  await gcal(
    token,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: 'PATCH', body: JSON.stringify(allDayBody(e)) },
  )
}

export async function deleteEvent(
  token: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  const res = await fetch(
    `${BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
  )
  if (res.status === 401) throw new GoogleAuthError()
  // 404/410 = already gone in Google — that's the outcome we wanted.
  if (!res.ok && res.status !== 404 && res.status !== 410)
    throw new Error(`Google Calendar ${res.status}: ${await res.text()}`)
}

export async function listEvents(
  token: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
): Promise<GCalEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    maxResults: '250',
  })
  const data = await gcal<{ items?: GCalEvent[] }>(
    token,
    `/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
  )
  return data.items ?? []
}

/** Flatten Google events into one entry per grid day (all-day ends are exclusive). */
export function expandToDays(items: GCalEvent[]): GhostEvent[] {
  const out: GhostEvent[] = []
  for (const ev of items) {
    if (ev.status === 'cancelled') continue
    const title = ev.summary || '(untitled)'
    if (ev.start?.date) {
      const stop = fromISO(
        ev.end?.date ?? toISODate(addDays(fromISO(ev.start.date), 1)),
      )
      let d = fromISO(ev.start.date)
      let guard = 0
      while (d < stop && guard++ < 62) {
        out.push({ id: `${ev.id}:${toISODate(d)}`, date: toISODate(d), title })
        d = addDays(d, 1)
      }
    } else if (ev.start?.dateTime) {
      out.push({
        id: ev.id,
        date: toISODate(new Date(ev.start.dateTime)),
        title,
      })
    }
  }
  return out
}
