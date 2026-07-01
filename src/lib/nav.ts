import {
  CalendarDays,
  BookOpen,
  Repeat,
  ClipboardCheck,
  Users,
  Home,
  Clock,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  /** Show in the mobile bottom bar (space-limited). */
  primary: boolean
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Today', icon: Home, primary: true },
  { to: '/kids', label: 'Kids', icon: Users, primary: true },
  { to: '/attendance', label: 'Attendance', icon: ClipboardCheck, primary: true },
  { to: '/loop', label: 'Loop', icon: Repeat, primary: true },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays, primary: true },
  { to: '/hours', label: 'Hours', icon: Clock, primary: false },
  { to: '/books', label: 'Books', icon: BookOpen, primary: false },
]
