import { useState, type ReactNode } from 'react'
import {
  Check,
  Pencil,
  Plus,
  Repeat,
  Trash2,
  X,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { useKids } from '@/hooks/useKids'
import {
  useLoops,
  useLoopItems,
  useCreateLoop,
  useUpdateLoop,
  useDeleteLoop,
  useAddLoopItem,
  useDeleteLoopItem,
  useAdvanceLoop,
  type LoopWithKids,
} from '@/hooks/useLoops'
import type { Kid } from '@/lib/database.types'
import { PageHeader, EmptyState } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

function KidChips({
  kids,
  selected,
  onToggle,
}: {
  kids: Kid[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  if (kids.length === 0)
    return (
      <p className="text-muted-foreground text-sm">
        No kids yet — you can assign them later.
      </p>
    )
  return (
    <div className="flex flex-wrap gap-2">
      {kids.map((k) => {
        const on = selected.includes(k.id)
        return (
          <button
            key={k.id}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(k.id)}
            className={cn(
              'rounded-full border px-3 py-1 text-sm transition-colors',
              on
                ? 'bg-primary text-primary-foreground border-primary'
                : 'text-muted-foreground hover:bg-accent',
            )}
          >
            {k.name}
          </button>
        )
      })}
    </div>
  )
}

function LoopDialog({
  trigger,
  title,
  submitLabel,
  initialName = '',
  initialKidIds = [],
  pending,
  onSubmit,
}: {
  trigger: ReactNode
  title: string
  submitLabel: string
  initialName?: string
  initialKidIds?: string[]
  pending: boolean
  onSubmit: (name: string, kidIds: string[]) => Promise<void>
}) {
  const { data: kids = [] } = useKids()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(initialName)
  const [kidIds, setKidIds] = useState<string[]>(initialKidIds)

  const reset = () => {
    setName(initialName)
    setKidIds(initialKidIds)
  }

  const toggle = (id: string) =>
    setKidIds((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id],
    )

  const submit = async () => {
    try {
      await onSubmit(name.trim() || 'Loop', kidIds)
      setOpen(false)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) reset()
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="loopname">Name</Label>
            <Input
              id="loopname"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="e.g. Family, Morning Basket"
            />
          </div>
          <div className="space-y-2">
            <Label>Kids in this loop</Label>
            <KidChips kids={kids} selected={kidIds} onToggle={toggle} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function LoopCard({ loop, kids }: { loop: LoopWithKids; kids: Kid[] }) {
  const { data: items = [] } = useLoopItems(loop.id)
  const addItem = useAddLoopItem()
  const delItem = useDeleteLoopItem(loop.id)
  const delLoop = useDeleteLoop()
  const update = useUpdateLoop()
  const advance = useAdvanceLoop()
  const [newSubject, setNewSubject] = useState('')

  const assignedIds = loop.loop_kids.map((lk) => lk.kid_id)
  const assignedKids = kids.filter((k) => assignedIds.includes(k.id))

  const activeItems = items.filter((i) => i.active)
  const pos =
    activeItems.length > 0 ? loop.current_position % activeItems.length : 0
  const upNext = activeItems[pos]

  const add = async () => {
    const subject = newSubject.trim()
    if (!subject) return
    try {
      await addItem.mutateAsync({
        loop_id: loop.id,
        subject,
        position: items.length,
      })
      setNewSubject('')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const markDone = async () => {
    if (!upNext) return
    try {
      await advance.mutateAsync({
        loop,
        itemCount: activeItems.length,
        currentItemId: upNext.id,
      })
      toast.success(`${upNext.subject} done — advanced the loop`)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-base">{loop.name}</CardTitle>
          <div className="flex flex-wrap gap-1">
            {assignedKids.length > 0 ? (
              assignedKids.map((k) => (
                <Badge key={k.id} variant="secondary" className="font-normal">
                  {k.name}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground text-xs">
                No kids assigned
              </span>
            )}
          </div>
        </div>
        <div className="flex">
          <LoopDialog
            title="Edit loop"
            submitLabel="Save"
            initialName={loop.name}
            initialKidIds={assignedIds}
            pending={update.isPending}
            onSubmit={async (name, kidIds) => {
              await update.mutateAsync({ id: loop.id, name, kid_ids: kidIds })
              toast.success(`Updated "${name}"`)
            }}
            trigger={
              <Button variant="ghost" size="icon" aria-label="Edit loop">
                <Pencil className="h-4 w-4" />
              </Button>
            }
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete loop"
            onClick={() => {
              if (confirm(`Delete the "${loop.name}" loop?`))
                delLoop.mutate(loop.id)
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {upNext ? (
          <div className="bg-primary/5 border-primary/30 flex items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <p className="text-muted-foreground text-xs font-medium uppercase">
                Up next
              </p>
              <p className="text-lg font-semibold">{upNext.subject}</p>
            </div>
            <Button onClick={markDone} disabled={advance.isPending}>
              <Check className="h-4 w-4" /> Done
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Add subjects below to start the loop.
          </p>
        )}

        <ol className="space-y-1">
          {activeItems.map((item, idx) => (
            <li
              key={item.id}
              className={cn(
                'flex items-center justify-between rounded-md px-3 py-2 text-sm',
                idx === pos ? 'bg-accent font-medium' : 'text-muted-foreground',
              )}
            >
              <span className="flex items-center gap-2">
                {idx === pos && <ArrowRight className="h-3.5 w-3.5" />}
                {item.subject}
              </span>
              <button
                aria-label={`Remove ${item.subject}`}
                onClick={() => delItem.mutate(item.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ol>

        <div className="flex gap-2">
          <Input
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="Add a subject…"
          />
          <Button variant="secondary" onClick={add} disabled={addItem.isPending}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Loop() {
  const { data: kids = [] } = useKids()
  const { data: loops = [] } = useLoops()
  const create = useCreateLoop()

  const newLoopDialog = (trigger: ReactNode) => (
    <LoopDialog
      title="New loop"
      submitLabel="Create"
      pending={create.isPending}
      onSubmit={async (name, kidIds) => {
        await create.mutateAsync({ name, kid_ids: kidIds })
        toast.success(`Created "${name}"`)
      }}
      trigger={trigger}
    />
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title="Loop"
        subtitle="Pick up right where you left off."
        action={newLoopDialog(
          <Button size="sm">
            <Plus className="h-4 w-4" /> New loop
          </Button>,
        )}
      />

      {loops.length === 0 ? (
        <EmptyState
          icon={<Repeat className="h-8 w-8" />}
          title="No loops yet"
          description="A loop is an ordered list of subjects you rotate through — no fixed daily schedule, just do the next one. Assign any mix of kids to each loop: the whole family, a few, or just one."
          action={newLoopDialog(
            <Button size="sm">
              <Plus className="h-4 w-4" /> New loop
            </Button>,
          )}
        />
      ) : (
        <div className="space-y-4">
          {loops.map((loop) => (
            <LoopCard key={loop.id} loop={loop} kids={kids} />
          ))}
        </div>
      )}

      <div className="flex justify-center">
        <Badge variant="secondary" className="text-xs font-normal">
          Marking an item done logs it and moves the pointer forward.
        </Badge>
      </div>
    </div>
  )
}
