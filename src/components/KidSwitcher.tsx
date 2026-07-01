import { useActiveKid } from '@/hooks/useActiveKid'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/** Horizontally scrollable kid picker; falls back to a select if many kids. */
export function KidSwitcher() {
  const { kids, activeKidId, setActiveKidId } = useActiveKid()
  if (kids.length <= 1) return null

  if (kids.length > 4) {
    return (
      <Select value={activeKidId} onValueChange={setActiveKidId}>
        <SelectTrigger className="w-full sm:w-56">
          <SelectValue placeholder="Select a kid" />
        </SelectTrigger>
        <SelectContent>
          {kids.map((k) => (
            <SelectItem key={k.id} value={k.id}>
              {k.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {kids.map((k) => (
        <button
          key={k.id}
          onClick={() => setActiveKidId(k.id)}
          className={
            'shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ' +
            (k.id === activeKidId
              ? 'bg-primary text-primary-foreground border-primary'
              : 'text-muted-foreground hover:bg-accent')
          }
        >
          {k.name}
        </button>
      ))}
    </div>
  )
}
