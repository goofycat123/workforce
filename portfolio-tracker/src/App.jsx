import { useCallback, useEffect, useRef, useState } from 'react'

// ── Autocomplete ──────────────────────────────────────────────
function Autocomplete({ label, value, onChange, onSelect, suggestions, loading: sugLoad, placeholder, style }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function outside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1, ...style }}>
      {label && <div style={{ fontSize: 10, color: '#555', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>}
      <input
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => value && setOpen(true)}
        style={{ width: '100%', padding: '7px 10px', borderRadius: 8, background: '#0d0d0f', color: '#eee', border: '1px solid #2a2a2e', fontSize: 13, outline: 'none' }}
      />
      {open && (value.length >= 2) && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#18181b', border: '1px solid #2a2a2e', borderRadius: 8, zIndex: 999, marginTop: 4, maxHeight: 220, overflowY: 'auto', boxShadow: '0 8px 32px #0008' }}>
          {sugLoad && <div style={{ padding: '10px 12px', color: '#555', fontSize: 12 }}>Searching…</div>}
          {!sugLoad && suggestions.length === 0 && <div style={{ padding: '10px 12px', color: '#444', fontSize: 12 }}>No results</div>}
          {suggestions.map((s, i) => (
            <div key={i} onMouseDown={() => { onSelect(s); setOpen(false) }}
              style={{ padding: '9px 12px', fontSize: 13, color: '#ccc', cursor: 'pointer', borderBottom: '1px solid #222226' }}
              onMouseEnter={e => e.currentTarget.style.background = '#222226'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const _div = Number(import.meta.env.VITE_PE_USD_DIV)
const USD_DIV = Number.isFinite(_div) && _div > 0 ? _div : 100

const PRICE_SOURCES = [
  { id: 'csfloat', label: 'CSFloat' },
  { id: 'buff163', label: 'Buff163' },
]

const PERIODS = [
  { key: '1w', label: '7d' },
  { key: '1m', label: '1mo' },
  { key: '3m', label: '3mo' },
  { key: '6m', label: '6mo' },
  { key: '1y', label: '1yr' },
]

function num(v) {
  if (v == null || v === '') return null
  const n = +v
  return Number.isFinite(n) ? n : null
}
function toUsd(v) { const n = num(v); return n == null ? null : n / USD_DIV }
function pick(o, ...keys) {
  if (!o) return null
  for (const k of keys) if (o[k] != null && o[k] !== '') return o[k]
  return null
}
function money(n, c = 'USD') {
  const v = num(n)
  if (v == null) return '—'
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: c, maximumFractionDigits: 2 }).format(v)
}
function pct(n) {
  const v = num(n)
  if (v == null) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
}
const clr = v => v == null ? '#eee' : v >= 0 ? '#4ade80' : '#f87171'

async function pe(method, path, body, providerKey) {
  const q = providerKey ? `${path.includes('?') ? '&' : '?'}provider_key=${encodeURIComponent(providerKey)}` : ''
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (body) opts.body = JSON.stringify(body)
  const r = await fetch('/api/pricempire' + path + q, opts)
  const t = await r.text()
  let j = null
  try { j = t ? JSON.parse(t) : null } catch { throw new Error(t?.slice(0, 200) || 'Invalid JSON') }
  if (!r.ok) throw new Error(j?.message || j?.error || String(r.status))
  return j
}

// ── small components ──────────────────────────────────────────
function Stat({ label, value, sub, color }) {
  return (
    <div style={{ background: '#111113', border: '1px solid #222226', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: color || '#eee' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function Section({ title, children, action }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '.08em' }}>{title}</span>
        {action}
      </div>
      {children}
    </div>
  )
}

function Input({ label, ...props }) {
  return (
    <div style={{ flex: 1, minWidth: 120 }}>
      {label && <div style={{ fontSize: 10, color: '#555', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>}
      <input {...props} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, background: '#0d0d0f', color: '#eee', border: '1px solid #2a2a2e', fontSize: 13, outline: 'none', ...(props.style || {}) }} />
    </div>
  )
}

function Btn({ children, variant = 'default', loading, ...props }) {
  const bg = variant === 'green' ? '#16a34a' : variant === 'red' ? '#991b1b' : '#1e1e22'
  return (
    <button {...props} disabled={loading || props.disabled}
      style={{ padding: '7px 16px', borderRadius: 8, background: bg, color: '#fff', border: '1px solid #333', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: (loading || props.disabled) ? 0.5 : 1, whiteSpace: 'nowrap', ...(props.style || {}) }}>
      {loading ? '…' : children}
    </button>
  )
}

// ── main ──────────────────────────────────────────────────────
export default function App() {
  const defaultSrc = import.meta.env.VITE_PE_PROVIDER_KEY || 'csfloat'
  const [src, setSrc] = useState(() => { try { return localStorage.getItem('pe_src') || defaultSrc } catch { return defaultSrc } })
  const [list, setList]     = useState([])
  const [slug, setSlug]     = useState('')
  const [detail, setDetail] = useState(null)
  const [txns, setTxns]     = useState([])
  const [err, setErr]       = useState(null)
  const [load, setLoad]     = useState(true)
  const [dLoad, setDLoad]   = useState(false)
  const [toast, setToast]   = useState(null)

  // buy form
  const [buyItem, setBuyItem]     = useState('')
  const [buyQty,  setBuyQty]      = useState('1')
  const [buyPrice,setBuyPrice]    = useState('')
  const [buyDate, setBuyDate]     = useState(() => new Date().toISOString().slice(0, 10))
  const [buyBusy, setBuyBusy]     = useState(false)
  const [buySugs, setBuySugs]     = useState([])
  const [buySugLoad, setBuySugLoad] = useState(false)
  const buyTimer = useRef(null)
  const [activeMonth, setActiveMonth] = useState(null)

  // sell form
  const [sellItem, setSellItem]   = useState('')
  const [sellQty,  setSellQty]    = useState('1')
  const [sellPrice,setSellPrice]  = useState('')
  const [sellDate, setSellDate]   = useState(() => new Date().toISOString().slice(0, 10))
  const [sellBusy, setSellBusy]   = useState(false)

  const toastTimer = useRef(null)
  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => { try { localStorage.setItem('pe_src', src) } catch {} }, [src])

  const loadPortfolios = useCallback(async () => {
    setErr(null); setLoad(true)
    try {
      const rows = await pe('GET', '/portfolios', null, src)
      const arr = Array.isArray(rows) ? rows : Array.isArray(rows?.data) ? rows.data : []
      setList(arr)
      setSlug(s => s || arr[0]?.slug || '')
    } catch (e) { setErr(String(e.message || e)); setList([]) }
    finally { setLoad(false) }
  }, [src])

  useEffect(() => { loadPortfolios() }, [loadPortfolios])

  const loadDetail = useCallback(async (s) => {
    if (!s) { setDetail(null); setTxns([]); return }
    setDetail(null); setTxns([]); setDLoad(true); setErr(null)
    try {
      const [d, t] = await Promise.all([
        pe('GET', '/portfolios/' + encodeURIComponent(s), null, src),
        pe('GET', '/portfolios/' + encodeURIComponent(s) + '/transactions', null, src).catch(() => []),
      ])
      setDetail(d)
      setTxns(Array.isArray(t) ? t : Array.isArray(t?.data) ? t.data : [])
    } catch (e) { setErr(String(e.message || e)) }
    finally { setDLoad(false) }
  }, [src])

  useEffect(() => { loadDetail(slug) }, [slug, loadDetail])

  // ── parsed stats ──────────────────────────────────────────────
  const root    = detail?.data && typeof detail.data === 'object' ? detail.data : detail
  const s       = root?.stats && typeof root.stats === 'object' ? root.stats : {}
  const listRow = list.find(r => r.slug === slug)
  const cur     = pick(root?.portfolio, 'currency') || pick(listRow, 'currency') || 'USD'

  const totalValue    = toUsd(pick(s,'totalValue','total_value'))       ?? toUsd(pick(listRow,'value'))
  const totalInvested = toUsd(pick(s,'totalInvested','total_invested')) ?? toUsd(pick(listRow,'total_invested'))
  const realizedPL    = toUsd(pick(s,'totalRealizedPL','total_realized_pl','realizedPL'))
  const unrealizedPL  = toUsd(pick(s,'totalUnrealizedPL','total_unrealized_pl','unrealizedPL'))
  const change24h     = toUsd(pick(s,'change24h','change_24h'))
  const change24hPct  = num(pick(s,'change24hPercentage','change_24h_percentage'))
  const totalROI      = num(pick(s,'totalROI','total_roi'))

  const perf = s?.timePeriodPerformance || s?.time_period_performance || {}
  const seg  = x => x && typeof x === 'object'
    ? { value: toUsd(x.value ?? x.change), percentage: num(x.percentage ?? x.percent ?? x.change_percentage) }
    : null

  const monthly   = s?.monthlyPerformance || s?.monthly_performance || {}
  const avgMonthly = num(monthly.averageMonthlyReturn || monthly.average_monthly_return)
  const bestMonth  = monthly.bestMonth  || monthly.best_month
  const worstMonth = monthly.worstMonth || monthly.worst_month

  const itemsRaw = root?.items ?? root?.data?.items
  const items = Array.isArray(itemsRaw) ? itemsRaw.map(row => {
    const st = row.stats && typeof row.stats === 'object' ? row.stats : row
    return {
      id:   pick(row,'id','item_id') ?? row.market_hash_name,
      name: pick(row,'market_hash_name','name') || '—',
      qty:          num(pick(st,'holdings','quantity')),
      avgBuyPrice:  toUsd(pick(st,'avgBuyPrice','avg_buy_price','buyPrice','buy_price')),
      totalInvested:toUsd(pick(st,'totalInvested','total_invested')),
      currentPrice: toUsd(pick(row,'currentPrice','current_price')),
      value:        toUsd(pick(st,'currentValue','current_value')),
      realizedPL:   toUsd(pick(st,'realizedPL','realized_pl')),
      unrealizedPL: toUsd(pick(st,'unrealizedPL','unrealized_pl')),
      roi:          num(pick(st,'roi')),
    }
  }) : []

  const show = slug && (listRow || detail)

  // ── monthly breakdown (sell attributed to buy month, FIFO per item) ──
  const monthlyRows = (() => {
    if (!txns.length) return []
    const tType = t => (t.type || t.transaction_type || '').toLowerCase()
    const tDate = t => (t.date || t.created_at || '').slice(0, 7) // YYYY-MM
    const tName = t => pick(t, 'market_hash_name', 'name', 'item_name') || ''
    const tQty  = t => num(t.quantity ?? t.qty) ?? 1
    const tPrice = t => toUsd(t.price ?? t.buy_price ?? t.sell_price) ?? 0

    // sort all by date asc
    const sorted = [...txns].sort((a, b) => (tDate(a) > tDate(b) ? 1 : -1))

    // per-item buy queues: { name -> [{month, costPerUnit}] }
    const queues = {}
    // accumulator: { 'YYYY-MM' -> { invested, soldFor, realizedPL, buys, sells } }
    const acc = {}

    const getMonth = m => acc[m] || (acc[m] = { month: m, invested: 0, soldFor: 0, realizedPL: 0, buys: 0, sells: 0 })

    for (const t of sorted) {
      const type = tType(t)
      const name = tName(t)
      const month = tDate(t)
      const qty = tQty(t)
      const price = tPrice(t)

      if (type === 'buy' || type === 'bought') {
        if (!queues[name]) queues[name] = []
        for (let i = 0; i < qty; i++) queues[name].push({ month, costPerUnit: price / qty })
        getMonth(month).invested += price
        getMonth(month).buys += qty
      } else if (type === 'sell' || type === 'sold') {
        const q = queues[name] || []
        const pricePerUnit = price / qty
        for (let i = 0; i < qty; i++) {
          const buyEntry = q.shift() // FIFO
          const buyMonth = buyEntry ? buyEntry.month : month
          const cost = buyEntry ? buyEntry.costPerUnit : 0
          getMonth(buyMonth).soldFor += pricePerUnit
          getMonth(buyMonth).realizedPL += (pricePerUnit - cost)
          getMonth(buyMonth).sells += 1
        }
      }
    }

    return Object.values(acc).sort((a, b) => a.month > b.month ? 1 : -1)
  })()

  // buy item search
  function onBuyType(val) {
    setBuyItem(val)
    clearTimeout(buyTimer.current)
    if (val.length < 2) { setBuySugs([]); return }
    buyTimer.current = setTimeout(async () => {
      setBuySugLoad(true)
      try {
        const r = await fetch(`/api/steam-search?norender=1&appid=730&query=${encodeURIComponent(val)}&count=8`)
        const j = await r.json()
        const names = (j?.results || []).map(x => x.hash_name || x.name || '').filter(Boolean).slice(0, 8)
        setBuySugs(names)
      } catch { setBuySugs([]) }
      finally { setBuySugLoad(false) }
    }, 500)
  }

  // sell fuzzy filter from loaded holdings
  const sellSugs = items.length
    ? items.filter(i => i.name.toLowerCase().includes(sellItem.toLowerCase())).map(i => i.name).slice(0, 8)
    : []

  // ── handlers ──────────────────────────────────────────────────
  async function submitBuy(e) {
    e.preventDefault()
    if (!buyItem.trim() || !buyPrice) return
    setBuyBusy(true)
    try {
      await pe('POST', '/portfolios/' + encodeURIComponent(slug) + '/transactions', {
        type: 'buy',
        market_hash_name: buyItem.trim(),
        quantity: num(buyQty) ?? 1,
        price: num(buyPrice),
        date: buyDate,
      }, src)
      showToast('Buy recorded')
      setBuyItem(''); setBuyQty('1'); setBuyPrice('')
      await loadDetail(slug)
    } catch (e) { showToast(String(e.message || e), false) }
    finally { setBuyBusy(false) }
  }

  async function submitSell(e) {
    e.preventDefault()
    if (!sellItem || !sellPrice) return
    setSellBusy(true)
    try {
      await pe('POST', '/portfolios/' + encodeURIComponent(slug) + '/transactions', {
        type: 'sell',
        market_hash_name: sellItem,
        quantity: num(sellQty) ?? 1,
        price: num(sellPrice),
        date: sellDate,
      }, src)
      showToast('Sell recorded')
      setSellItem(''); setSellQty('1'); setSellPrice('')
      await loadDetail(slug)
    } catch (e) { showToast(String(e.message || e), false) }
    finally { setSellBusy(false) }
  }

  // ── render ────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 980, margin: '0 auto', paddingBottom: 60 }}>

      {/* toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 18, right: 18, padding: '10px 18px', borderRadius: 10, background: toast.ok ? '#14532d' : '#7f1d1d', color: '#fff', fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 20px #0008' }}>
          {toast.msg}
        </div>
      )}

      <h1 style={{ marginBottom: 16 }}>Portfolio</h1>
      {err && <div className="card err" style={{ marginBottom: 10 }}>{err}</div>}

      {/* ── Controls ── */}
      <div className="card" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={src} onChange={e => setSrc(e.target.value)}
          style={{ padding: '7px 10px', borderRadius: 8, background: '#0a0a0b', color: '#fff', border: '1px solid #2a2a2e', flex: '0 0 auto' }}>
          {PRICE_SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select value={slug} disabled={load || !list.length} onChange={e => setSlug(e.target.value)}
          style={{ padding: '7px 10px', borderRadius: 8, background: '#0a0a0b', color: '#fff', border: '1px solid #2a2a2e', flex: 1, minWidth: 160 }}>
          {!list.length && !load ? <option value="">No portfolios</option> : null}
          {list.map(r => <option key={r.slug} value={r.slug}>{r.name} ({r.slug})</option>)}
        </select>
        <Btn onClick={loadPortfolios}>Reload</Btn>
      </div>

      {dLoad && <p style={{ color: '#555', marginTop: 16 }}>Loading…</p>}

      {show && !dLoad && (<>

        {/* ── Overview ── */}
        <Section title="Overview">
          <div className="grid">
            <Stat label="Value"       value={money(totalValue, cur)} />
            <Stat label="Invested"    value={money(totalInvested, cur)} />
            <Stat label="Total ROI"   value={pct(totalROI)} color={clr(totalROI)} />
            <Stat label="24h"         value={money(change24h, cur)} sub={pct(change24hPct)} color={clr(change24h)} />
          </div>
        </Section>

        {/* ── Realized / Unrealized ── */}
        <Section title="Realized P/L vs Unrealized P/L">
          <div className="grid">
            <Stat label="Realized (sold only)" value={money(realizedPL, cur)} sub="actual closed profit/loss" color={clr(realizedPL)} />
            <Stat label="Unrealized (holding)" value={money(unrealizedPL, cur)} sub="paper — not banked yet" color="#eee" />
          </div>
        </Section>

        {/* ── Monthly tabs ── */}
        {monthlyRows.length > 0 && (() => {
          const sel = activeMonth ?? monthlyRows[monthlyRows.length - 1].month
          const row = monthlyRows.find(r => r.month === sel) || monthlyRows[monthlyRows.length - 1]
          const roi = row.invested > 0 ? (row.realizedPL / row.invested) * 100 : null
          const fmtMonth = m => { const [y, mo] = m.split('-'); return new Date(+y, +mo - 1).toLocaleString('en', { month: 'short', year: '2-digit' }) }
          return (
            <Section title="By month (sell P/L credited to buy month)">
              {/* tabs */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                {monthlyRows.map(r => (
                  <button key={r.month} onClick={() => setActiveMonth(r.month)}
                    style={{ padding: '5px 13px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                      background: r.month === sel ? '#fff' : '#18181b',
                      color: r.month === sel ? '#000' : '#666' }}>
                    {fmtMonth(r.month)}
                  </button>
                ))}
              </div>
              {/* cards */}
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))' }}>
                <Stat label="Invested" value={money(row.invested, cur)} />
                <Stat label="Sold for" value={row.soldFor > 0 ? money(row.soldFor, cur) : '—'} />
                <Stat label="Realized P/L" value={row.sells > 0 ? money(row.realizedPL, cur) : '—'} color={row.sells > 0 ? clr(row.realizedPL) : '#555'} />
                <Stat label="ROI" value={row.sells > 0 && roi != null ? pct(roi) : '—'} color={row.sells > 0 ? clr(roi) : '#555'} />
                <Stat label="Buys" value={row.buys || '—'} />
                <Stat label="Sells" value={row.sells || '—'} />
              </div>
            </Section>
          )
        })()}

        {/* ── Log a Buy ── */}
        <Section title="Log a buy">
          <form onSubmit={submitBuy} style={{ background: '#111113', border: '1px solid #222226', borderRadius: 12, padding: '16px' }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <Autocomplete
                label="Item name"
                placeholder="type e.g. ak red field…"
                value={buyItem}
                onChange={onBuyType}
                onSelect={v => { setBuyItem(v); setBuySugs([]) }}
                suggestions={buySugs}
                loading={buySugLoad}
                style={{ flex: 2, minWidth: 220 }}
              />
              <Input label="Qty" type="number" min="1" value={buyQty} onChange={e => setBuyQty(e.target.value)} style={{ width: 70, flex: '0 0 70px' }} />
              <Input label="Buy price (USD)" type="number" step="0.01" min="0" placeholder="0.00" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} required style={{ flex: 1 }} />
              <Input label="Date" type="date" value={buyDate} onChange={e => setBuyDate(e.target.value)} style={{ flex: '0 0 140px' }} />
              <Btn type="submit" variant="green" loading={buyBusy} style={{ alignSelf: 'flex-end' }}>Add buy</Btn>
            </div>
          </form>
        </Section>

        {/* ── Log a Sell ── */}
        <Section title="Log a sell">
          <form onSubmit={submitSell} style={{ background: '#111113', border: '1px solid #222226', borderRadius: 12, padding: '16px' }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <Autocomplete
                label="Item"
                placeholder="type to filter your holdings…"
                value={sellItem}
                onChange={v => setSellItem(v)}
                onSelect={v => setSellItem(v)}
                suggestions={sellSugs}
                loading={false}
                style={{ flex: 2, minWidth: 220 }}
              />
              <Input label="Qty" type="number" min="1" value={sellQty} onChange={e => setSellQty(e.target.value)} style={{ width: 70, flex: '0 0 70px' }} />
              <Input label="Sell price (USD)" type="number" step="0.01" min="0" placeholder="0.00" value={sellPrice} onChange={e => setSellPrice(e.target.value)} required style={{ flex: 1 }} />
              <Input label="Date" type="date" value={sellDate} onChange={e => setSellDate(e.target.value)} style={{ flex: '0 0 140px' }} />
              <Btn type="submit" variant="red" loading={sellBusy} style={{ alignSelf: 'flex-end' }}>Log sell</Btn>
            </div>
          </form>
        </Section>

        {/* ── Holdings ── */}
        {items.length > 0 && (
          <Section title={`Holdings (${items.length})`}>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="r">Qty</th>
                  <th className="r">Avg buy</th>
                  <th className="r">Invested</th>
                  <th className="r">Current price</th>
                  <th className="r">Value</th>
                  <th className="r">Realized P/L</th>
                  <th className="r">Unrealized P/L</th>
                  <th className="r">ROI</th>
                </tr>
              </thead>
              <tbody>
                {items.map(row => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td className="r">{row.qty ?? '—'}</td>
                    <td className="r">{money(row.avgBuyPrice, cur)}</td>
                    <td className="r">{money(row.totalInvested, cur)}</td>
                    <td className="r">{money(row.currentPrice, cur)}</td>
                    <td className="r">{money(row.value, cur)}</td>
                    <td className="r" style={{ color: clr(row.realizedPL) }}>{row.realizedPL != null && row.realizedPL !== 0 ? money(row.realizedPL, cur) : '—'}</td>
                    <td className="r" style={{ color: '#eee' }}>{money(row.unrealizedPL, cur)}</td>
                    <td className="r" style={{ color: clr(row.roi) }}>{pct(row.roi)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* ── Transaction history ── */}
        {txns.length > 0 && (
          <Section title={`Transaction history (${txns.length})`}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Item</th>
                  <th className="r">Qty</th>
                  <th className="r">Price</th>
                </tr>
              </thead>
              <tbody>
                {[...txns].sort((a, b) => new Date(b.date || b.created_at || 0) - new Date(a.date || a.created_at || 0)).map((t, i) => {
                  const type = (t.type || t.transaction_type || '').toLowerCase()
                  return (
                    <tr key={t.id ?? i}>
                      <td style={{ color: '#555' }}>{(t.date || t.created_at || '').slice(0, 10)}</td>
                      <td style={{ color: type === 'sell' || type === 'sold' ? '#f87171' : '#4ade80', fontWeight: 600, textTransform: 'capitalize' }}>{type || '—'}</td>
                      <td>{pick(t, 'market_hash_name', 'name', 'item_name') || '—'}</td>
                      <td className="r">{num(t.quantity ?? t.qty) ?? '—'}</td>
                      <td className="r">{money(toUsd(t.price ?? t.sell_price ?? t.buy_price), cur)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Section>
        )}

      </>)}
    </div>
  )
}
