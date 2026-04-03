import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { adjustmentForPeriod, findAdjustmentRow } from '../lib/earningsAdjustments'

function fmt(n) { return '$' + Number(n||0).toFixed(2) }

const CM_DEFAULTS = [
  { name: 'Pera',  pct: 2 },
  { name: 'Welja', pct: 1 },
  { name: 'Cale',  pct: 1 },
]

const CM_PAID_STORAGE = 'cm_paid_by_period'

function loadCmPaidByPeriod() {
  try {
    const v2 = JSON.parse(localStorage.getItem(CM_PAID_STORAGE) || '{}')
    if (v2 && typeof v2 === 'object' && Object.keys(v2).length) return v2
  } catch { /* ignore */ }
  return {}
}

export default function Payouts() {
  const [employees, setEmployees] = useState([])
  const [allSales,  setAllSales]  = useState([])
  const [adjusts,   setAdjusts]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [periodFilter, setPeriodFilter] = useState(() => {
    const now = new Date()
    const y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate()
    return `${y}-${m}-${d <= 15 ? 'first' : 'second'}`
  })
  const [cms, setCms] = useState(CM_DEFAULTS)
  const [cmPaidByPeriod, setCmPaidByPeriod] = useState(loadCmPaidByPeriod)
  const [tab, setTab] = useState('overview')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [{ data: emps }, { data: sales }, { data: earns }] = await Promise.all([
      supabase.from('profiles').select('id,name,role').order('name'),
      supabase.from('sales_entries').select('user_id,net_sales,earnings,date'),
      supabase.from('earnings').select('*'),
    ])
    setEmployees(emps || [])
    setAllSales(sales || [])
    setAdjusts(earns || [])
    setLoading(false)
  }

  async function togglePaid(emp_id) {
    if (periodFilter === 'all') return
    const existing = findAdjustmentRow(adjusts, emp_id, periodFilter)
    const newVal = !(existing?.paid)
    if (!existing) {
      const { data, error } = await supabase.from('earnings').insert([
        { user_id: emp_id, paid: newVal, payout_period_key: periodFilter }
      ]).select()
      if (!error && data?.length) setAdjusts([...adjusts, data[0]])
    } else {
      await supabase.from('earnings').update({ paid: newVal }).eq('id', existing.id)
      setAdjusts(adjusts.map(a => a.id === existing.id ? {...a, paid: newVal} : a))
    }
  }

  function toggleCmPaid(i) {
    if (periodFilter === 'all') return
    const prev = cmPaidByPeriod[periodFilter] || {}
    const nextPeriod = { ...prev, [i]: !prev[i] }
    const updated = { ...cmPaidByPeriod, [periodFilter]: nextPeriod }
    setCmPaidByPeriod(updated)
    localStorage.setItem(CM_PAID_STORAGE, JSON.stringify(updated))
  }

  async function updateAdjustment(emp_id, field, value) {
    if (periodFilter === 'all') return
    const existing = findAdjustmentRow(adjusts, emp_id, periodFilter)
    const numValue = +value || 0

    if (!existing) {
      const { data, error } = await supabase.from('earnings').insert([
        { user_id: emp_id, payout_period_key: periodFilter, [field]: numValue }
      ]).select()

      if (!error && data?.length) {
        setAdjusts([...adjusts, data[0]])
      }
    } else {
      await supabase.from('earnings')
        .update({ [field]: numValue })
        .eq('id', existing.id)

      const updated = adjusts.map(a =>
        a.id === existing.id ? {...a, [field]: numValue} : a
      )
      setAdjusts(updated)
    }
  }



  // Pre-built 2-year period options
  const periodOptions = []
  for (let offset = 0; offset < 24; offset++) {
    const d = new Date(2026, 2 + offset, 1) // starts Mar 2026
    const y = d.getFullYear(), m = d.getMonth()+1
    const mon = d.toLocaleString('default',{month:'short'})
    periodOptions.push({ key:`${y}-${m}-first`,  label:`${mon} 1–15 ${y}` })
    periodOptions.push({ key:`${y}-${m}-second`, label:`${mon} 16–end ${y}` })
  }

  const filtered = allSales.filter(s => {
    if (periodFilter === 'all') return true
    const d = new Date(s.date)
    const parts = periodFilter.split('-')
    return d.getFullYear() === +parts[0] && d.getMonth()+1 === +parts[1] &&
      (periodFilter.endsWith('first') ? d.getDate() <= 15 : d.getDate() > 15)
  })

  const byUser = {}
  for (const s of filtered) {
    if (!byUser[s.user_id]) byUser[s.user_id] = { net_sales: 0, earnings: 0 }
    byUser[s.user_id].net_sales += +s.net_sales
    byUser[s.user_id].earnings  += +s.earnings
  }

  const chatters = employees.filter(e => e.role === 'chatter' && byUser[e.id])
  const totalNetSales = Object.values(byUser).reduce((s,x) => s+x.net_sales, 0)
  const totalCMs = cms.reduce((s,c) => s + totalNetSales * c.pct / 100, 0)

  // Total Due = what partner owes (earnings + vence bonuses + CM cuts)
  // Advances/penalties are post-invoice deductions — partner doesn't pay for those
  const chatterGross = chatters.reduce((sum, emp) => {
    const s = byUser[emp.id]
    const a = adjustmentForPeriod(adjusts, emp.id, periodFilter)
    return sum + s.earnings + (+a.vence_bonus||0)
  }, 0)

  const totalAdvances = chatters.reduce((sum, emp) => {
    const a = adjustmentForPeriod(adjusts, emp.id, periodFilter)
    return sum + (+a.advance||0)
  }, 0)

  const totalPenalties = chatters.reduce((sum, emp) => {
    const a = adjustmentForPeriod(adjusts, emp.id, periodFilter)
    return sum + (+a.penalty||0)
  }, 0)

  const totalVenceBonus = chatters.reduce((sum, emp) => {
    const a = adjustmentForPeriod(adjusts, emp.id, periodFilter)
    return sum + (+a.vence_bonus||0)
  }, 0)

  const grandTotal = chatterGross + totalCMs

  const periodLabel = periodOptions.find(o => o.key === periodFilter)?.label || 'All time'

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24,flexWrap:'wrap'}}>
        <h1 className="page-title" style={{margin:0}}>Payouts</h1>
        <div style={{display:'flex',gap:8}}>
          <button className={`btn btn-sm ${tab==='overview'?'btn-primary':'btn-secondary'}`} onClick={()=>setTab('overview')}>Overview</button>
          <button className={`btn btn-sm ${tab==='invoice'?'btn-primary':'btn-secondary'}`} onClick={()=>setTab('invoice')}>Invoice</button>
          {tab==='invoice' && <button className="btn btn-sm btn-secondary" onClick={()=>window.print()}>Print</button>}
        </div>
        <select className="form-input form-select" style={{marginLeft:'auto',width:'auto',padding:'4px 10px',fontSize:13}}
          value={periodFilter} onChange={e=>setPeriodFilter(e.target.value)}>
          <option value="all">All time</option>
          {periodOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </div>
      {tab === 'overview' && periodFilter === 'all' && (
        <p style={{fontSize:13,color:'#94a3b8',margin:'-12px 0 20px'}}>
          Select a pay period (e.g. Mar 16–end) to edit advances, penalties, bonuses, chatter paid status, or CM cut paid status. All time view sums chatter adjustments across periods; CM paid is per period only.
        </p>
      )}

      {/* OVERVIEW — full breakdown, owner only */}
      {tab === 'overview' && (
        <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
            <div className="stat-card">
              <div className="stat-label">NET Sales</div>
              <div className="stat-value" style={{color:'#22c55e'}}>{fmt(totalNetSales)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Chatters gross</div>
              <div className="stat-value" style={{color:'#22c55e'}}>{fmt(chatterGross)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Due (inc. CM)</div>
              <div className="stat-value" style={{color:'#f59e0b'}}>{fmt(grandTotal)}</div>
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
            <div className="stat-card">
              <div className="stat-label">Vence Bonus</div>
              <div className="stat-value" style={{color:'#4ade80'}}>{fmt(totalVenceBonus)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Advance</div>
              <div className="stat-value" style={{color:'#fcd34d'}}>-{fmt(totalAdvances)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Penalty</div>
              <div className="stat-value" style={{color:'#f87171'}}>-{fmt(totalPenalties)}</div>
            </div>
          </div>

          <div className="table-wrap" style={{marginBottom:24}}>
            <div className="table-header"><span className="table-title">Chatters</span></div>
            <div className="table-scroll">
              <table>
                <thead><tr>
                  <th>Name</th>
                  <th className="r">Net sales</th>
                  <th className="r">Earnings (7%)</th>
                  <th className="r">Bonus</th>
                  <th className="r">Gross due</th>
                  <th className="r" style={{color:'#fcd34d'}}>Advance</th>
                  <th className="r" style={{color:'#f87171'}}>Penalty</th>
                  <th className="r">Net payout</th>
                  <th className="r">Status</th>
                </tr></thead>
                <tbody>
                  {loading && <tr><td colSpan={8} style={{textAlign:'center',padding:30,color:'#64748b'}}>Loading…</td></tr>}
                  {chatters.map(emp => {
                    const s = byUser[emp.id]
                    const a = adjustmentForPeriod(adjusts, emp.id, periodFilter)
                    const gross = s.earnings + (+a.vence_bonus||0)
                    const netPayout = gross + (+a.owner_bonus||0) - (+a.advance||0) - (+a.penalty||0)
                    const canEditPeriod = periodFilter !== 'all'
                    return (
                      <tr key={emp.id}>
                        <td style={{fontWeight:600}}>{emp.name}</td>
                        <td className="r">{fmt(s.net_sales)}</td>
                        <td className="r" style={{color:'#22c55e'}}>{fmt(s.earnings)}</td>
                        <td className="r">
                          <div style={{display:'flex',alignItems:'center',gap:6,justifyContent:'flex-end'}}>
                            <div style={{textAlign:'right'}}>
                              <div style={{color:'#4ade80',fontWeight:700,fontSize:13}}>{fmt((+a.vence_bonus||0)+(+a.owner_bonus||0))}</div>
                              {(+a.vence_bonus > 0 || +a.owner_bonus > 0) && (
                                <div style={{fontSize:11,color:'#64748b'}}>
                                  {+a.vence_bonus > 0 && <span style={{color:'#4ade80'}}>{fmt(+a.vence_bonus)} V</span>}
                                  {+a.vence_bonus > 0 && +a.owner_bonus > 0 && ' · '}
                                  {+a.owner_bonus > 0 && <span style={{color:'#a78bfa'}}>{fmt(+a.owner_bonus)} O</span>}
                                </div>
                              )}
                            </div>
                            <div style={{display:'flex',flexDirection:'column',gap:2}}>
                              <input type="number" min="0" step="0.01" placeholder="+V"
                                className="table-input" style={{width:52,fontSize:11,padding:'2px 4px'}}
                                disabled={!canEditPeriod}
                                onKeyDown={e=>{if(!canEditPeriod)return;if(e.key==='Enter'&&e.target.value){updateAdjustment(emp.id,'vence_bonus',(+(a.vence_bonus)||0)+(+e.target.value));e.target.value=''}}} />
                              <input type="number" min="0" step="0.01" placeholder="+O"
                                className="table-input" style={{width:52,fontSize:11,padding:'2px 4px'}}
                                disabled={!canEditPeriod}
                                onKeyDown={e=>{if(!canEditPeriod)return;if(e.key==='Enter'&&e.target.value){updateAdjustment(emp.id,'owner_bonus',(+(a.owner_bonus)||0)+(+e.target.value));e.target.value=''}}} />
                            </div>
                          </div>
                        </td>
                        <td className="r" style={{fontWeight:700,color:'#22c55e'}}>{fmt(gross)}</td>
                        <td className="r">
                          <div style={{display:'flex',alignItems:'center',gap:4,justifyContent:'flex-end'}}>
                            <span style={{color:'#fcd34d',fontWeight:600}}>{a.advance ? '-'+fmt(+a.advance) : '—'}</span>
                            <input type="number" min="0" step="0.01" placeholder="+add"
                              className="table-input" style={{width:60}}
                              disabled={!canEditPeriod}
                              onKeyDown={e=>{if(!canEditPeriod)return;if(e.key==='Enter'&&e.target.value){updateAdjustment(emp.id,'advance',(+(a.advance)||0)+(+e.target.value));e.target.value=''}}} />
                          </div>
                        </td>
                        <td className="r">
                          <div style={{display:'flex',alignItems:'center',gap:4,justifyContent:'flex-end'}}>
                            <span style={{color:'#f87171',fontWeight:600}}>{a.penalty ? '-'+fmt(+a.penalty) : '—'}</span>
                            <input type="number" min="0" step="0.01" placeholder="+add"
                              className="table-input" style={{width:60}}
                              disabled={!canEditPeriod}
                              onKeyDown={e=>{if(!canEditPeriod)return;if(e.key==='Enter'&&e.target.value){updateAdjustment(emp.id,'penalty',(+(a.penalty)||0)+(+e.target.value));e.target.value=''}}} />
                          </div>
                        </td>
                        <td className="r" style={{fontWeight:700,color:netPayout>=0?'#22c55e':'#f87171'}}>{fmt(netPayout)}</td>
                        <td className="r">
                          {canEditPeriod ? (
                            a.paid
                              ? <span onClick={()=>togglePaid(emp.id)} style={{cursor:'pointer',display:'inline-block',padding:'3px 10px',borderRadius:4,fontSize:11,fontWeight:700,letterSpacing:.5,background:'#0d2318',color:'#22c55e',border:'1px solid #16a34a'}}>SETTLED</span>
                              : <button onClick={()=>togglePaid(emp.id)} style={{padding:'3px 10px',borderRadius:4,fontSize:11,fontWeight:700,background:'#1e2a3a',color:'#94a3b8',border:'1px solid #2a3a4a',cursor:'pointer'}}>Mark Paid</button>
                          ) : (
                            <span style={{color:'#64748b',fontSize:12}}>—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot><tr className="tfoot-row">
                  <td colSpan={3}>Total</td>
                  <td></td>
                  <td className="r" style={{color:'#4ade80'}}>{fmt(totalVenceBonus + chatters.reduce((s,e)=>{const a=adjustmentForPeriod(adjusts,e.id,periodFilter);return s+(+a.owner_bonus||0)},0))}</td>
                  <td className="r" style={{color:'#22c55e'}}>{fmt(chatterGross)}</td>
                  <td className="r" style={{color:'#fcd34d'}}>{totalAdvances ? '-'+fmt(totalAdvances) : '—'}</td>
                  <td className="r" style={{color:'#f87171'}}>{totalPenalties ? '-'+fmt(totalPenalties) : '—'}</td>
                  <td className="r" style={{color:'#22c55e'}}>{fmt(chatterGross - totalAdvances - totalPenalties)}</td>
                </tr></tfoot>
              </table>
            </div>
          </div>

          <div className="table-wrap">
            <div className="table-header"><span className="table-title">CM Cuts</span></div>
            <div className="table-scroll">
              <table>
                <thead><tr>
                  <th>Name</th>
                  <th className="r">%</th>
                  <th className="r">Amount</th>
                  <th className="r">Status</th>
                </tr></thead>
                <tbody>
                  {cms.map((c,i) => (
                    <tr key={i}>
                      <td>
                        <input value={c.name} onChange={e=>{const n=[...cms];n[i]={...n[i],name:e.target.value};setCms(n)}}
                          style={{background:'transparent',border:'none',color:'#fff',fontWeight:600,width:100}} />
                      </td>
                      <td className="r">
                        <input type="number" value={c.pct} min="0" step="0.5"
                          onChange={e=>{const n=[...cms];n[i]={...n[i],pct:+e.target.value};setCms(n)}}
                          className="table-input" style={{width:60}} />
                        <span style={{color:'#64748b',marginLeft:4}}>%</span>
                      </td>
                      <td className="r" style={{fontWeight:700,color:'#22c55e'}}>{fmt(totalNetSales * c.pct / 100)}</td>
                      <td className="r">
                        {periodFilter === 'all' ? (
                          <span style={{color:'#64748b',fontSize:12}}>—</span>
                        ) : cmPaidByPeriod[periodFilter]?.[i] ? (
                          <span onClick={()=>toggleCmPaid(i)} style={{cursor:'pointer',display:'inline-block',padding:'3px 10px',borderRadius:4,fontSize:11,fontWeight:700,letterSpacing:.5,background:'#0d2318',color:'#22c55e',border:'1px solid #16a34a'}}>SETTLED</span>
                        ) : (
                          <button onClick={()=>toggleCmPaid(i)} style={{padding:'3px 10px',borderRadius:4,fontSize:11,fontWeight:700,background:'#1e2a3a',color:'#94a3b8',border:'1px solid #2a3a4a',cursor:'pointer'}}>Mark Paid</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="tfoot-row">
                  <td colSpan={2}>CM Total</td>
                  <td className="r" style={{color:'#22c55e'}}>{fmt(totalCMs)}</td>
                </tr></tfoot>
              </table>
            </div>
          </div>

          <div style={{marginTop:24,padding:'16px 20px',background:'#0f172a',borderRadius:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{color:'#64748b',fontSize:14}}>Grand Total Due</span>
            <span style={{fontSize:28,fontWeight:800,color:'#f59e0b'}}>{fmt(grandTotal)}</span>
          </div>
        </>
      )}

      {/* INVOICE — clean, no CM breakdown */}
      {tab === 'invoice' && (
        <>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:24}}>
            <div className="stat-card">
              <div className="stat-label">NET Sales — {periodLabel}</div>
              <div className="stat-value" style={{color:'#22c55e'}}>{fmt(totalNetSales)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Due</div>
              <div className="stat-value" style={{color:'#f59e0b',fontSize:28}}>{fmt(grandTotal)}</div>
            </div>
          </div>

          <div className="table-wrap">
            <div className="table-header"><span className="table-title">Breakdown</span></div>
            <div className="table-scroll">
              <table>
                <thead><tr>
                  <th>Name</th>
                  <th className="r">Total due</th>
                </tr></thead>
                <tbody>
                  {chatters.map(emp => {
                    const s = byUser[emp.id]
                    const a = adjustmentForPeriod(adjusts, emp.id, periodFilter)
                    const gross = s.earnings + (+a.vence_bonus||0)
                    return (
                      <tr key={emp.id}>
                        <td style={{fontWeight:600}}>{emp.name}</td>
                        <td className="r" style={{fontWeight:700,color:'#22c55e'}}>{fmt(gross)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot><tr className="tfoot-row">
                  <td>Chatters subtotal</td>
                  <td className="r" style={{color:'#22c55e',fontWeight:800}}>{fmt(chatterGross)}</td>
                </tr></tfoot>
              </table>
            </div>
          </div>

          <div style={{marginTop:16,background:'#0f172a',borderRadius:12,overflow:'hidden',border:'1px solid #1e293b'}}>
            <div style={{display:'flex',justifyContent:'space-between',padding:'12px 20px',borderBottom:'1px solid #1e293b'}}>
              <span style={{color:'#94a3b8',fontSize:14}}>Chatters Pay</span>
              <span style={{fontWeight:700,color:'#22c55e'}}>{fmt(chatterGross)}</span>
            </div>

            <div style={{display:'flex',justifyContent:'space-between',padding:'16px 20px'}}>
              <span style={{fontWeight:700,fontSize:15}}>Total Due</span>
              <span style={{fontWeight:800,fontSize:22,color:'#f59e0b'}}>{fmt(grandTotal)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
