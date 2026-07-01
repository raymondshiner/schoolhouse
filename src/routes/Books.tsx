import { useState } from 'react'
import { BookOpen, Check, Plus, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useActiveKid } from '@/hooks/useActiveKid'
import {
  useBooks,
  useCreateBook,
  useUpdateBook,
  useDeleteBook,
} from '@/hooks/useBooks'
import { formatDate, todayISO } from '@/lib/dates'
import type { Book, BookStatus } from '@/lib/database.types'
import { PageHeader, EmptyState } from '@/components/ui-bits'
import { KidSwitcher } from '@/components/KidSwitcher'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const STATUS_META: Record<
  BookStatus,
  { label: string; variant: 'secondary' | 'default' | 'outline' }
> = {
  to_read: { label: 'To read', variant: 'outline' },
  reading: { label: 'Reading', variant: 'default' },
  finished: { label: 'Finished', variant: 'secondary' },
}

function AddBookDialog({ kidId }: { kidId: string }) {
  const create = useCreateBook()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [status, setStatus] = useState<BookStatus>('reading')
  const [started, setStarted] = useState(todayISO())
  const [finished, setFinished] = useState('')

  const submit = async () => {
    if (!title.trim()) return toast.error('Title is required')
    try {
      await create.mutateAsync({
        kid_id: kidId,
        title: title.trim(),
        author: author.trim() || null,
        status,
        started_on: status === 'to_read' ? null : started || null,
        finished_on: status === 'finished' ? finished || todayISO() : null,
      })
      setTitle('')
      setAuthor('')
      setOpen(false)
      toast.success('Book added')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> Add book
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a book</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="btitle">Title</Label>
            <Input
              id="btitle"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bauthor">Author</Label>
            <Input
              id="bauthor"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as BookStatus)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_META) as BookStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {status !== 'to_read' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="bstart">Started</Label>
                <Input
                  id="bstart"
                  type="date"
                  value={started}
                  onChange={(e) => setStarted(e.target.value)}
                />
              </div>
              {status === 'finished' && (
                <div className="space-y-2">
                  <Label htmlFor="bfin">Finished</Label>
                  <Input
                    id="bfin"
                    type="date"
                    value={finished}
                    onChange={(e) => setFinished(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={create.isPending}>
            Add book
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BookRow({ book, kidId }: { book: Book; kidId: string }) {
  const update = useUpdateBook(kidId)
  const del = useDeleteBook(kidId)
  const meta = STATUS_META[book.status]

  const markFinished = () =>
    update.mutate({
      id: book.id,
      status: 'finished',
      finished_on: todayISO(),
      started_on: book.started_on ?? todayISO(),
    })

  const range = [
    book.started_on ? `started ${formatDate(book.started_on, 'MMM d')}` : null,
    book.finished_on ? `finished ${formatDate(book.finished_on, 'MMM d')}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 py-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{book.title}</p>
          <p className="text-muted-foreground truncate text-sm">
            {book.author ?? 'Unknown author'}
            {range ? ` · ${range}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={meta.variant}>{meta.label}</Badge>
          {book.status !== 'finished' && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Mark finished"
              onClick={markFinished}
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          <button
            aria-label="Delete book"
            onClick={() => del.mutate(book.id)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Books() {
  const { activeKid, activeKidId, kids } = useActiveKid()
  const { data: books = [] } = useBooks(activeKidId)

  if (kids.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader title="Books" />
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="No kids yet"
          description="Add a child first to start a reading log."
        />
      </div>
    )
  }

  const finished = books.filter((b) => b.status === 'finished').length

  return (
    <div className="space-y-4">
      <PageHeader
        title="Books"
        subtitle={`${finished} finished for ${activeKid?.name ?? ''}`.trim()}
        action={activeKidId && <AddBookDialog kidId={activeKidId} />}
      />
      <KidSwitcher />

      {books.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-8 w-8" />}
          title="No books yet"
          description="Log what your child is reading — start dates, finish dates, and progress."
          action={activeKidId && <AddBookDialog kidId={activeKidId} />}
        />
      ) : (
        <div className="space-y-2">
          {books.map((b) => (
            <BookRow key={b.id} book={b} kidId={activeKidId!} />
          ))}
        </div>
      )}
    </div>
  )
}
