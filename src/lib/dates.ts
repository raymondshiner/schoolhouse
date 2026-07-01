import {
  format,
  parseISO,
  differenceInYears,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  addDays,
} from 'date-fns'

/** Local YYYY-MM-DD for a Date (no timezone shift). */
export function toISODate(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export const todayISO = () => toISODate(new Date())

export function fromISO(s: string): Date {
  return parseISO(s)
}

export function ageFromBirthdate(birthdate: string | null): number | null {
  if (!birthdate) return null
  return differenceInYears(new Date(), parseISO(birthdate))
}

export function formatDate(iso: string, fmt = 'MMM d, yyyy'): string {
  return format(parseISO(iso), fmt)
}

export function formatLong(d: Date, fmt = 'EEEE, MMMM d'): string {
  return format(d, fmt)
}

/** Days shown in a month grid, padded to full weeks (Sunday start). */
export function monthGridDays(month: Date): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  })
}

export function monthDays(month: Date): Date[] {
  return eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month),
  })
}

export { format, addMonths, addDays, startOfMonth }
