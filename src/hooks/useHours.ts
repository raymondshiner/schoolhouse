import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Course, HoursEntry } from '@/lib/database.types'

export function useCourses(kidId: string | undefined) {
  return useQuery({
    enabled: !!kidId,
    queryKey: ['courses', kidId],
    queryFn: async (): Promise<Course[]> => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('kid_id', kidId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

export function useHours(kidId: string | undefined) {
  return useQuery({
    enabled: !!kidId,
    queryKey: ['hours', kidId],
    queryFn: async (): Promise<HoursEntry[]> => {
      const { data, error } = await supabase
        .from('hours_log')
        .select('*')
        .eq('kid_id', kidId!)
        .order('date', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useCreateCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: {
      kid_id: string
      name: string
      credit_target_hours: number
      credit_value: number
      school_year: string | null
    }) => {
      const { error } = await supabase.from('courses').insert(args)
      if (error) throw error
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: ['courses', v.kid_id] }),
  })
}

export function useDeleteCourse(kidId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('courses').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses', kidId] })
      qc.invalidateQueries({ queryKey: ['hours', kidId] })
    },
  })
}

export function useLogHours() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: {
      kid_id: string
      course_id: string | null
      subject: string | null
      date: string
      hours: number
      description: string | null
    }) => {
      const { error } = await supabase.from('hours_log').insert(args)
      if (error) throw error
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['hours', v.kid_id] }),
  })
}

export function useDeleteHours(kidId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hours_log').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hours', kidId] }),
  })
}
