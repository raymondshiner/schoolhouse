import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/AuthProvider'
import type { Settings } from '@/lib/database.types'

export function useSettings() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['settings'],
    queryFn: async (): Promise<Settings> => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .maybeSingle()
      if (error) throw error
      if (data) return data
      // Lazily create defaults on first read.
      const { data: created, error: insErr } = await supabase
        .from('settings')
        .insert({ parent_id: user!.id })
        .select()
        .single()
      if (insErr) throw insErr
      return created
    },
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (patch: Partial<Omit<Settings, 'parent_id'>>) => {
      const { error } = await supabase
        .from('settings')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('parent_id', user!.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  })
}
