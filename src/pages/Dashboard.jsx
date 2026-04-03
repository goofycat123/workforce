import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { adjustmentForPeriod } from '../lib/earningsAdjustments'

function fmt(n) { return '$' + Number(n||0).toFixed(2) }

function parseDate(raw) {
  if (!raw) return null
  const m = raw.trim().match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?$/)
  if (m) return `${m[3]||'2026'}-${String(+m[2]).padStart(2,'0')}-${String(+m[1]).padStart(2,'0')}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return raw.trim()
  return null
}

const CM_DEFAULTS = [
  { name: 'Habibi', pct: 2 },
  { name: 'Sprite', pct: 1 },
  { name: 'Cale',   pct: 1 },
]

export default function Dashboard() {
  const { profile } = useAuth()
  const [employees, setEmps]   = useState([])
  const [sales,     setSales]  = useState([])
  const [adjusts,   setAdj]    = useState([])
  const [loading,   setLoading] = useState(true)
  const [period,    setPeriod]  = useState(() => { const n=new Date(),y=n.getFullYear(),m=n.getMonth()+1,d=n.getDate(); return `${y}-${m}-${d<=15?'first':'second'}` })
  const [tab,       setTab]     = useState('entries')
  const [cms,       setCms]     = useState(CM_DEFAULTS)

  // Entry form
  const [eName,   setEName]  = useState('')
  const [eDate,   setEDate]  = useState('')
  const [eSales,  setESales] = useState('')
  const [saving,  setSaving] = useState(false)
  const [msg,     setMsg]    = useState(null)

  const isOwner = profile?.role === 'owner'

  useEffect(() => { if (profile) load() }, [profile])

  async function load() {
    setLoading(true)
    const [{ data: emps }, { data: s }, { data: e }] = await Promise.all([
      supabase.from('profiles').select('id,name,role').order('name'),
      supabase.from('sales_entries').select('id,user_id,net_sales,earnings,date,note,created_at').order('date',{ascending:false}).order('created_at',{ascending:false}).limit(500),
      supabase.from('earnings').select('*'),
    ])
    setEmps(emps || [])
    setSales(s || [])
    setAdj(e || [])
    setLoading(false)
  }

  async function submitEntry(ev) {
    ev.preventDefault()
    const date = parseDate(eDate)
    if (!eName || !eSales || !date) { setMsg({ type:'error', text:'Fill all fields. Date format: 27.3' }); return }
    setSaving(true); setMsg(null)
    const { error } = await supabase.from('sales_entries').insert({
      user_id:   eName,
      net_sales: +eSales,
      date,
      note: null,
    })
    if (error) setMsg({ type:'error', text: error.message })
    else { setMsg({ type:'success', text: 'Saved!' }); setEDate(''); setESales(''); await load() }
    setSaving(false)
  }

  const periodOptions = [{ key:'all', label:'All time' }]
  for (let offset = 0; offset < 24; offset++) {
    const d = new Date(2026, 2 + offset, 1)
    const y = d.getFullYear(), m = d.getMonth()+1
    const mon = d.toLocaleString('default',{month:'short'})
    periodOptions.push({ key:`${y}-${m}-first`,  label:`${mon} 1–15 ${y}` })
    periodOptions.push({ key:`${y}-${m}-second`, label:`${mon} 16–end ${y}` })
  }

  const filtered = sales.filter(s => {
    if (period === 'all') return true
    const d = new Date(s.date), parts = period.split('-')
    return d.getFullYear()===+parts[0] && d.getMonth()+1===+parts[1] &&
      (period.endsWith('first') ? d.getDate()<=15 : d.getDate()>15)
  })

  const byUser = {}
  for (const s of filtered) {
    if (!byUser[s.user_id]) byUser[s.user_id] = { net_sales:0, earnings:0 }
    byUser[s.user_id].net_sales += +s.net_sales
    byUser[s.user_id].earnings  += +s.earnings
  }

  const totalNS  = Object.values(byUser).reduce((s,x)=>s+x.net_sales, 0)
  const chatters = employees.filter(e => e.role==='chatter' && byUser[e.id])
  const chatterGross = chatters.reduce((sum,emp) => {
    const a = adjustmentForPeriod(adjusts, emp.id, period)
    return sum + byUser[emp.id].earnings + (+a.vence_bonus||0)
  }, 0)
  const grandTotal = chatterGross + totalNS * 0.04

  const nameMap = Object.fromEntries(employees.map(e=>[e.id,e.name]))

  // CM totals — cumulative across all time (not period filtered)
  const cmTotals = {}
  for (const s of sales) {
    if (!cmTotals[s.user_id]) cmTotals[s.user_id] = 0
    cmTotals[s.user_id] += +s.net_sales
  }
  const allTimeNS = Object.values(cmTotals).reduce((s,x)=>s+x, 0)

  if (loading) return <div style={{padding:40,color:'#64748b'}}>Loading…</div>

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24,flexWrap:'wrap'}}>
        <h1 className="page-title" style={{margin:0}}>Dashboard</h1>
        <div style={{display:'flex',gap:8}}>
          <button className={`btn btn-sm ${tab==='entries'?'btn-primary':'btn-secondary'}`} onClick={()=>setTab('entries')}>Entries</button>
          <button className={`btn btn-sm ${tab==='cms'?'btn-primary':'btn-secondary'}`} onClick={()=>setTab('cms')}>CM Earnings</button>
        </div>
        <select className="form-input form-select"
          style={{marginLeft:'auto',width:'auto',padding:'4px 10px',fontSize:13}}
          value={period} onChange={e=>setPeriod(e.target.value)}>
          {periodOptions.map(o=><option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </div>

      {tab === 'entries' && (
        <>
          {/* ENTRY FORM — owner only */}
          {isOwner && (
            <div className="card" style={{marginBottom:24}}>
              <div className="section-label" style={{marginTop:0}}>Log sales entry</div>
              {msg && <div className={`alert alert-${msg.type}`} style={{marginBottom:12}}>{msg.text}</div>}
              <form onSubmit={submitEntry} style={{display:'flex',gap:12,alignItems:'flex-end',flexWrap:'wrap'}}>
                <div className="form-group" style={{margin:0,flex:'1 1 150px'}}>
                  <label className="form-label">Chatter</label>
                  <select className="form-input form-select" value={eName} onChange={e=>setEName(e.target.value)} required>
                    <option value="">Pick…</option>
                    {employees.filter(e=>e.role==='chatter').map(e=>(
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{margin:0,flex:'1 1 100px'}}>
                  <label className="form-label">Date (27.3)</label>
                  <input className="form-input" placeholder="27.3" value={eDate}
                    onChange={e=>setEDate(e.target.value)} required />
                </div>
                <div className="form-group" style={{margin:0,flex:'1 1 120px'}}>
                  <label className="form-label">NET Sales ($)</label>
                  <input className="form-input" type="number" min="0" step="0.01"
                    placeholder="0.00" value={eSales} onChange={e=>setESales(e.target.value)} required />
                </div>
                <button className="btn btn-primary" type="submit" disabled={saving}
                  style={{marginBottom:1}}>{saving?'Saving…':'Add'}</button>
              </form>
            </div>
          )}

          {/* STATS */}
          {isOwner && (
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
              <div className="stat-card">
                <div className="stat-label">NET Sales</div>
                <div className="stat-value" style={{color:'#22c55e'}}>{fmt(totalNS)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Chatters gross</div>
                <div className="stat-value" style={{color:'#22c55e'}}>{fmt(chatterGross)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Due</div>
                <div className="stat-value" style={{color:'#f59e0b'}}>{fmt(grandTotal)}</div>
              </div>
            </div>
          )}

          {/* ENTRIES TABLE */}
          <div className="table-wrap">
            <div className="table-header"><span className="table-title">
              {period==='all' ? 'All entries' : `Entries — ${periodOptions.find(o=>o.key===period)?.label}`}
            </span></div>
            <div className="table-scroll">
              <table>
                <thead><tr>
                  {isOwner && <th>Chatter</th>}
                  <th>Date</th>
                  <th className="r">NET Sales</th>
                  <th className="r">Earnings (7%)</th>
                </tr></thead>
                <tbody>
                  {filtered.length===0 && (
                    <tr><td colSpan={4} style={{textAlign:'center',padding:30,color:'#64748b'}}>No entries</td></tr>
                  )}
                  {filtered.map(s=>(
                    <tr key={s.id}>
                      {isOwner && <td style={{fontWeight:600}}>{nameMap[s.user_id]||'—'}</td>}
                      <td style={{color:'#94a3b8'}}>{s.date}</td>
                      <td className="r" style={{fontWeight:600}}>{fmt(s.net_sales)}</td>
                      <td className="r" style={{color:'#22c55e'}}>{fmt(s.earnings)}</td>
                    </tr>
                  ))}
                </tbody>
                {filtered.length>0 && (
                  <tfoot><tr className="tfoot-row">
                    {isOwner && <td></td>}
                    <td>Total</td>
                    <td className="r" style={{color:'#22c55e'}}>{fmt(totalNS)}</td>
                    <td className="r" style={{color:'#22c55e'}}>{fmt(filtered.reduce((s,x)=>s+ +x.earnings,0))}</td>
                  </tr></tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'cms' && (
        <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
            <div className="stat-card">
              <div className="stat-label">NET Sales ({period==='all'?'All time':periodOptions.find(o=>o.key===period)?.label})</div>
              <div className="stat-value" style={{color:'#22c55e'}}>{fmt(totalNS)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total CM Cut</div>
              <div className="stat-value" style={{color:'#a78bfa'}}>{fmt(cms.reduce((s,c)=>s+totalNS*c.pct/100,0))}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">All-time NET Sales</div>
              <div className="stat-value" style={{color:'#64748b',fontSize:22}}>{fmt(allTimeNS)}</div>
            </div>
          </div>

          <div className="table-wrap">
            <div className="table-header"><span className="table-title">CM Earnings — {period==='all'?'All time':periodOptions.find(o=>o.key===period)?.label}</span></div>
            <div className="table-scroll">
              <table>
                <thead><tr>
                  <th>Name</th>
                  <th className="r">%</th>
                  <th className="r">This period</th>
                  <th className="r">All time</th>
                </tr></thead>
                <tbody>
                  {cms.map((c,i) => (
                    <tr key={i}>
                      <td>
                        <input value={c.name}
                          onChange={e=>{const n=[...cms];n[i]={...n[i],name:e.target.value};setCms(n)}}
                          style={{background:'transparent',border:'none',color:'#fff',fontWeight:600,width:100}} />
                      </td>
                      <td className="r">
                        <input type="number" value={c.pct} min="0" step="0.5"
                          onChange={e=>{const n=[...cms];n[i]={...n[i],pct:+e.target.value};setCms(n)}}
                          className="table-input" style={{width:60}} />
                        <span style={{color:'#64748b',marginLeft:4}}>%</span>
                      </td>
                      <td className="r" style={{fontWeight:700,color:'#a78bfa'}}>{fmt(totalNS * c.pct / 100)}</td>
                      <td className="r" style={{color:'#64748b'}}>{fmt(allTimeNS * c.pct / 100)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="tfoot-row">
                  <td colSpan={2}>Total</td>
                  <td className="r" style={{color:'#a78bfa',fontWeight:800}}>{fmt(cms.reduce((s,c)=>s+totalNS*c.pct/100,0))}</td>
                  <td className="r" style={{color:'#64748b'}}>{fmt(cms.reduce((s,c)=>s+allTimeNS*c.pct/100,0))}</td>
                </tr></tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
