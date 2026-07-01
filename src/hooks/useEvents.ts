import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/AuthProvider'
import type { EventType, SchoolEvent } from '@/lib/database.types'

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: async (): Promise<SchoolEvent[]> => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

export type EventInput = {
  kid_id: string | null
  date: string
  title: string
  type: EventType
  notes: string | null
}

export function useCreateEvent() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (input: EventInput) => {
      const { error } = await supabase
        .from('events')
        .insert({ ...input, parent_id: user!.id })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useUpdateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<EventInput> & { id: string }) => {
      const { error } = await supabase.from('events').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('events').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}
