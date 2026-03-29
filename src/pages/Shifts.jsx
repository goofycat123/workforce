import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { format, differenceInMinutes } from 'date-fns'

export default function Shifts() {
  const { profile } = useAuth()
  const [now, setNow]           = useState(new Date())
  const [openShift, setOpen]    = useState(null)
  const [shifts, setShifts]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [working, setWorking]   = useState(false)
  const [err, setErr]           = useState(null)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => { if (profile) loadData() }, [profile])

  async function loadData() {
    setLoading(true)
    const { data: open } = await supabase.from('shifts')
      .select('*').eq('user_id', profile.id).is('clock_out', null).single()
    setOpen(open || null)

    const { data: all } = await supabase.from('shifts')
      .select('*').eq('user_id', profile.id)
      .order('clock_in', { ascending: false }).limit(30)
    setShifts(all || [])
    setLoading(false)
  }

  async function clockIn() {
    setWorking(true)
    const { error } = await supabase.from('shifts').insert({
      user_id:  profile.id,
      clock_in: new Date().toISOString(),
      date:     format(new Date(), 'yyyy-MM-dd'),
    })
    if (!error) await loadData()
    setWorking(false)
  }

  async function clockOut() {
    if (!openShift) return
    setWorking(true); setErr(null)
    const { error } = await supabase.from('shifts')
      .update({ clock_out: new Date().toISOString() })
      .eq('id', openShift.id)
    if (error) setErr(error.message)
    else await loadData()
    setWorking(false)
  }

  function durStr(s) {
    if (!s.clock_out) {
      const mins = differenceInMinutes(now, new Date(s.clock_in))
      return `${Math.floor(mins/60)}h ${mins%60}m`
    }
    const mins = differenceInMinutes(new Date(s.clock_out), new Date(s.clock_in))
    return `${Math.floor(mins/60)}h ${mins%60}m`
  }

  const totalMinsThisWeek = shifts
    .filter(s => s.clock_out)
    .reduce((acc, s) => acc + differenceInMinutes(new Date(s.clock_out), new Date(s.clock_in)), 0)

  return (
    <div>
      <h1 className="page-title">Shifts</h1>
      <p className="page-sub">Clock in and out of your work sessions</p>

      <div className="grid-2" style={{marginBottom:24}}>
        <div className="clock-card">
          <div className="clock-time">{format(now, 'HH:mm:ss')}</div>
          <div className="clock-date">{format(now, 'EEEE, MMMM d, yyyy')}</div>

          {err && <div className="alert alert-error" style={{marginBottom:12}}>{err}</div>}
      {openShift ? (
            <>
              <div className="clock-status badge-green" style={{margin:'0 auto 20px'}}>
                ● Clocked in since {format(new Date(openShift.clock_in), 'HH:mm')} · {durStr(openShift)}
              </div>
              <button className="clock-out-btn" onClick={clockOut} disabled={working}>
                {working ? 'Clocking out...' : 'Clock Out'}
              </button>
            </>
          ) : (
            <>
              <div className="clock-status badge-gray" style={{margin:'0 auto 20px',color:'#64748b'}}>
                Not clocked in
              </div>
              <button className="clock-in-btn" onClick={clockIn} disabled={working}>
                {working ? 'Clocking in...' : 'Clock In'}
              </button>
            </>
          )}
        </div>

        <div className="card">
          <div className="section-label" style={{marginTop:0}}>This period summary</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
            <div className="stat-card" style={{padding:'12px 14px'}}>
              <div className="stat-label">Total shifts</div>
              <div className="stat-value" style={{fontSize:20}}>{shifts.filter(s=>s.clock_out).length}</div>
            </div>
            <div className="stat-card" style={{padding:'12px 14px'}}>
              <div className="stat-label">Total hours</div>
              <div className="stat-value" style={{fontSize:20}}>{(totalMinsThisWeek/60).toFixed(1)}h</div>
            </div>
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-header"><span className="table-title">Shift history</span></div>
        <div className="table-scroll">
          <table>
            <thead><tr>
              <th>Date</th><th>Clock in</th><th>Clock out</th><th>Duration</th><th>Status</th>
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan={5} style={{textAlign:'center',padding:30,color:'#64748b'}}>Loading...</td></tr>}
              {!loading && shifts.length === 0 && (
                <tr><td colSpan={5} style={{textAlign:'center',padding:30,color:'#64748b'}}>No shifts yet — clock in to get started</td></tr>
              )}
              {shifts.map(s => (
                <tr key={s.id}>
                  <td style={{color:'#94a3b8'}}>{format(new Date(s.clock_in),'EEE MMM d')}</td>
                  <td>{format(new Date(s.clock_in),'HH:mm')}</td>
                  <td>{s.clock_out ? format(new Date(s.clock_out),'HH:mm') : '—'}</td>
                  <td style={{fontWeight:600}}>{durStr(s)}</td>
                  <td><span className={`badge ${s.clock_out ? 'badge-gray' : 'badge-green'}`}>{s.clock_out ? 'Complete' : '● Active'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
