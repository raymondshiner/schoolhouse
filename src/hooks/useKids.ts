import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/AuthProvider'
import type { Kid } from '@/lib/database.types'

export function useKids() {
  return useQuery({
    queryKey: ['kids'],
    queryFn: async (): Promise<Kid[]> => {
      const { data, error } = await supabase
        .from('kids')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

export type KidInput = {
  name: string
  grade: string | null
  birthdate: string | null
}

export function useCreateKid() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (input: KidInput): Promise<Kid> => {
      const { data, error } = await supabase
        .from('kids')
        .insert({ ...input, parent_id: user!.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kids'] }),
  })
}

export function useUpdateKid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: KidInput & { id: string }) => {
      const { error } = await supabase.from('kids').update(input).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kids'] }),
  })
}

export function useDeleteKid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('kids').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kids'] }),
  })
}
