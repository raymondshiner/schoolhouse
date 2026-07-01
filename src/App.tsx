import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { ActiveKidProvider } from '@/hooks/useActiveKid'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppShell from '@/components/AppShell'
import Login from '@/routes/Login'

const Today = lazy(() => import('@/routes/Today'))
const Kids = lazy(() => import('@/routes/Kids'))
const Attendance = lazy(() => import('@/routes/Attendance'))
const Loop = lazy(() => import('@/routes/Loop'))
const Hours = lazy(() => import('@/routes/Hours'))
const Calendar = lazy(() => import('@/routes/Calendar'))
const Books = lazy(() => import('@/routes/Books'))

function LoginRoute() {
  const { session, loading } = useAuth()
  if (loading) return null
  if (session) return <Navigate to="/" replace />
  return <Login />
}

function KidLayout() {
  return (
    <ActiveKidProvider>
      <Outlet />
    </ActiveKidProvider>
  )
}

function PageFallback() {
  return (
    <div className="flex min-h-40 items-center justify-center">
      <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<KidLayout />}>
            <Route element={<AppShell />}>
              <Route
                path="/"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <Today />
                  </Suspense>
                }
              />
              <Route
                path="/kids"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <Kids />
                  </Suspense>
                }
              />
              <Route
                path="/attendance"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <Attendance />
                  </Suspense>
                }
              />
              <Route
                path="/loop"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <Loop />
                  </Suspense>
                }
              />
              <Route
                path="/hours"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <Hours />
                  </Suspense>
                }
              />
              <Route
                path="/calendar"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <Calendar />
                  </Suspense>
                }
              />
              <Route
                path="/books"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <Books />
                  </Suspense>
                }
              />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
