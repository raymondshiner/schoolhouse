import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppShell from '@/components/AppShell'
import Login from '@/routes/Login'
import Today from '@/routes/Today'
import Kids from '@/routes/Kids'
import Attendance from '@/routes/Attendance'
import Loop from '@/routes/Loop'
import Hours from '@/routes/Hours'
import Calendar from '@/routes/Calendar'
import Books from '@/routes/Books'

function LoginRoute() {
  const { session, loading } = useAuth()
  if (loading) return null
  if (session) return <Navigate to="/" replace />
  return <Login />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<Today />} />
            <Route path="/kids" element={<Kids />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/loop" element={<Loop />} />
            <Route path="/hours" element={<Hours />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/books" element={<Books />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
