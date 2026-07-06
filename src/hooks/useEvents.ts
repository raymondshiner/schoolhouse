import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/AuthProvider'
import { useGoogleSync } from '@/hooks/useGoogleSync'
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
  const { pushEventSafe } = useGoogleSync()
  return useMutation({
    mutationFn: async (input: EventInput) => {
      const { data, error } = await supabase
        .from('events')
        .insert({ ...input, parent_id: user!.id })
        .select()
        .single()
      if (error) throw error
      await pushEventSafe(data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useUpdateEvent() {
  const qc = useQueryClient()
  const { pushEventSafe } = useGoogleSync()
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<EventInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('events')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      await pushEventSafe(data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  const { removeEventSafe } = useGoogleSync()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('events')
        .delete()
        .eq('id', id)
        .select('google_event_id, google_calendar_id')
        .single()
      if (error) throw error
      await removeEventSafe(data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}
