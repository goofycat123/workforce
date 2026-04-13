import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import * as XLSX from 'xlsx'
import { adjustmentForPeriod, findAdjustmentRow } from '../lib/earningsAdjustments'

function fmt(n) { return '$' + Number(n||0).toFixed(2) }

export default function Admin() {
  const { profile } = useAuth()
  const [tab, setTab]           = useState('entry')
  const [periods, setPeriods]   = useState([])
  const [employees, setEmployees] = useState([])
  const [earnings, setEarnings] = useState([])
  const [allSales, setAllSales] = useState([])
  const [periodFilter, setPeriodFilter] = useState(() => { const n=new Date(),y=n.getFullYear(),m=n.getMonth()+1,d=n.getDate(); return `${y}-${m}-${d<=15?'first':'second'}` })
  const [loading, setLoading]   = useState(true)
  const [msg, setMsg]           = useState(null)

  // Quick entry form
  const [qName, setQName]       = useState('')
  const [qSales, setQSales]     = useState('')
  const [qHours, setQHours]     = useState('')
  const [saving, setSaving]     = useState(false)

  // New period form
  const [pName, setPName]       = useState('')
  const [pStart, setPStart]     = useState('')
  const [pEnd, setPEnd]         = useState('')

  // New employee form
  const [eName, setEName]       = useState('')
  const [eEmail, setEEmail]     = useState('')
  const [ePass, setEPass]       = useState('')
  const [eRole, setERole]       = useState('chatter')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: ps }, { data: emps }, { data: sales }, { data: earns }] = await Promise.all([
      supabase.from('payroll_periods').select('*').order('created_at',{ascending:false}),
      supabase.from('profiles').select('*').order('name'),
      supabase.from('sales_entries').select('user_id,net_sales,earnings,date'),
      supabase.from('earnings').select('*'),
    ])
    setPeriods(ps || [])
    setEmployees(emps || [])

    setEarnings(earns || [])
    setAllSales(sales || [])
    setLoading(false)
  }

  async function createPeriod(e) {
    e.preventDefault(); setMsg(null)
    const { error } = await supabase.from('payroll_periods').insert({ name: pName, start_date: pStart, end_date: pEnd })
    if (error) setMsg({ type:'error', text: error.message })
    else { setMsg({ type:'success', text: 'Period created!' }); setPName(''); setPStart(''); setPEnd(''); await loadAll() }
  }

  async function closePeriod(id) {
    if (!confirm('Close this period? This cannot be undone.')) return
    await supabase.from('payroll_periods').update({ status:'closed' }).eq('id', id)
    await loadAll()
  }

  async function createEmployee(e) {
    e.preventDefault(); setMsg(null)
    const { error } = await supabase.auth.admin?.createUser
      ? null // admin SDK not available client-side
      : { error: null }

    // Use signUp instead (user will get email confirmation)
    const { error: err } = await supabase.auth.signUp({
      email: eEmail, password: ePass,
      options: { data: { name: eName, role: eRole } }
    })
    if (err) setMsg({ type:'error', text: err.message })
    else { setMsg({ type:'success', text: `Account created for ${eName}. They'll receive a confirmation email.` }); setEName(''); setEEmail(''); setEPass('') ; await loadAll() }
  }

  async function saveQuickEntry() {
    if (!qName || !qSales) return
    setSaving(true); setMsg(null)
    const ns = parseFloat(qSales) || 0
    await supabase.from('sales_entries').insert({
      user_id: qName,
      net_sales: ns,
      note: qHours ? `hours:${qHours}` : null,
      date: format(new Date(), 'yyyy-MM-dd'),
    })
    setQName(''); setQSales(''); setQHours('')
    setMsg({ type:'success', text: 'Saved!' })
    await loadAll()
    setSaving(false)
  }

  async function upsertEarning(userId, field, value) {
    if (periodFilter === 'all') return
    const existing = findAdjustmentRow(earnings, userId, periodFilter)
    if (existing) {
      await supabase.from('earnings').update({ [field]: +value, updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await supabase.from('earnings').insert({
        user_id: userId,
        payout_period_key: periodFilter,
        [field]: +value,
      })
    }
    await loadAll()
  }

  // ODS Sync
  const fileRef = useRef(null)
  const [syncResults, setSyncResults] = useState([]) // [{sheet, netSales, totalDue}]
  const [syncing, setSyncing] = useState(false)

  function scrapeSheet(ws) {
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true })
    let netSales = 0, totalDue = 0
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r]
      if (!Array.isArray(row)) continue
      for (let c = 0; c < row.length; c++) {
        const v = row[c]
        if (typeof v !== 'string') continue
        const low = v.toLowerCase().replace(/\s+/g,' ').trim()
        // value is in the cell directly below the label
        const below = rows[r+1]?.[c]
        const num = typeof below === 'number' && below > 0 ? below
          : typeof below === 'string' ? parseFloat(below.replace(/[^0-9.]/g,'')) || 0 : 0
        if (num <= 0) continue
        if (low.includes('net sales') && num > netSales) netSales = num
        if (low.includes('total due') && low.includes('chatter')) totalDue = num
      }
    }
    return { netSales, totalDue }
  }

  async function syncODS(file) {
    if (!file) return
    setSyncing(true); setSyncResults([])
    try {
      const buf = await file.arrayBuffer()
      const wb  = XLSX.read(buf, { type: 'array' })
      const results = wb.SheetNames
        .map(name => ({ sheet: name, ...scrapeSheet(wb.Sheets[name]) }))
        .filter(r => r.netSales > 0 || r.totalDue > 0)
      setSyncResults(results)

      // Upsert all to DB
      for (const r of results) {
        await supabase.from('period_snapshots').upsert({
          period_name: r.sheet,
          net_sales:   r.netSales,
          total_due:   r.totalDue,
          updated_at:  new Date().toISOString(),
        }, { onConflict: 'period_name' })
      }
    } catch (err) {
      setSyncResults([{ sheet: 'Error', netSales: 0, totalDue: 0 }])
    }
    setSyncing(false)
  }

  const TABS = [
    { key:'entry',     label:'Quick Entry' },
    { key:'earnings',  label:'Earnings' },
    { key:'employees', label:'Employees' },
  ]

  // Filter sales by 15-day period
  const filteredSales = allSales.filter(s => {
    if (periodFilter === 'all') return true
    const d = new Date(s.date)
    const half = periodFilter.split('-')
    return d.getFullYear() === +half[0] && d.getMonth()+1 === +half[1] && (periodFilter.endsWith('first') ? d.getDate() <= 15 : d.getDate() > 15)
  })
  const filteredByUser = {}
  for (const s of filteredSales) {
    if (!filteredByUser[s.user_id]) filteredByUser[s.user_id] = { net_sales: 0, earnings: 0 }
    filteredByUser[s.user_id].net_sales += +s.net_sales
    filteredByUser[s.user_id].earnings  += +s.earnings
  }

  const periodOptions = []
  for (let offset = 0; offset < 24; offset++) {
    const d = new Date(2026, 2 + offset, 1)
    const y = d.getFullYear(), m = d.getMonth()+1
    const mon = d.toLocaleString('default',{month:'short'})
    periodOptions.push({ key:`${y}-${m}-first`,  label:`${mon} 1–15 ${y}` })
    periodOptions.push({ key:`${y}-${m}-second`, label:`${mon} 16–end ${y}` })
  }

  return (
    <div>
      <h1 className="page-title">Admin</h1>
      <p className="page-sub">Manage periods, earnings, bonuses, and employees</p>

      {msg && <div className={`alert alert-${msg.type}`} style={{marginBottom:16}}>{msg.text}</div>}

      <div style={{display:'flex',gap:8,marginBottom:24,alignItems:'center',flexWrap:'wrap'}}>
        {TABS.map(t => (
          <button key={t.key} className={`btn btn-sm ${tab===t.key?'btn-primary':'btn-secondary'}`}
            onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
        <select className="form-input form-select" style={{marginLeft:'auto',width:'auto',padding:'4px 10px',fontSize:13}}
          value={periodFilter} onChange={e=>setPeriodFilter(e.target.value)}>
          <option value="all">All time</option>
          {periodOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </div>
      {periodFilter === 'all' && (
        <p style={{fontSize:13,color:'#94a3b8',marginBottom:20}}>
          Choose a pay period (not &ldquo;All time&rdquo;) to edit bonuses, penalties, and advances; values are stored per period tab.
        </p>
      )}

      {/* QUICK ENTRY */}
      {tab === 'entry' && (
        <div>
          <div className="card" style={{marginBottom:24}}>
            <div className="section-label" style={{marginTop:0}}>Add sales entry</div>
            {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
            <div style={{display:'flex',gap:12,alignItems:'flex-end',flexWrap:'wrap'}}>
              <div className="form-group" style={{margin:0,flex:'1 1 160px'}}>
                <label className="form-label">Employee</label>
                <select className="form-input form-select" value={qName} onChange={e=>setQName(e.target.value)}>
                  <option value="">Pick name…</option>
                  {employees.filter(e=>e.role==='chatter').map(e=>(
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{margin:0,flex:'1 1 120px'}}>
                <label className="form-label">Net sales ($)</label>
                <input className="form-input" type="number" min="0" step="0.01" placeholder="0.00"
                  value={qSales} onChange={e=>setQSales(e.target.value)} />
              </div>
              <button className="btn btn-primary" style={{marginBottom:1}} onClick={saveQuickEntry}
                disabled={!qName || !qSales || saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
            {qSales > 0 && (
              <p style={{fontSize:13,color:'var(--green)',marginTop:10}}>
                → Earnings: <strong>${(+qSales * 0.07).toFixed(2)}</strong>
              </p>
            )}
          </div>

          <div className="table-wrap">
            <div className="table-header"><span className="table-title">Who is owed what</span></div>
            <div className="table-scroll">
              <table>
                <thead><tr>
                  <th>Name</th>
                  <th className="r">Net sales</th>
                  <th className="r">Earnings (7%)</th>
                  <th className="r">Vence bonus</th>
                  <th className="r">Owner bonus</th>
                  <th className="r">Penalty</th>
                  <th className="r">Advance</th>
                  <th className="r">Net owed</th>
                </tr></thead>
                <tbody>
                  {loading && <tr><td colSpan={8} style={{textAlign:'center',padding:30,color:'#64748b'}}>Loading…</td></tr>}
                  {!loading && employees.filter(e=>e.role==='chatter').map(emp => {
                    const s = filteredByUser[emp.id] || { net_sales: 0, earnings: 0 }
                    const e = adjustmentForPeriod(earnings, emp.id, periodFilter)
                    const netOwed = s.earnings + (+e.vence_bonus||0) - (+e.penalty||0) - (+e.advance||0)
                    if (s.net_sales === 0 && !e.vence_bonus && !e.owner_bonus && !e.penalty && !e.advance) return null
                    const periodEdit = periodFilter !== 'all'
                    return (
                      <tr key={emp.id}>
                        <td style={{fontWeight:600}}>{emp.name}</td>
                        <td className="r">{fmt(s.net_sales)}</td>
                        <td className="r" style={{color:'#22c55e',fontWeight:600}}>{fmt(s.earnings)}</td>
                        <td className="r">
                          <input type="number" min="0" step="0.01" key={`vb-${emp.id}-${periodFilter}`} defaultValue={e.vence_bonus||''}
                            className="table-input" style={{color:'var(--green-t)'}} disabled={!periodEdit}
                            onBlur={ev => upsertEarning(emp.id,'vence_bonus',ev.target.value||0)} />
                        </td>
                        <td className="r">
                          <input type="number" min="0" step="0.01" key={`ob-${emp.id}-${periodFilter}`} defaultValue={e.owner_bonus||''}
                            className="table-input" style={{color:'var(--purple)'}} disabled={!periodEdit}
                            onBlur={ev => upsertEarning(emp.id,'owner_bonus',ev.target.value||0)} />
                        </td>
                        <td className="r">
                          <input type="number" min="0" step="0.01" key={`pe-${emp.id}-${periodFilter}`} defaultValue={e.penalty||''}
                            className="table-input" style={{color:'var(--red)'}} disabled={!periodEdit}
                            onBlur={ev => upsertEarning(emp.id,'penalty',ev.target.value||0)} />
                        </td>
                        <td className="r">
                          <input type="number" min="0" step="0.01" key={`ad-${emp.id}-${periodFilter}`} defaultValue={e.advance||''}
                            className="table-input" style={{color:'var(--amber)'}} disabled={!periodEdit}
                            onBlur={ev => upsertEarning(emp.id,'advance',ev.target.value||0)} />
                        </td>
                        <td className="r" style={{fontWeight:700,color:netOwed>=0?'#22c55e':'#f87171'}}>{fmt(netOwed)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                {!loading && (
                  <tfoot><tr className="tfoot-row">
                    <td>Total</td>
                    <td className="r" style={{color:'#22c55e'}}>{fmt(Object.values(filteredByUser).reduce((s,x)=>s+x.net_sales,0))}</td>
                    <td className="r" style={{color:'#22c55e'}}>{fmt(Object.values(filteredByUser).reduce((s,x)=>s+x.earnings,0))}</td>
                    <td></td><td></td><td></td><td></td>
                    <td className="r" style={{color:'#22c55e'}}>{fmt(
                      employees.filter(e=>e.role==='chatter').reduce((sum,emp) => {
                        const s = filteredByUser[emp.id] || { earnings: 0 }
                        const e = adjustmentForPeriod(earnings, emp.id, periodFilter)
                        return sum + s.earnings + (+e.vence_bonus||0) - (+e.penalty||0) - (+e.advance||0)
                      }, 0)
                    )}</td>
                  </tr></tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PERIODS */}
      {tab === 'periods' && (
        <div className="grid-2">
          <div className="card">
            <div className="section-label" style={{marginTop:0}}>Create pay period</div>
            <form onSubmit={createPeriod}>
              <div className="form-group">
                <label className="form-label">Period name</label>
                <input className="form-input" placeholder="e.g. March 16–27" value={pName} onChange={e=>setPName(e.target.value)} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start date</label>
                  <input className="form-input" type="date" value={pStart} onChange={e=>setPStart(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">End date</label>
                  <input className="form-input" type="date" value={pEnd} onChange={e=>setPEnd(e.target.value)} required />
                </div>
              </div>
              <button className="btn btn-primary" type="submit" style={{width:'100%',justifyContent:'center'}}>Create period</button>
            </form>
          </div>

          <div className="table-wrap">
            <div className="table-header"><span className="table-title">All periods</span></div>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Name</th><th>Dates</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {periods.map(p => (
                    <tr key={p.id}>
                      <td style={{fontWeight:600}}>{p.name}</td>
                      <td style={{color:'#64748b',fontSize:12}}>{format(new Date(p.start_date),'MMM d')} – {format(new Date(p.end_date),'MMM d')}</td>
                      <td><span className={`badge ${p.status==='open'?'badge-green':'badge-gray'}`}>{p.status}</span></td>
                      <td>{p.status==='open' && <button className="btn btn-danger btn-sm" onClick={()=>closePeriod(p.id)}>Close</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EARNINGS */}
      {tab === 'earnings' && (
        <div>
              <div className="table-wrap">
                <div className="table-header"><span className="table-title">Earnings</span></div>
                <div className="table-scroll">
                  <table>
                    <thead><tr>
                      <th>Employee</th>
                      <th className="r">Net sales</th>
                      <th className="r">Earnings (7%)</th>
                      <th className="r">Vence bonus</th>
                      <th className="r">Owner bonus</th>
                      <th className="r">Penalty ($)</th>
                      <th className="r">Advance ($)</th>
                      <th className="r">Net owed</th>
                    </tr></thead>
                    <tbody>
                      {employees.filter(e=>e.role==='chatter').map(emp => {
                        const s = filteredByUser[emp.id] || { net_sales: 0, earnings: 0 }
                        const e = adjustmentForPeriod(earnings, emp.id, periodFilter)
                        const netOwed = s.earnings + (+e.vence_bonus||0) - (+e.penalty||0) - (+e.advance||0)
                        const periodEdit = periodFilter !== 'all'
                        return (
                          <tr key={emp.id}>
                            <td style={{fontWeight:600}}>{emp.name}</td>
                            <td className="r" style={{color:'#94a3b8'}}>{fmt(s.net_sales)}</td>
                            <td className="r" style={{color:'#22c55e',fontWeight:600}}>{fmt(s.earnings)}</td>
                            <td className="r">
                              <input type="number" min="0" step="0.01" key={`evb-${emp.id}-${periodFilter}`} defaultValue={e.vence_bonus||''}
                                className="table-input" style={{color:'var(--green-t)'}} disabled={!periodEdit}
                                onBlur={ev => upsertEarning(emp.id,'vence_bonus',ev.target.value||0)} />
                            </td>
                            <td className="r">
                              <input type="number" min="0" step="0.01" key={`eob-${emp.id}-${periodFilter}`} defaultValue={e.owner_bonus||''}
                                className="table-input" style={{color:'var(--purple)'}} disabled={!periodEdit}
                                onBlur={ev => upsertEarning(emp.id,'owner_bonus',ev.target.value||0)} />
                            </td>
                            <td className="r">
                              <input type="number" min="0" step="0.01" key={`epe-${emp.id}-${periodFilter}`} defaultValue={e.penalty||''}
                                className="table-input" style={{color:'var(--red)'}} disabled={!periodEdit}
                                onBlur={ev => upsertEarning(emp.id,'penalty',ev.target.value||0)} />
                            </td>
                            <td className="r">
                              <input type="number" min="0" step="0.01" key={`ead-${emp.id}-${periodFilter}`} defaultValue={e.advance||''}
                                className="table-input" style={{color:'var(--amber)'}} disabled={!periodEdit}
                                onBlur={ev => upsertEarning(emp.id,'advance',ev.target.value||0)} />
                            </td>
                            <td className="r" style={{fontWeight:700,color: netOwed>=0?'#22c55e':'#f87171'}}>{fmt(netOwed)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
        </div>
      )}

      {/* EMPLOYEES */}
      {tab === 'employees' && (
        <div className="grid-2">
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {/* ── Quick add chatter (name only) ── */}
            <div className="card">
              <div className="section-label" style={{marginTop:0}}>Quick add chatter</div>
              <p style={{fontSize:12,color:'#64748b',marginBottom:12,marginTop:0}}>No email needed — just a display name.</p>
              <form onSubmit={async e => {
                e.preventDefault(); setMsg(null)
                if (!eName.trim()) return
                const { error } = await supabase.from('profiles').insert({
                  id: crypto.randomUUID(),
                  name: eName.trim(),
                  email: `${eName.trim().toLowerCase().replace(/\s+/g,'-')}@workforce.internal`,
                  role: 'chatter',
                })
                if (error) setMsg({ type:'error', text: error.message })
                else { setMsg({ type:'success', text: `${eName} added as chatter!` }); setEName(''); await loadAll() }
              }}>
                <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
                  <div className="form-group" style={{margin:0,flex:1}}>
                    <label className="form-label">Name</label>
                    <input className="form-input" placeholder="Ixoracee" value={eName} onChange={e=>setEName(e.target.value)} required />
                  </div>
                  <button className="btn btn-primary" type="submit" style={{marginBottom:1}}>Add</button>
                </div>
              </form>
            </div>

            {/* ── Full account (with email/login) ── */}
            <div className="card">
              <div className="section-label" style={{marginTop:0}}>Create login account</div>
              <p style={{fontSize:12,color:'#64748b',marginBottom:12,marginTop:0}}>For managers/owners or chatters who need to log in.</p>
              <form onSubmit={createEmployee}>
                <div className="form-group">
                  <label className="form-label">Full name</label>
                  <input className="form-input" placeholder="Pat Smith" value={eName} onChange={e=>setEName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" placeholder="pat@example.com" value={eEmail} onChange={e=>setEEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Temporary password</label>
                  <input className="form-input" type="password" placeholder="min 6 chars" value={ePass} onChange={e=>setEPass(e.target.value)} required minLength={6} />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-input form-select" value={eRole} onChange={e=>setERole(e.target.value)}>
                    <option value="chatter">Chatter</option>
                    <option value="manager">Manager</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>
                <button className="btn btn-primary" type="submit" style={{width:'100%',justifyContent:'center'}}>Create account</button>
              </form>
            </div>
          </div>

          <div className="table-wrap">
            <div className="table-header"><span className="table-title">All employees ({employees.length})</span></div>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
                <tbody>
                  {employees.map(e => (
                    <tr key={e.id}>
                      <td>
                        <div className="name-cell">
                          <div className="avatar" style={{background:'#14532d44',color:'#4ade80',width:28,height:28,fontSize:10}}>
                            {e.name?.slice(0,2).toUpperCase()}
                          </div>
                          {e.name}
                        </div>
                      </td>
                      <td style={{color:'#64748b',fontSize:12}}>{e.email}</td>
                      <td><span className={`badge ${e.role==='owner'?'badge-purple':e.role==='manager'?'badge-blue':'badge-gray'}`}>{e.role}</span></td>
                      <td style={{color:'#64748b',fontSize:12}}>{format(new Date(e.created_at),'MMM d, yyyy')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
