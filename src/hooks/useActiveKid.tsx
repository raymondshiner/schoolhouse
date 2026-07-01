import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useKids } from '@/hooks/useKids'
import type { Kid } from '@/lib/database.types'

type Ctx = {
  kids: Kid[]
  activeKid: Kid | undefined
  activeKidId: string | undefined
  setActiveKidId: (id: string) => void
  loading: boolean
}

const ActiveKidContext = createContext<Ctx | undefined>(undefined)
const STORAGE_KEY = 'schoolhouse.activeKidId'

export function ActiveKidProvider({ children }: { children: ReactNode }) {
  const { data: kids = [], isLoading } = useKids()
  const [activeKidId, setActiveKidIdState] = useState<string | undefined>(
    () => localStorage.getItem(STORAGE_KEY) ?? undefined,
  )

  useEffect(() => {
    if (kids.length === 0) return
    if (!activeKidId || !kids.some((k) => k.id === activeKidId)) {
      setActiveKidIdState(kids[0].id)
    }
  }, [kids, activeKidId])

  const setActiveKidId = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id)
    setActiveKidIdState(id)
  }

  const value = useMemo<Ctx>(
    () => ({
      kids,
      activeKid: kids.find((k) => k.id === activeKidId),
      activeKidId,
      setActiveKidId,
      loading: isLoading,
    }),
    [kids, activeKidId, isLoading],
  )

  return (
    <ActiveKidContext.Provider value={value}>
      {children}
    </ActiveKidContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useActiveKid() {
  const ctx = useContext(ActiveKidContext)
  if (!ctx) throw new Error('useActiveKid must be used within ActiveKidProvider')
  return ctx
}
