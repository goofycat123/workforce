import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'

const RATE = 0.07
function fmt(n) { return '$' + Number(n||0).toFixed(2) }

export default function Sales() {
  const { profile } = useAuth()
  const [entries, setEntries]   = useState([])
  const [netSales, setNetSales] = useState('')
  const [note, setNote]         = useState('')
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState(null)

  useEffect(() => { if (profile) loadData() }, [profile])

  async function loadData() {
    setLoading(true)
    const query = supabase.from('sales_entries')
      .select('*, profiles(name)').order('date',{ascending:false}).limit(200)

    if (profile.role === 'chatter') query.eq('user_id', profile.id)

    const { data } = await query
    setEntries(data || [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!netSales || +netSales <= 0) return
    setSaving(true); setMsg(null)
    const { error } = await supabase.from('sales_entries').insert({
      user_id:  profile.id,
      net_sales: +netSales,
      note:      note || null,
      date:      format(new Date(), 'yyyy-MM-dd'),
    })
    if (error) setMsg({ type:'error', text: error.message })
    else {
      setMsg({ type:'success', text: `Logged ${fmt(+netSales)} net sales → ${fmt(+netSales * RATE)} earnings` })
      setNetSales(''); setNote('')
      await loadData()
    }
    setSaving(false)
  }

  const totalNS   = entries.reduce((s,e) => s + +e.net_sales, 0)
  const totalEarn = entries.reduce((s,e) => s + +e.earnings,  0)
  const preview   = netSales ? (+netSales * RATE).toFixed(2) : null

  return (
    <div>
      <h1 className="page-title">Sales</h1>
      <p className="page-sub">Log your net sales — earnings calculated automatically at 7%</p>

      <div className="grid-2" style={{marginBottom:24}}>
        <div className="card">
          <div className="section-label" style={{marginTop:0}}>Log net sales</div>
          {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
              <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Net sales amount ($)</label>
              <input className="form-input" type="number" min="0" step="0.01"
                placeholder="e.g. 500.00" value={netSales}
                onChange={e => setNetSales(e.target.value)} required />
              {preview && (
                <p style={{fontSize:13,color:'#22c55e',marginTop:6}}>
                  → Your earnings: <strong>${preview}</strong> (7%)
                </p>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Note (optional)</label>
              <input className="form-input" type="text" placeholder="e.g. evening session"
                value={note} onChange={e => setNote(e.target.value)} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving}
              style={{width:'100%',justifyContent:'center'}}>
              {saving ? 'Logging...' : 'Log Sales'}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="section-label" style={{marginTop:0}}>Period totals</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div className="stat-card" style={{padding:'12px 14px'}}>
              <div className="stat-label">Net sales</div>
              <div className="stat-value" style={{fontSize:20,color:'#22c55e'}}>{fmt(totalNS)}</div>
            </div>
            <div className="stat-card" style={{padding:'12px 14px'}}>
              <div className="stat-label">Your earnings</div>
              <div className="stat-value" style={{fontSize:20,color:'#22c55e'}}>{fmt(totalEarn)}</div>
            </div>
          </div>
          <div style={{marginTop:16,padding:'12px 14px',background:'#0f172a',borderRadius:8}}>
            <p style={{fontSize:12,color:'#64748b',lineHeight:1.7}}>
              Earnings = net sales × 7%<br/>
              Entries logged: {entries.length}
            </p>
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-header"><span className="table-title">Sales log</span></div>
        <div className="table-scroll">
          <table>
            <thead><tr>
              {profile.role !== 'chatter' && <th>Name</th>}
              <th>Date</th><th className="r">Net sales</th><th className="r">Earnings (7%)</th><th>Shift</th>
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan={5} style={{textAlign:'center',padding:30,color:'#64748b'}}>Loading...</td></tr>}
              {!loading && entries.length === 0 && (
                <tr><td colSpan={5} style={{textAlign:'center',padding:30,color:'#64748b'}}>No sales logged yet</td></tr>
              )}
              {entries.map(e => (
                <tr key={e.id}>
                  {profile.role !== 'chatter' && <td style={{fontWeight:600}}>{e.profiles?.name || '—'}</td>}
                  <td style={{color:'#94a3b8'}}>{e.date}</td>
                  <td className="r" style={{fontWeight:600}}>{fmt(e.net_sales)}</td>
                  <td className="r" style={{color:'#22c55e',fontWeight:700}}>{fmt(e.earnings)}</td>
                  <td style={{color:'#64748b'}}>{e.note || '—'}</td>
                </tr>
              ))}
            </tbody>
            {entries.length > 0 && (
              <tfoot><tr className="tfoot-row">
                <td>Total</td>
                <td className="r" style={{color:'#22c55e'}}>{fmt(totalNS)}</td>
                <td className="r" style={{color:'#22c55e'}}>{fmt(totalEarn)}</td>
                <td></td>
              </tr></tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
