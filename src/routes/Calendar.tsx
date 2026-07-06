import { useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  MapPin,
  BookOpen,
  CalendarDays,
} from 'lucide-react'
import { format, isSameMonth, isToday, setMonth, startOfYear } from 'date-fns'
import { toast } from 'sonner'
import {
  useEvents,
  useCreateEvent,
  useDeleteEvent,
} from '@/hooks/useEvents'
import { useKids } from '@/hooks/useKids'
import {
  addMonths,
  monthGridDays,
  monthDays,
  toISODate,
} from '@/lib/dates'
import type { EventType, SchoolEvent } from '@/lib/database.types'
import { PageHeader } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const NONE = '__none__'
const TYPE_META: Record<EventType, { label: string; dot: string; icon: typeof MapPin }> = {
  schoolwork: { label: 'Schoolwork', dot: 'bg-purple-500', icon: BookOpen },
  event: { label: 'Event', dot: 'bg-cyan-500', icon: CalendarDays },
  field_trip: { label: 'Field trip', dot: 'bg-amber-500', icon: MapPin },
}

function DayDialog({
  day,
  events,
  onClose,
}: {
  day: Date | null
  events: SchoolEvent[]
  onClose: () => void
}) {
  const { data: kids = [] } = useKids()
  const create = useCreateEvent()
  const del = useDeleteEvent()
  const [title, setTitle] = useState('')
  const [type, setType] = useState<EventType>('schoolwork')
  const [kidId, setKidId] = useState<string>(NONE)
  const [notes, setNotes] = useState('')

  if (!day) return null
  const iso = toISODate(day)
  const dayEvents = events.filter((e) => e.date === iso)

  const submit = async () => {
    if (!title.trim()) return toast.error('Give the event a title')
    try {
      await create.mutateAsync({
        date: iso,
        title: title.trim(),
        type,
        kid_id: kidId === NONE ? null : kidId,
        notes: notes.trim() || null,
      })
      setTitle('')
      setNotes('')
      toast.success('Event added')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <Dialog open={!!day} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{format(day, 'EEEE, MMMM d')}</DialogTitle>
        </DialogHeader>

        {dayEvents.length > 0 && (
          <div className="space-y-2">
            {dayEvents.map((e) => {
              const meta = TYPE_META[e.type]
              const kid = kids.find((k) => k.id === e.kid_id)
              return (
                <div
                  key={e.id}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full', meta.dot)} />
                    <div>
                      <p className="text-sm font-medium">{e.title}</p>
                      <p className="text-muted-foreground text-xs">
                        {meta.label}
                        {kid ? ` · ${kid.name}` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    aria-label="Delete event"
                    onClick={() => del.mutate(e.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <div className="space-y-3 border-t pt-3">
          <div className="space-y-2">
            <Label htmlFor="etitle">Add an event</Label>
            <Input
              id="etitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as EventType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_META) as EventType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_META[t].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kid</Label>
              <Select value={kidId} onValueChange={setKidId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Whole family</SelectItem>
                  {kids.map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
          />
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={create.isPending}>
            <Plus className="h-4 w-4" /> Add event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MonthView({
  month,
  setMonthDate,
  events,
  onDay,
}: {
  month: Date
  setMonthDate: (d: Date) => void
  events: SchoolEvent[]
  onDay: (d: Date) => void
}) {
  const days = monthGridDays(month)
  const byDate = useMemo(() => {
    const m = new Map<string, SchoolEvent[]>()
    for (const e of events) {
      const arr = m.get(e.date) ?? []
      arr.push(e)
      m.set(e.date, arr)
    }
    return m
  }, [events])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous month"
          onClick={() => setMonthDate(addMonths(month, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="font-medium">{format(month, 'MMMM yyyy')}</p>
          {!isSameMonth(month, new Date()) && (
            <Button
              variant="outline"
              size="sm"
              className="mt-1 h-7 text-xs"
              onClick={() => setMonthDate(new Date())}
            >
              Jump to today
            </Button>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label="Next month"
          onClick={() => setMonthDate(addMonths(month, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div
            key={i}
            className="text-muted-foreground py-1 text-center text-xs font-medium"
          >
            {d}
          </div>
        ))}
        {days.map((day) => {
          const iso = toISODate(day)
          const dayEvents = byDate.get(iso) ?? []
          const inMonth = isSameMonth(day, month)
          return (
            <button
              key={iso}
              onClick={() => onDay(day)}
              className={cn(
                'flex min-h-14 flex-col items-start rounded-md border p-1 text-left transition-colors sm:min-h-20',
                inMonth ? 'hover:bg-accent' : 'opacity-40',
                isToday(day) && 'border-primary',
              )}
            >
              <span
                className={cn(
                  'text-xs',
                  isToday(day) && 'text-primary font-semibold',
                )}
              >
                {format(day, 'd')}
              </span>
              <div className="mt-1 flex w-full flex-col gap-0.5">
                {dayEvents.slice(0, 2).map((e) => (
                  <span
                    key={e.id}
                    className={cn(
                      'flex items-center gap-1 truncate text-[10px] leading-tight',
                    )}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 shrink-0 rounded-full',
                        TYPE_META[e.type].dot,
                      )}
                    />
                    <span className="truncate">{e.title}</span>
                  </span>
                ))}
                {dayEvents.length > 2 && (
                  <span className="text-muted-foreground text-[10px]">
                    +{dayEvents.length - 2} more
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function YearView({
  year,
  setYear,
  events,
  onPickMonth,
}: {
  year: number
  setYear: (y: number) => void
  events: SchoolEvent[]
  onPickMonth: (d: Date) => void
}) {
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of events) m.set(e.date, (m.get(e.date) ?? 0) + 1)
    return m
  }, [events])

  const base = startOfYear(new Date(year, 0, 1))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous year"
          onClick={() => setYear(year - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="font-medium">{year}</p>
        <Button
          variant="outline"
          size="icon"
          aria-label="Next year"
          onClick={() => setYear(year + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => {
          const monthDate = setMonth(base, i)
          const days = monthDays(monthDate)
          return (
            <button
              key={i}
              onClick={() => onPickMonth(monthDate)}
              className="hover:bg-accent rounded-lg border p-2 text-left"
            >
              <p className="mb-1 text-xs font-medium">
                {format(monthDate, 'MMM')}
              </p>
              <div className="grid grid-cols-7 gap-0.5">
                {days.map((d) => {
                  const c = counts.get(toISODate(d)) ?? 0
                  return (
                    <span
                      key={toISODate(d)}
                      className={cn(
                        'aspect-square rounded-[2px]',
                        c === 0
                          ? 'bg-muted'
                          : c === 1
                            ? 'bg-primary/40'
                            : 'bg-primary',
                      )}
                    />
                  )
                })}
              </div>
            </button>
          )
        })}
      </div>
      <p className="text-muted-foreground text-center text-xs">
        Shaded squares mark days with planned work or events. Tap a month to open it.
      </p>
    </div>
  )
}

export default function Calendar() {
  const { data: events = [] } = useEvents()
  const [tab, setTab] = useState('month')
  const [month, setMonth_] = useState(() => new Date())
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Calendar"
        subtitle="Plan and review schoolwork, events, and field trips."
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="year">Year</TabsTrigger>
        </TabsList>
        <TabsContent value="month" className="mt-4">
          <MonthView
            month={month}
            setMonthDate={setMonth_}
            events={events}
            onDay={setSelectedDay}
          />
        </TabsContent>
        <TabsContent value="year" className="mt-4">
          <YearView
            year={year}
            setYear={setYear}
            events={events}
            onPickMonth={(d) => {
              setMonth_(d)
              setTab('month')
            }}
          />
        </TabsContent>
      </Tabs>

      <DayDialog
        day={selectedDay}
        events={events}
        onClose={() => setSelectedDay(null)}
      />
    </div>
  )
}
