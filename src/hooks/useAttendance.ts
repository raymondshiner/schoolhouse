import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Attendance, AttendanceStatus } from '@/lib/database.types'

const COUNTS: Record<AttendanceStatus, boolean> = {
  present: true,
  half: true,
  field_trip: true,
  absent: false,
  holiday: false,
}

/** Attendance rows for a single date across all kids. */
export function useAttendanceForDate(date: string) {
  return useQuery({
    queryKey: ['attendance', 'date', date],
    queryFn: async (): Promise<Attendance[]> => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', date)
      if (error) throw error
      return data
    },
  })
}

/** All attendance rows (for counters + calendar). */
export function useAllAttendance() {
  return useQuery({
    queryKey: ['attendance', 'all'],
    queryFn: async (): Promise<Attendance[]> => {
      const { data, error } = await supabase.from('attendance').select('*')
      if (error) throw error
      return data
    },
  })
}

export function useSetAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: {
      kid_id: string
      date: string
      status: AttendanceStatus
    }) => {
      const { error } = await supabase.from('attendance').upsert(
        {
          kid_id: args.kid_id,
          date: args.date,
          status: args.status,
          counts_as_school_day: COUNTS[args.status],
        },
        { onConflict: 'kid_id,date' },
      )
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] })
    },
  })
}
