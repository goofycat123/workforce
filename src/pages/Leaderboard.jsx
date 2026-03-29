import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function fmt(n) { return '$' + Number(n||0).toFixed(2) }

const PALETTE = ['#185FA5','#0F6E56','#993C1D','#993556','#854F0B','#3B6D11','#A32D2D','#534AB7']

export default function Leaderboard() {
  const { profile } = useAuth()
  const [data, setData]     = useState([])
  const [period, setPeriod] = useState(null)
  const [loading, setLoading] = useState(true)
  const [metric, setMetric] = useState('net_sales')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: p } = await supabase.from('payroll_periods')
      .select('*').eq('status','open').order('created_at',{ascending:false}).limit(1).single()
    setPeriod(p)

    const { data: e } = await supabase.from('earnings')
      .select('*, profiles(name, id)')
      .eq('period_id', p?.id || '')
      .order('net_sales', { ascending: false })
    setData(e || [])
    setLoading(false)
  }

  const sorted = [...data].sort((a,b) => +b[metric] - +a[metric])
  const max    = sorted[0] ? +sorted[0][metric] : 1
  const myRank = sorted.findIndex(e => e.user_id === profile?.id) + 1

  const rankIcon = i => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}`
  const rankClass = i => i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''

  const METRICS = [
    { key: 'net_sales', label: 'Net Sales' },
    { key: 'earnings',  label: 'Earnings'  },
    { key: 'net_owed',  label: 'Net Owed'  },
    { key: 'bonus',     label: 'Bonuses'   },
  ]

  return (
    <div>
      <h1 className="page-title">Leaderboard</h1>
      <p className="page-sub">
        {period?.name} · {myRank > 0 ? `You are ranked #${myRank}` : 'Your rank will appear once earnings are set'}
      </p>

      {myRank > 0 && myRank <= 3 && (
        <div className="alert alert-success" style={{marginBottom:20}}>
          🎉 You're in the top 3 this period! Keep it up.
        </div>
      )}

      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        {METRICS.map(m => (
          <button key={m.key}
            className={`btn btn-sm ${metric===m.key?'btn-primary':'btn-secondary'}`}
            onClick={() => setMetric(m.key)}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">Rankings — {METRICS.find(m=>m.key===metric)?.label}</span>
          <span style={{fontSize:12,color:'#64748b'}}>{period?.name}</span>
        </div>
        {loading ? (
          <div className="empty-state"><p>Loading...</p></div>
        ) : sorted.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏆</div>
            <p>No earnings data yet for this period</p>
          </div>
        ) : (
          <div>
            {sorted.map((e, i) => {
              const isMe = e.user_id === profile?.id
              const pct  = max > 0 ? (+e[metric] / max) * 100 : 0
              const col  = PALETTE[i % PALETTE.length]
              const ini  = e.profiles?.name?.slice(0,2).toUpperCase() || '??'
              return (
                <div key={e.id} className="lb-item" style={{background: isMe ? '#0f2a1a' : 'transparent'}}>
                  <div className={`lb-rank ${rankClass(i)}`}>{rankIcon(i)}</div>
                  <div className="avatar" style={{background: col+'33', color: col}}>{ini}</div>
                  <div className="lb-info">
                    <div className="lb-name">
                      {e.profiles?.name}
                      {isMe && <span style={{marginLeft:8,fontSize:10,color:'#22c55e',fontWeight:600}}>YOU</span>}
                    </div>
                    <div className="lb-sub">{fmt(e.net_sales)} net sales</div>
                  </div>
                  <div className="lb-bar-wrap">
                    <div className="lb-bar" style={{width:`${pct}%`, background: i===0?'#fbbf24':i===1?'#94a3b8':i===2?'#b45309':'#22c55e'}}></div>
                  </div>
                  <div className="lb-value">{fmt(+e[metric])}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={{marginTop:16,padding:'12px 16px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',fontSize:12,color:'#64748b',lineHeight:1.7}}>
        Rankings update when your manager logs earnings for the period. Early payouts do not affect your leaderboard position.
      </div>
    </div>
  )
}
