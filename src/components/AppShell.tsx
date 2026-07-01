import { NavLink, Outlet } from 'react-router-dom'
import { GraduationCap, LogOut, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useAuth } from '@/auth/AuthProvider'
import { navItems } from '@/lib/nav'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )
}

export default function AppShell() {
  const { user, signOut } = useAuth()

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="bg-sidebar hidden w-60 shrink-0 flex-col border-r md:flex">
        <div className="flex items-center gap-2 px-4 py-4 font-semibold">
          <GraduationCap className="h-6 w-6" />
          Schoolhouse
        </div>
        <nav className="flex flex-col gap-1 px-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex items-center justify-between gap-2 border-t p-3">
          <span className="text-muted-foreground truncate text-xs" title={user?.email ?? ''}>
            {user?.email}
          </span>
          <div className="flex shrink-0 items-center">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              onClick={() => void signOut()}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b px-4 py-3 md:hidden">
        <div className="flex items-center gap-2 font-semibold">
          <GraduationCap className="h-6 w-6" />
          Schoolhouse
        </div>
        <div className="flex items-center">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sign out"
            onClick={() => void signOut()}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-x-hidden pb-20 md:pb-0">
        <div className="mx-auto max-w-3xl p-4">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="bg-background fixed inset-x-0 bottom-0 z-10 flex border-t md:hidden">
        {navItems
          .filter((i) => i.primary)
          .map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
      </nav>
    </div>
  )
}
