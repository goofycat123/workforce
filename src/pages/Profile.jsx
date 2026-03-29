import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'

function fmt(n) { return '$' + Number(n||0).toFixed(2) }

export default function Profile() {
  const { profile, fetchProfile } = useAuth()
  const [history, setHistory]   = useState([])
  const [name, setName]         = useState('')
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (profile) { setName(profile.name); loadHistory() }
  }, [profile])

  async function loadHistory() {
    setLoading(true)
    const { data } = await supabase.from('earnings')
      .select('*, payroll_periods(name, start_date, end_date)')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
    setHistory(data || [])
    setLoading(false)
  }

  async function saveName(e) {
    e.preventDefault()
    setSaving(true); setMsg(null)
    const { error } = await supabase.from('profiles')
      .update({ name }).eq('id', profile.id)
    if (error) setMsg({ type:'error', text: error.message })
    else { setMsg({ type:'success', text: 'Name updated!' }); await fetchProfile(profile.id) }
    setSaving(false)
  }

  const totalEarned  = history.reduce((s,e) => s + +e.earnings, 0)
  const totalNS      = history.reduce((s,e) => s + +e.net_sales, 0)
  const totalBonuses = history.reduce((s,e) => s + +e.bonus, 0)
  const initials     = profile?.name?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || '??'

  return (
    <div>
      <h1 className="page-title">My Profile</h1>
      <p className="page-sub">Your account details and earnings history</p>

      <div className="grid-2" style={{marginBottom:24}}>
        <div className="card">
          <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:20}}>
            <div style={{width:60,height:60,borderRadius:'50%',background:'#14532d',color:'#4ade80',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:800}}>
              {initials}
            </div>
            <div>
              <div style={{fontSize:18,fontWeight:700}}>{profile?.name}</div>
              <div style={{fontSize:13,color:'#64748b',textTransform:'capitalize'}}>{profile?.role}</div>
              <div style={{fontSize:12,color:'#475569',marginTop:2}}>{profile?.email}</div>
            </div>
          </div>

          <hr className="divider" />

          <form onSubmit={saveName}>
            <div className="form-group">
              <label className="form-label">Display name</label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} />
            </div>
            {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
            <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Update name'}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="section-label" style={{marginTop:0}}>All-time stats</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div className="stat-card" style={{padding:'12px 14px'}}>
              <div className="stat-label">Total net sales</div>
              <div className="stat-value" style={{fontSize:18,color:'#22c55e'}}>{fmt(totalNS)}</div>
            </div>
            <div className="stat-card" style={{padding:'12px 14px'}}>
              <div className="stat-label">Total earned</div>
              <div className="stat-value" style={{fontSize:18,color:'#22c55e'}}>{fmt(totalEarned)}</div>
            </div>
            <div className="stat-card" style={{padding:'12px 14px'}}>
              <div className="stat-label">Total bonuses</div>
              <div className="stat-value" style={{fontSize:18,color:'#4ade80'}}>{fmt(totalBonuses)}</div>
            </div>
            <div className="stat-card" style={{padding:'12px 14px'}}>
              <div className="stat-label">Periods worked</div>
              <div className="stat-value" style={{fontSize:18}}>{history.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-header"><span className="table-title">Earnings history — all periods</span></div>
        <div className="table-scroll">
          <table>
            <thead><tr>
              <th>Period</th><th className="r">Net sales</th><th className="r">Earnings</th>
              <th className="r">Bonus</th><th className="r">Penalty</th><th className="r">Advance</th><th className="r">Net owed</th>
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan={7} style={{textAlign:'center',padding:30,color:'#64748b'}}>Loading...</td></tr>}
              {!loading && history.length === 0 && (
                <tr><td colSpan={7} style={{textAlign:'center',padding:30,color:'#64748b'}}>No earnings history yet</td></tr>
              )}
              {history.map(e => (
                <tr key={e.id}>
                  <td>
                    <div style={{fontWeight:600}}>{e.payroll_periods?.name || 'Unknown'}</div>
                    {e.payroll_periods?.start_date && (
                      <div style={{fontSize:11,color:'#64748b'}}>
                        {format(new Date(e.payroll_periods.start_date),'MMM d')} – {format(new Date(e.payroll_periods.end_date),'MMM d')}
                      </div>
                    )}
                  </td>
                  <td className="r">{fmt(e.net_sales)}</td>
                  <td className="r" style={{color:'#22c55e',fontWeight:600}}>{fmt(e.earnings)}</td>
                  <td className="r" style={{color:'#4ade80'}}>{e.bonus > 0 ? fmt(e.bonus) : '—'}</td>
                  <td className="r" style={{color:'#f87171'}}>{e.penalty > 0 ? '-'+fmt(e.penalty) : '—'}</td>
                  <td className="r" style={{color:'#fcd34d'}}>{e.advance > 0 ? '-'+fmt(e.advance) : '—'}</td>
                  <td className="r" style={{fontWeight:700,color:'#22c55e'}}>{fmt(e.net_owed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
