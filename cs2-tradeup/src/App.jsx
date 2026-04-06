import { useState } from 'react'
import Calculator from './pages/Calculator'
import Scanner from './pages/Scanner'
import Collections from './pages/Collections'

const TABS = [
  { id: 'scanner',     label: '🔍 Scanner',    desc: 'Find profitable FT→MW/FN routes' },
  { id: 'calculator',  label: '🧮 Calculator',  desc: 'Calculate output for 10 skins' },
  { id: 'collections', label: '📦 Collections', desc: 'Browse case skin data' },
]

export default function App() {
  const [tab, setTab] = useState('scanner')

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">⚙</span>
            <div>
              <div className="logo-title">CS2 Trade-Up Lab</div>
              <div className="logo-sub">Float-targeted contract calculator</div>
            </div>
          </div>
        </div>
        <nav className="tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`tab-btn ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="header-right">
          <span className="header-note">Formula: skinMin + avgInput × (skinMax − skinMin)</span>
        </div>
      </header>

      <div className="content">
        {tab === 'scanner'     && <Scanner />}
        {tab === 'calculator'  && <Calculator />}
        {tab === 'collections' && <Collections />}
      </div>
    </div>
  )
}
