import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { CalendarDays, Check, Repeat, Users, MapPin, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { useKids } from '@/hooks/useKids'
import { useAttendanceForDate, useSetAttendance } from '@/hooks/useAttendance'
import { useEvents } from '@/hooks/useEvents'
import { useLoopsForKid, useLoopItems } from '@/hooks/useLoops'
import { todayISO } from '@/lib/dates'
import type { AttendanceStatus, EventType, Kid } from '@/lib/database.types'
import { PageHeader, EmptyState } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  half: 'Half day',
  field_trip: 'Field trip',
  holiday: 'Holiday',
}
const TYPE_DOT: Record<EventType, string> = {
  schoolwork: 'bg-purple-500',
  event: 'bg-cyan-500',
  field_trip: 'bg-amber-500',
}

function UpNext({ kidId }: { kidId: string }) {
  const { data: loops = [] } = useLoopsForKid(kidId)
  const firstLoop = loops[0]
  const { data: items = [] } = useLoopItems(firstLoop?.id)
  if (!firstLoop) return null
  const active = items.filter((i) => i.active)
  if (active.length === 0) return null
  const item = active[firstLoop.current_position % active.length]
  return (
    <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
      <Repeat className="h-3.5 w-3.5" />
      Up next: <span className="text-foreground font-medium">{item.subject}</span>
      <span className="text-xs">({firstLoop.name})</span>
    </p>
  )
}

function KidTodayCard({ kid }: { kid: Kid }) {
  const iso = todayISO()
  const { data: rows = [] } = useAttendanceForDate(iso)
  const setAttendance = useSetAttendance()
  const status = rows.find((r) => r.kid_id === kid.id)?.status

  return (
    <Card>
      <CardContent className="space-y-2 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold">
              {kid.name.charAt(0).toUpperCase()}
            </div>
            <p className="font-medium">{kid.name}</p>
          </div>
          {status ? (
            <Badge variant="secondary">{STATUS_LABEL[status]}</Badge>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  await setAttendance.mutateAsync({
                    kid_id: kid.id,
                    date: iso,
                    status: 'present',
                  })
                  toast.success(`${kid.name} marked present`)
                } catch (e) {
                  toast.error((e as Error).message)
                }
              }}
            >
              <Check className="h-4 w-4" /> Present
            </Button>
          )}
        </div>
        <UpNext kidId={kid.id} />
      </CardContent>
    </Card>
  )
}

export default function Today() {
  const { data: kids = [] } = useKids()
  const { data: events = [] } = useEvents()
  const iso = todayISO()
  const todaysEvents = events.filter((e) => e.date === iso)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Today"
        subtitle={format(new Date(), 'EEEE, MMMM d')}
      />

      {kids.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="Welcome to Schoolhouse"
          description="Start by adding your children — then you can track attendance, loops, hours, and reading."
          action={
            <Button asChild>
              <Link to="/kids">
                <Users className="h-4 w-4" /> Add your kids
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          {todaysEvents.length > 0 && (
            <Card>
              <CardContent className="space-y-2 py-4">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <CalendarDays className="h-4 w-4" /> Today
                </p>
                {todaysEvents.map((e) => (
                  <div key={e.id} className="flex items-center gap-2 text-sm">
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
                        TYPE_DOT[e.type],
                      )}
                    />
                    {e.title}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {kids.map((k) => (
              <KidTodayCard key={k.id} kid={k} />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <QuickLink to="/attendance" icon={<Check className="h-4 w-4" />} label="Attendance" />
            <QuickLink to="/loop" icon={<Repeat className="h-4 w-4" />} label="Loops" />
            <QuickLink to="/calendar" icon={<MapPin className="h-4 w-4" />} label="Calendar" />
            <QuickLink to="/books" icon={<BookOpen className="h-4 w-4" />} label="Books" />
          </div>
        </>
      )}
    </div>
  )
}

function QuickLink({
  to,
  icon,
  label,
}: {
  to: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <Button asChild variant="outline" className="h-auto flex-col gap-1 py-3">
      <Link to={to}>
        {icon}
        <span className="text-xs">{label}</span>
      </Link>
    </Button>
  )
}
