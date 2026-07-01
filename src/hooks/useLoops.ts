import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { todayISO } from '@/lib/dates'
import type { Loop, LoopItem, LoopCompletion } from '@/lib/database.types'

export function useLoops(kidId: string | undefined) {
  return useQuery({
    enabled: !!kidId,
    queryKey: ['loops', kidId],
    queryFn: async (): Promise<Loop[]> => {
      const { data, error } = await supabase
        .from('loops')
        .select('*')
        .eq('kid_id', kidId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

export function useLoopItems(loopId: string | undefined) {
  return useQuery({
    enabled: !!loopId,
    queryKey: ['loop_items', loopId],
    queryFn: async (): Promise<LoopItem[]> => {
      const { data, error } = await supabase
        .from('loop_items')
        .select('*')
        .eq('loop_id', loopId!)
        .order('position', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

export function useLoopCompletions(loopId: string | undefined) {
  return useQuery({
    enabled: !!loopId,
    queryKey: ['loop_completions', loopId],
    queryFn: async (): Promise<LoopCompletion[]> => {
      if (!loopId) return []
      const { data: items } = await supabase
        .from('loop_items')
        .select('id')
        .eq('loop_id', loopId)
      const ids = (items ?? []).map((i) => i.id)
      if (ids.length === 0) return []
      const { data, error } = await supabase
        .from('loop_completions')
        .select('*')
        .in('loop_item_id', ids)
        .order('date', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useCreateLoop() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { kid_id: string; name: string }) => {
      const { error } = await supabase.from('loops').insert(args)
      if (error) throw error
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: ['loops', v.kid_id] }),
  })
}

export function useDeleteLoop(kidId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('loops').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loops', kidId] }),
  })
}

export function useAddLoopItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: {
      loop_id: string
      subject: string
      position: number
    }) => {
      const { error } = await supabase.from('loop_items').insert(args)
      if (error) throw error
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: ['loop_items', v.loop_id] }),
  })
}

export function useDeleteLoopItem(loopId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('loop_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loop_items', loopId] }),
  })
}

/** Mark the current loop item done: log a completion and advance the pointer. */
export function useAdvanceLoop() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: {
      loop: Loop
      itemCount: number
      currentItemId: string
    }) => {
      await supabase
        .from('loop_completions')
        .insert({ loop_item_id: args.currentItemId, date: todayISO() })
      const next =
        args.itemCount > 0
          ? (args.loop.current_position + 1) % args.itemCount
          : 0
      const { error } = await supabase
        .from('loops')
        .update({ current_position: next })
        .eq('id', args.loop.id)
      if (error) throw error
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['loops', v.loop.kid_id] })
      qc.invalidateQueries({ queryKey: ['loop_completions', v.loop.id] })
    },
  })
}
