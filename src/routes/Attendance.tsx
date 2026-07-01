import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ClipboardCheck, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useKids } from '@/hooks/useKids'
import {
  useAttendanceForDate,
  useAllAttendance,
  useSetAttendance,
} from '@/hooks/useAttendance'
import { useSettings } from '@/hooks/useSettings'
import { addDays, formatLong, toISODate, todayISO } from '@/lib/dates'
import type { AttendanceStatus } from '@/lib/database.types'
import { PageHeader, EmptyState } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

const STATUSES: {
  value: AttendanceStatus
  label: string
  active: string
}[] = [
  { value: 'present', label: 'Present', active: 'bg-emerald-500 text-white border-emerald-500' },
  { value: 'absent', label: 'Absent', active: 'bg-red-500 text-white border-red-500' },
  { value: 'half', label: 'Half', active: 'bg-amber-500 text-white border-amber-500' },
  { value: 'field_trip', label: 'Field trip', active: 'bg-cyan-500 text-white border-cyan-500' },
  { value: 'holiday', label: 'Holiday', active: 'bg-muted-foreground text-white border-muted-foreground' },
]

function MandatedDays() {
  const { data: all = [] } = useAllAttendance()
  const { data: settings } = useSettings()
  const completed = useMemo(() => {
    const days = new Set(
      all.filter((a) => a.counts_as_school_day).map((a) => a.date),
    )
    return days.size
  }, [all])
  const required = settings?.required_days ?? 180
  const pct = Math.min(100, Math.round((completed / required) * 100))

  return (
    <Card>
      <CardContent className="space-y-2 py-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium">School days logged</span>
          <span className="text-muted-foreground text-sm">
            {completed} / {required}
          </span>
        </div>
        <Progress value={pct} />
        <p className="text-muted-foreground text-xs">
          Distinct days with at least one child in attendance.
        </p>
      </CardContent>
    </Card>
  )
}

export default function Attendance() {
  const { data: kids = [], isLoading } = useKids()
  const [date, setDate] = useState(() => new Date())
  const iso = toISODate(date)
  const { data: rows = [] } = useAttendanceForDate(iso)
  const setAttendance = useSetAttendance()

  const statusFor = (kidId: string): AttendanceStatus | undefined =>
    rows.find((r) => r.kid_id === kidId)?.status

  const set = async (kidId: string, status: AttendanceStatus) => {
    try {
      await setAttendance.mutateAsync({ kid_id: kidId, date: iso, status })
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const markAllPresent = async () => {
    try {
      await Promise.all(
        kids.map((k) =>
          setAttendance.mutateAsync({
            kid_id: k.id,
            date: iso,
            status: 'present',
          }),
        ),
      )
      toast.success('Marked everyone present')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const isToday = iso === todayISO()

  return (
    <div className="space-y-4">
      <PageHeader
        title="Attendance"
        subtitle="Tap a status for each child. Saves instantly."
      />

      <MandatedDays />

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous day"
          onClick={() => setDate((d) => addDays(d, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="font-medium">{formatLong(date)}</p>
          {!isToday && (
            <button
              className="text-primary text-xs"
              onClick={() => setDate(new Date())}
            >
              Jump to today
            </button>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label="Next day"
          onClick={() => setDate((d) => addDays(d, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? null : kids.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="No kids yet"
          description="Add a child on the Kids screen to start taking attendance."
        />
      ) : (
        <>
          {kids.length > 1 && (
            <Button
              variant="secondary"
              className="w-full"
              onClick={markAllPresent}
            >
              <ClipboardCheck className="h-4 w-4" /> Mark everyone present
            </Button>
          )}
          <div className="space-y-3">
            {kids.map((k) => {
              const current = statusFor(k.id)
              return (
                <Card key={k.id}>
                  <CardContent className="space-y-3 py-4">
                    <p className="font-medium">{k.name}</p>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                      {STATUSES.map((s) => (
                        <button
                          key={s.value}
                          onClick={() => set(k.id, s.value)}
                          className={cn(
                            'rounded-md border py-2 text-xs font-medium transition-colors',
                            current === s.value
                              ? s.active
                              : 'text-muted-foreground hover:bg-accent',
                          )}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
