import { useMemo, useState } from 'react'
import { Clock, Plus, Trash2, Users, BookMarked } from 'lucide-react'
import { toast } from 'sonner'
import { useActiveKid } from '@/hooks/useActiveKid'
import {
  useCourses,
  useHours,
  useCreateCourse,
  useDeleteCourse,
  useLogHours,
  useDeleteHours,
} from '@/hooks/useHours'
import { formatDate, todayISO } from '@/lib/dates'
import { PageHeader, EmptyState } from '@/components/ui-bits'
import { KidSwitcher } from '@/components/KidSwitcher'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const NONE = '__none__'

function AddCourseDialog({ kidId }: { kidId: string }) {
  const create = useCreateCourse()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [target, setTarget] = useState('120')
  const [credit, setCredit] = useState('1')
  const [year, setYear] = useState('')

  const submit = async () => {
    if (!name.trim()) return toast.error('Course name is required')
    try {
      await create.mutateAsync({
        kid_id: kidId,
        name: name.trim(),
        credit_target_hours: Number(target) || 120,
        credit_value: Number(credit) || 1,
        school_year: year.trim() || null,
      })
      setName('')
      setOpen(false)
      toast.success('Course added')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <BookMarked className="h-4 w-4" /> Add course
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a course</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cname">Course name</Label>
            <Input
              id="cname"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Biology"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="target">Target hours</Label>
              <Input
                id="target"
                type="number"
                inputMode="decimal"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="credit">Credits</Label>
              <Input
                id="credit"
                type="number"
                inputMode="decimal"
                value={credit}
                onChange={(e) => setCredit(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="year">School year (optional)</Label>
            <Input
              id="year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2025-2026"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={create.isPending}>
            Add course
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function LogHoursDialog({
  kidId,
  courses,
}: {
  kidId: string
  courses: { id: string; name: string }[]
}) {
  const log = useLogHours()
  const [open, setOpen] = useState(false)
  const [courseId, setCourseId] = useState<string>(NONE)
  const [subject, setSubject] = useState('')
  const [date, setDate] = useState(todayISO())
  const [hours, setHours] = useState('1')
  const [desc, setDesc] = useState('')

  const submit = async () => {
    const h = Number(hours)
    if (!h || h <= 0) return toast.error('Enter hours greater than 0')
    try {
      await log.mutateAsync({
        kid_id: kidId,
        course_id: courseId === NONE ? null : courseId,
        subject: subject.trim() || null,
        date,
        hours: h,
        description: desc.trim() || null,
      })
      setOpen(false)
      setSubject('')
      setDesc('')
      setHours('1')
      toast.success('Hours logged')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> Log hours
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log hours</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Course</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No course</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {courseId === NONE && (
            <div className="space-y-2">
              <Label htmlFor="subj">Subject (optional)</Label>
              <Input
                id="subj"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. PE"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="hdate">Date</Label>
              <Input
                id="hdate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hrs">Hours</Label>
              <Input
                id="hrs"
                type="number"
                inputMode="decimal"
                step="0.25"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">What did you cover? (optional)</Label>
            <Input
              id="desc"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={log.isPending}>
            Log hours
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function Hours() {
  const { activeKid, activeKidId, kids } = useActiveKid()
  const { data: courses = [] } = useCourses(activeKidId)
  const { data: entries = [] } = useHours(activeKidId)
  const delCourse = useDeleteCourse(activeKidId ?? '')
  const delHours = useDeleteHours(activeKidId ?? '')

  const totals = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of entries) {
      if (e.course_id) m.set(e.course_id, (m.get(e.course_id) ?? 0) + e.hours)
    }
    return m
  }, [entries])

  const grandTotal = useMemo(
    () => entries.reduce((s, e) => s + e.hours, 0),
    [entries],
  )

  if (kids.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader title="Hours & Credits" />
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="No kids yet"
          description="Add a child first to log instructional hours."
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Hours & Credits"
        subtitle={`${grandTotal} hrs logged for ${activeKid?.name ?? ''}`.trim()}
        action={
          activeKidId && (
            <div className="flex gap-2">
              <AddCourseDialog kidId={activeKidId} />
              <LogHoursDialog kidId={activeKidId} courses={courses} />
            </div>
          )
        }
      />
      <KidSwitcher />

      {courses.length === 0 ? (
        <EmptyState
          icon={<Clock className="h-8 w-8" />}
          title="No courses yet"
          description="Add a course with a credit target (commonly ~120 hrs = 1 credit) to track progress toward high-school credit."
          action={
            activeKidId && <AddCourseDialog kidId={activeKidId} />
          }
        />
      ) : (
        <div className="space-y-3">
          {courses.map((c) => {
            const logged = totals.get(c.id) ?? 0
            const pct = Math.min(
              100,
              Math.round((logged / c.credit_target_hours) * 100),
            )
            const earned = (
              Math.min(logged / c.credit_target_hours, 1) * c.credit_value
            ).toFixed(2)
            return (
              <Card key={c.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-base">{c.name}</CardTitle>
                    {c.school_year && (
                      <p className="text-muted-foreground text-xs">
                        {c.school_year}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete course"
                    onClick={() => {
                      if (confirm(`Delete ${c.name} and its logged hours?`))
                        delCourse.mutate(c.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Progress value={pct} />
                  <div className="text-muted-foreground flex justify-between text-sm">
                    <span>
                      {logged} / {c.credit_target_hours} hrs
                    </span>
                    <span>
                      {earned} / {c.credit_value} credit
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {entries.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Recent hours</h2>
          <div className="divide-y rounded-lg border">
            {entries.slice(0, 20).map((e) => {
              const course = courses.find((c) => c.id === e.course_id)
              return (
                <div
                  key={e.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {course?.name ?? e.subject ?? 'Hours'}
                      {e.description ? (
                        <span className="text-muted-foreground font-normal">
                          {' '}
                          — {e.description}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatDate(e.date)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-medium">{e.hours} hrs</span>
                    <button
                      aria-label="Delete entry"
                      onClick={() => delHours.mutate(e.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
