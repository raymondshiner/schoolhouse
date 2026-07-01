import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MoreVertical, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import {
  useKids,
  useCreateKid,
  useUpdateKid,
  useDeleteKid,
} from '@/hooks/useKids'
import { ageFromBirthdate } from '@/lib/dates'
import type { Kid } from '@/lib/database.types'
import { PageHeader, EmptyState } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const GRADES = [
  'Pre-K',
  'K',
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th',
  '10th',
  '11th',
  '12th',
]

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  grade: z.string().optional(),
  birthdate: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function KidDialog({
  open,
  onOpenChange,
  kid,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  kid?: Kid
}) {
  const create = useCreateKid()
  const update = useUpdateKid()
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      name: kid?.name ?? '',
      grade: kid?.grade ?? '',
      birthdate: kid?.birthdate ?? '',
    },
  })

  const onSubmit = handleSubmit(async (v) => {
    const payload = {
      name: v.name.trim(),
      grade: v.grade || null,
      birthdate: v.birthdate || null,
    }
    try {
      if (kid) {
        await update.mutateAsync({ id: kid.id, ...payload })
        toast.success(`Updated ${payload.name}`)
      } else {
        await create.mutateAsync(payload)
        toast.success(`Added ${payload.name}`)
      }
      reset()
      onOpenChange(false)
    } catch (e) {
      toast.error((e as Error).message)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{kid ? 'Edit kid' : 'Add a kid'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" autoFocus {...register('name')} />
            {errors.name && (
              <p className="text-destructive text-xs">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="grade">Grade</Label>
            <Select
              value={watch('grade') || undefined}
              onValueChange={(v) => setValue('grade', v)}
            >
              <SelectTrigger id="grade" className="w-full">
                <SelectValue placeholder="Select a grade" />
              </SelectTrigger>
              <SelectContent>
                {GRADES.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthdate">Birthdate</Label>
            <Input id="birthdate" type="date" {...register('birthdate')} />
            <p className="text-muted-foreground text-xs">
              Age is calculated from this.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={create.isPending || update.isPending}
            >
              {kid ? 'Save changes' : 'Add kid'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function Kids() {
  const { data: kids, isLoading } = useKids()
  const del = useDeleteKid()
  const [dialogKid, setDialogKid] = useState<Kid | undefined>()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteKid, setDeleteKid] = useState<Kid | undefined>()

  const openAdd = () => {
    setDialogKid(undefined)
    setDialogOpen(true)
  }
  const openEdit = (k: Kid) => {
    setDialogKid(k)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Kids"
        subtitle="Everyone you're homeschooling."
        action={
          <Button onClick={openAdd} size="sm">
            <Plus className="h-4 w-4" /> Add kid
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : kids && kids.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {kids.map((k) => {
            const age = ageFromBirthdate(k.birthdate)
            return (
              <Card key={k.id}>
                <CardContent className="flex items-center justify-between gap-3 py-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary flex h-11 w-11 items-center justify-center rounded-full text-lg font-semibold">
                      {k.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{k.name}</p>
                      <p className="text-muted-foreground text-sm">
                        {[k.grade, age != null ? `age ${age}` : null]
                          .filter(Boolean)
                          .join(' · ') || 'No details'}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Actions">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(k)}>
                        <Pencil className="h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteKid(k)}
                      >
                        <Trash2 className="h-4 w-4" /> Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="No kids yet"
          description="Add your first child to start tracking attendance, loops, hours, and reading."
          action={
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add kid
            </Button>
          }
        />
      )}

      <KidDialog open={dialogOpen} onOpenChange={setDialogOpen} kid={dialogKid} />

      <AlertDialog
        open={!!deleteKid}
        onOpenChange={(v) => !v && setDeleteKid(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteKid?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes {deleteKid?.name} and all their
              attendance, loops, hours, and books. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteKid) return
                try {
                  await del.mutateAsync(deleteKid.id)
                  toast.success(`Removed ${deleteKid.name}`)
                } catch (e) {
                  toast.error((e as Error).message)
                }
                setDeleteKid(undefined)
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
