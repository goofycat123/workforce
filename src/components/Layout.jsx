import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { path: '/dashboard',   icon: '⊞',  label: 'Dashboard',    roles: ['owner','manager','chatter'] },
  { path: '/payouts',     icon: '💸', label: 'Payouts',      roles: ['owner','manager','chatter'] },
  { path: '/profile',     icon: '👤', label: 'My Profile',   roles: ['owner','manager','chatter'] },
  { path: '/admin',       icon: '⚙',  label: 'Admin',        roles: ['owner'] },
]

export default function Layout() {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const initials = profile?.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '??'
  const visibleNav = NAV.filter(n => n.roles.includes(profile?.role || 'chatter'))

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>Workforce</h2>
          <span>Team management</span>
        </div>
        <nav>
          {visibleNav.map(item => (
            <button
              key={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="user-chip">
            <div className="user-avatar">{initials}</div>
            <div>
              <div className="user-name">{profile?.name || '...'}</div>
              <div className="user-role">{profile?.role}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{width:'100%'}} onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
