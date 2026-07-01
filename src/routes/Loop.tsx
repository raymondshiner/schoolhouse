import { useState } from 'react'
import {
  Check,
  Plus,
  Repeat,
  Trash2,
  X,
  ArrowRight,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { useActiveKid } from '@/hooks/useActiveKid'
import {
  useLoops,
  useLoopItems,
  useCreateLoop,
  useDeleteLoop,
  useAddLoopItem,
  useDeleteLoopItem,
  useAdvanceLoop,
} from '@/hooks/useLoops'
import type { Loop } from '@/lib/database.types'
import { PageHeader, EmptyState } from '@/components/ui-bits'
import { KidSwitcher } from '@/components/KidSwitcher'
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

function LoopCard({ loop, kidId }: { loop: Loop; kidId: string }) {
  const { data: items = [] } = useLoopItems(loop.id)
  const addItem = useAddLoopItem()
  const delItem = useDeleteLoopItem(loop.id)
  const delLoop = useDeleteLoop(kidId)
  const advance = useAdvanceLoop()
  const [newSubject, setNewSubject] = useState('')

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
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{loop.name}</CardTitle>
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

function CreateLoopDialog({ kidId }: { kidId: string }) {
  const create = useCreateLoop()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const submit = async () => {
    const n = name.trim() || 'Loop'
    try {
      await create.mutateAsync({ kid_id: kidId, name: n })
      setName('')
      setOpen(false)
      toast.success(`Created "${n}"`)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> New loop
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New loop</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="loopname">Name</Label>
          <Input
            id="loopname"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="e.g. Morning Basket"
          />
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={create.isPending}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function Loop() {
  const { activeKid, activeKidId, kids } = useActiveKid()
  const { data: loops = [] } = useLoops(activeKidId)

  if (kids.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader title="Loop" />
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="No kids yet"
          description="Add a child first, then build their loop schedule."
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Loop"
        subtitle="Pick up right where you left off."
        action={activeKidId && <CreateLoopDialog kidId={activeKidId} />}
      />
      <KidSwitcher />

      {loops.length === 0 ? (
        <EmptyState
          icon={<Repeat className="h-8 w-8" />}
          title={`No loops for ${activeKid?.name ?? 'this kid'}`}
          description="A loop is an ordered list of subjects you rotate through — no fixed daily schedule, just do the next one."
          action={activeKidId && <CreateLoopDialog kidId={activeKidId} />}
        />
      ) : (
        <div className="space-y-4">
          {loops.map((loop) => (
            <LoopCard key={loop.id} loop={loop} kidId={activeKidId!} />
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
