export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'half'
  | 'field_trip'
  | 'holiday'

export type BookStatus = 'to_read' | 'reading' | 'finished'
export type EventType = 'schoolwork' | 'event' | 'field_trip'

export type Kid = {
  id: string
  parent_id: string
  name: string
  grade: string | null
  birthdate: string | null
  google_calendar_id: string | null
  created_at: string
}

export type Attendance = {
  id: string
  kid_id: string
  date: string
  status: AttendanceStatus
  counts_as_school_day: boolean
  notes: string | null
  created_at: string
}

export type Loop = {
  id: string
  kid_id: string
  name: string
  current_position: number
  created_at: string
}

export type LoopItem = {
  id: string
  loop_id: string
  subject: string
  position: number
  active: boolean
  created_at: string
}

export type LoopCompletion = {
  id: string
  loop_item_id: string
  date: string
  created_at: string
}

export type Course = {
  id: string
  kid_id: string
  name: string
  credit_target_hours: number
  credit_value: number
  school_year: string | null
  created_at: string
}

export type HoursEntry = {
  id: string
  kid_id: string
  course_id: string | null
  subject: string | null
  date: string
  hours: number
  description: string | null
  created_at: string
}

export type Book = {
  id: string
  kid_id: string
  title: string
  author: string | null
  started_on: string | null
  finished_on: string | null
  status: BookStatus
  created_at: string
}

export type SchoolEvent = {
  id: string
  parent_id: string
  kid_id: string | null
  date: string
  title: string
  type: EventType
  notes: string | null
  google_event_id: string | null
  google_calendar_id: string | null
  created_at: string
}

export type Settings = {
  parent_id: string
  required_days: number
  school_year: string | null
  updated_at: string
}
