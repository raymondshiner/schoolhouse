import { Moon, Sun, GraduationCap } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

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

export default function App() {
  return (
    <div className="min-h-svh">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2 font-semibold">
          <GraduationCap className="h-6 w-6" />
          Schoolhouse
        </div>
        <ThemeToggle />
      </header>
      <main className="mx-auto max-w-2xl p-4">
        <Card>
          <CardHeader>
            <CardTitle>Foundation ready</CardTitle>
            <CardDescription>
              Vite + React 19 + Tailwind v4 + shadcn + Supabase + PWA scaffolded.
              Phase 0 wiring next: Google SSO, schema, routing.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Sign-in gate and data model land in the first build pass.
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
