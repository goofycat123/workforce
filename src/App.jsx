import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Payouts from './pages/Payouts'
import Admin from './pages/Admin'
function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'#64748b' }}>Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function RequireOwner({ children }) {
  const { profile } = useAuth()
  if (!profile) return null
  if (profile.role !== 'owner') return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"   element={<Dashboard />} />
        <Route path="profile"     element={<Profile />} />
        <Route path="payouts"     element={<Payouts />} />
        <Route path="admin"       element={<RequireOwner><Admin /></RequireOwner>} />
      </Route>
    </Routes>
  )
}
