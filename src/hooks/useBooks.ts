import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Book, BookStatus } from '@/lib/database.types'

export function useBooks(kidId: string | undefined) {
  return useQuery({
    enabled: !!kidId,
    queryKey: ['books', kidId],
    queryFn: async (): Promise<Book[]> => {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('kid_id', kidId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export type BookInput = {
  title: string
  author: string | null
  started_on: string | null
  finished_on: string | null
  status: BookStatus
}

export function useCreateBook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: BookInput & { kid_id: string }) => {
      const { error } = await supabase.from('books').insert(args)
      if (error) throw error
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['books', v.kid_id] }),
  })
}

export function useUpdateBook(kidId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<BookInput> & { id: string }) => {
      const { error } = await supabase.from('books').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['books', kidId] }),
  })
}

export function useDeleteBook(kidId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('books').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['books', kidId] }),
  })
}
