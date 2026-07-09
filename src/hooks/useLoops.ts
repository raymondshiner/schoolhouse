import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/AuthProvider'
import { todayISO } from '@/lib/dates'
import type { Loop, LoopItem, LoopCompletion } from '@/lib/database.types'

export type LoopWithKids = Loop & { loop_kids: { kid_id: string }[] }

/** All of the parent's loops, with their assigned kid ids. */
export function useLoops() {
  return useQuery({
    queryKey: ['loops'],
    queryFn: async (): Promise<LoopWithKids[]> => {
      const { data, error } = await supabase
        .from('loops')
        .select('*, loop_kids(kid_id)')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

/** Loops a specific kid is assigned to (Today's "up next"). */
export function useLoopsForKid(kidId: string | undefined) {
  return useQuery({
    enabled: !!kidId,
    queryKey: ['loops', 'kid', kidId],
    queryFn: async (): Promise<Loop[]> => {
      const { data, error } = await supabase
        .from('loops')
        .select('*, loop_kids!inner(kid_id)')
        .eq('loop_kids.kid_id', kidId!)
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
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (args: { name: string; kid_ids: string[] }) => {
      const { data, error } = await supabase
        .from('loops')
        .insert({ name: args.name, parent_id: user!.id })
        .select()
        .single()
      if (error) throw error
      if (args.kid_ids.length > 0) {
        const { error: e2 } = await supabase
          .from('loop_kids')
          .insert(args.kid_ids.map((kid_id) => ({ loop_id: data.id, kid_id })))
        if (e2) throw e2
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loops'] }),
  })
}

/** Rename a loop and/or replace its kid assignments. */
export function useUpdateLoop() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { id: string; name: string; kid_ids: string[] }) => {
      const { error } = await supabase
        .from('loops')
        .update({ name: args.name })
        .eq('id', args.id)
      if (error) throw error
      const { error: delErr } = await supabase
        .from('loop_kids')
        .delete()
        .eq('loop_id', args.id)
      if (delErr) throw delErr
      if (args.kid_ids.length > 0) {
        const { error: insErr } = await supabase
          .from('loop_kids')
          .insert(args.kid_ids.map((kid_id) => ({ loop_id: args.id, kid_id })))
        if (insErr) throw insErr
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loops'] }),
  })
}

export function useDeleteLoop() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('loops').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loops'] }),
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
      qc.invalidateQueries({ queryKey: ['loops'] })
      qc.invalidateQueries({ queryKey: ['loop_completions', v.loop.id] })
    },
  })
}
