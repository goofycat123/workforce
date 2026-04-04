import { useCallback, useEffect, useState } from 'react'

// API sends USD as integer cents unless VITE_PE_USD_DIV=1 (already dollars)
const _div = Number(import.meta.env.VITE_PE_USD_DIV)
const USD_DIV = Number.isFinite(_div) && _div > 0 ? _div : 100
function toUsd(n) {
  const v = num(n)
  if (v == null) return null
  return v / USD_DIV
}

const PRICE_SOURCES = [
  { id: 'csfloat', label: 'CSFloat' },
  { id: 'buff163', label: 'Buff163' },
]

async function pe(path, providerKey) {
  const q =
    providerKey && String(providerKey).trim()
      ? `${path.includes('?') ? '&' : '?'}provider_key=${encodeURIComponent(String(providerKey).trim())}`
      : ''
  const r = await fetch('/api/pricempire' + path + q)
  const t = await r.text()
  let j = null
  try {
    j = t ? JSON.parse(t) : null
  } catch {
    throw new Error(t?.slice(0, 200) || 'Invalid JSON')
  }
  if (!r.ok) throw new Error(j?.message || j?.error || String(r.status))
  return j
}

function pick(o, ...keys) {
  if (!o) return null
  for (const k of keys) {
    if (o[k] != null && o[k] !== '') return o[k]
  }
  return null
}

function num(v) {
  if (v == null || v === '') return null
  const n = +v
  return Number.isFinite(n) ? n : null
}

function normPerf(raw) {
  const p = raw?.timePeriodPerformance || raw?.time_period_performance || {}
  const w = p['1w'] || p['7d'] || p.one_week
  const m = p['1m'] || p['30d'] || p.one_month
  const seg = (x) =>
    x && typeof x === 'object'
      ? {
          value: toUsd(x.value ?? x.change ?? x.delta),
          percentage: num(x.percentage ?? x.percent ?? x.change_percentage),
        }
      : null
  return { w: seg(w), m: seg(m) }
}

function normRowItem(row) {
  const st = row.stats && typeof row.stats === 'object' ? row.stats : row
  return {
    id: pick(row, 'id', 'item_id') ?? row.market_hash_name,
    market_hash_name: pick(row, 'market_hash_name', 'name', 'market_name'),
    holdings: num(pick(st, 'holdings', 'quantity', 'amount')),
    currentValue: toUsd(pick(st, 'currentValue', 'current_value', 'value')),
    totalProfit: toUsd(pick(st, 'totalProfit', 'total_profit', 'profit_loss', 'unrealizedPL', 'unrealized_pl')),
  }
}

function mergeView(detail, listRow) {
  const root = detail?.data && typeof detail.data === 'object' ? detail.data : detail
  const s = root?.stats && typeof root.stats === 'object' ? root.stats : {}
  const pf = normPerf(s)
  const cur =
    pick(root?.portfolio, 'currency', 'Currency') ||
    pick(listRow, 'currency', 'Currency') ||
    'USD'

  const totalValue = toUsd(pick(s, 'totalValue', 'total_value')) ?? toUsd(pick(listRow, 'value', 'total_value'))
  const totalInvested = toUsd(pick(s, 'totalInvested', 'total_invested')) ?? toUsd(pick(listRow, 'total_invested', 'totalInvested'))
  const totalProfit =
    toUsd(pick(s, 'totalProfit', 'total_profit', 'profit_loss')) ?? toUsd(pick(listRow, 'profit_loss', 'profitLoss', 'total_profit'))
  const change24h = toUsd(pick(s, 'change24h', 'change_24h')) ?? toUsd(pick(listRow, 'change24h', 'change_24h'))
  const change24hPct =
    num(pick(s, 'change24hPercentage', 'change_24h_percentage')) ?? num(pick(listRow, 'change24h_percentage', 'change_24h_pct'))

  const itemsRaw = root?.items ?? root?.data?.items
  const items = Array.isArray(itemsRaw) ? itemsRaw.map(normRowItem) : []

  return { cur, totalValue, totalInvested, totalProfit, change24h, change24hPct, pf, items }
}

function money(n, c = 'USD') {
  const v = num(n)
  if (v == null) return '—'
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: c }).format(v)
}

function pct(n) {
  const v = num(n)
  if (v == null) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
}

export default function App() {
  const defaultSrc = import.meta.env.VITE_PE_PROVIDER_KEY || 'csfloat'
  const [priceSource, setPriceSource] = useState(() => {
    try {
      return localStorage.getItem('pe_price_source') || defaultSrc
    } catch {
      return defaultSrc
    }
  })
  const [list, setList] = useState([])
  const [slug, setSlug] = useState('')
  const [detail, setDetail] = useState(null)
  const [err, setErr] = useState(null)
  const [load, setLoad] = useState(true)
  const [detailLoad, setDetailLoad] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem('pe_price_source', priceSource)
    } catch {}
  }, [priceSource])

  const refresh = useCallback(async () => {
    setErr(null)
    setLoad(true)
    try {
      const rows = await pe('/portfolios', priceSource)
      const arr = Array.isArray(rows) ? rows : Array.isArray(rows?.data) ? rows.data : []
      setList(arr)
      setSlug((s) => s || arr[0]?.slug || '')
    } catch (e) {
      setErr(String(e.message || e))
      setList([])
    } finally {
      setLoad(false)
    }
  }, [priceSource])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!slug) {
      setDetail(null)
      return
    }
    let x = true
    setDetail(null)
    setDetailLoad(true)
    setErr(null)
    ;(async () => {
      try {
        const d = await pe('/portfolios/' + encodeURIComponent(slug), priceSource)
        if (x) setDetail(d)
      } catch (e) {
        if (x) setErr(String(e.message || e))
      } finally {
        if (x) setDetailLoad(false)
      }
    })()
    return () => {
      x = false
    }
  }, [slug, priceSource])

  const listRow = list.find((r) => r.slug === slug)
  const v = mergeView(detail, listRow)
  const show = slug && (listRow || detail)

  return (
    <>
      <h1>Portfolio</h1>
      {err && <div className="card err">{err}</div>}
      <div className="card">
        <label className="form-label" style={{ display: 'block', marginBottom: 6, color: '#888', fontSize: 11 }}>
          Price source
        </label>
        <select
          className="form-select"
          value={priceSource}
          onChange={(e) => setPriceSource(e.target.value)}
          style={{ width: '100%', marginBottom: 12, padding: 8, borderRadius: 8, background: '#0a0a0b', color: '#fff', border: '1px solid #333' }}
        >
          {PRICE_SOURCES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <select value={slug} disabled={load || !list.length} onChange={(e) => setSlug(e.target.value)}>
          {!list.length && !load ? <option value="">No portfolios</option> : null}
          {list.map((r) => (
            <option key={r.slug} value={r.slug}>
              {r.name} ({r.slug})
            </option>
          ))}
        </select>
        <button type="button" onClick={refresh} style={{ marginTop: 10, padding: '6px 12px' }}>
          Reload
        </button>
      </div>
      {detailLoad && <p className="card">Loading…</p>}
      {show && !detailLoad && (
        <div className="card">
          <div className="grid">
            <div className="stat">
              <b>Value</b>
              <span>{money(v.totalValue, v.cur)}</span>
            </div>
            <div className="stat">
              <b>P/L</b>
              <span className={(v.totalProfit ?? 0) >= 0 ? 'up' : 'down'}>{money(v.totalProfit, v.cur)}</span>
            </div>
            <div className="stat">
              <b>Invested</b>
              <span>{money(v.totalInvested, v.cur)}</span>
            </div>
            <div className="stat">
              <b>24h</b>
              <span className={(v.change24h ?? 0) >= 0 ? 'up' : 'down'}>{money(v.change24h, v.cur)}</span>
              <small style={{ color: '#666' }}> {pct(v.change24hPct)}</small>
            </div>
            <div className="stat">
              <b>7d</b>
              <span className={(v.pf.w?.value ?? 0) >= 0 ? 'up' : 'down'}>
                {v.pf.w ? money(v.pf.w.value, v.cur) : '—'}
              </span>
              <small style={{ color: '#666' }}> {v.pf.w ? pct(v.pf.w.percentage) : ''}</small>
            </div>
            <div className="stat">
              <b>1mo</b>
              <span className={(v.pf.m?.value ?? 0) >= 0 ? 'up' : 'down'}>
                {v.pf.m ? money(v.pf.m.value, v.cur) : '—'}
              </span>
              <small style={{ color: '#666' }}> {v.pf.m ? pct(v.pf.m.percentage) : ''}</small>
            </div>
          </div>
          {v.items.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="r">Qty</th>
                  <th className="r">Value</th>
                  <th className="r">P/L</th>
                </tr>
              </thead>
              <tbody>
                {v.items.map((row) => (
                  <tr key={row.id}>
                    <td>{row.market_hash_name || '—'}</td>
                    <td className="r">{row.holdings ?? '—'}</td>
                    <td className="r">{money(row.currentValue, v.cur)}</td>
                    <td className={`r ${(row.totalProfit ?? 0) >= 0 ? 'up' : 'down'}`}>{money(row.totalProfit, v.cur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  )
}
