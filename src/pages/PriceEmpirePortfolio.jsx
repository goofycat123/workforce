import { useCallback, useEffect, useState } from 'react'
import { fetchPortfolioDetails, fetchPortfolios } from '../lib/pricempireApi'

function fmtMoney(n, currency = 'USD') {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(n))
}

function fmtPct(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  const v = Number(n)
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(2)}%`
}

export default function PriceEmpirePortfolio() {
  const [list, setList] = useState([])
  const [slug, setSlug] = useState('')
  const [detail, setDetail] = useState(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [err, setErr] = useState(null)

  const isDev = import.meta.env.DEV

  const loadList = useCallback(async () => {
    setErr(null)
    setLoadingList(true)
    try {
      const data = await fetchPortfolios()
      const rows = Array.isArray(data) ? data : []
      setList(rows)
      setSlug((prev) => prev || rows[0]?.slug || '')
    } catch (e) {
      setErr(e?.message || String(e))
      setList([])
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    loadList()
  }, [loadList])

  useEffect(() => {
    if (!slug) {
      setDetail(null)
      return
    }
    let cancelled = false
    ;(async () => {
      setErr(null)
      setLoadingDetail(true)
      try {
        const data = await fetchPortfolioDetails(slug)
        if (!cancelled) setDetail(data)
      } catch (e) {
        if (!cancelled) {
          setErr(e?.message || String(e))
          setDetail(null)
        }
      } finally {
        if (!cancelled) setLoadingDetail(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  const stats = detail?.stats
  const perf = stats?.timePeriodPerformance || {}
  const w = perf['1w']
  const m = perf['1m']
  const currency = detail?.portfolio?.currency || list.find((p) => p.slug === slug)?.currency || 'USD'

  return (
    <div>
      <h1 className="page-title">PriceEmpire portfolio</h1>
      <p className="page-sub">7-day and 1-month performance from your Trader API (localhost dev proxy).</p>

      {!isDev && (
        <div className="card" style={{ marginTop: 20, borderColor: 'var(--amber)', background: 'var(--amber-bg)' }}>
          <p style={{ color: 'var(--amber)', fontSize: 13, lineHeight: 1.5 }}>
            The API proxy only runs with <code style={{ color: 'var(--text)' }}>npm run dev</code>. Production builds
            do not forward <code style={{ color: 'var(--text)' }}>/api/pricempire</code> unless you add your own
            backend.
          </p>
        </div>
      )}

      {isDev && (
        <div className="card" style={{ marginTop: 20 }}>
          <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.55 }}>
            Add <code style={{ color: 'var(--text)' }}>PRICEMPIRE_API_KEY=…</code> to <code style={{ color: 'var(--text)' }}>.env</code> in the project root, restart{' '}
            <code style={{ color: 'var(--text)' }}>npm run dev</code>. Keys are sent only from the dev server to PriceEmpire, not embedded in the page.
          </p>
        </div>
      )}

      {err && (
        <div className="card" style={{ marginTop: 16, borderColor: '#3a1212', background: 'var(--red-bg)' }}>
          <p style={{ color: 'var(--red)', fontSize: 13 }}>{err}</p>
          <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 10 }} onClick={loadList}>
            Retry
          </button>
        </div>
      )}

      <div className="card" style={{ marginTop: 20 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="pe-portfolio">
            Portfolio
          </label>
          <select
            id="pe-portfolio"
            className="form-input form-select"
            value={slug}
            disabled={loadingList || !list.length}
            onChange={(e) => setSlug(e.target.value)}
          >
            {!list.length && !loadingList ? <option value="">No portfolios</option> : null}
            {list.map((p) => (
              <option key={p.slug || p.id} value={p.slug}>
                {p.name || p.slug} ({p.slug})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadingDetail && (
        <p style={{ marginTop: 20, color: 'var(--muted)' }}>Loading details…</p>
      )}

      {detail?.portfolio && stats && !loadingDetail && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginTop: 20 }}>
            <div className="stat-card">
              <div className="stat-label">Total value</div>
              <div className="stat-value">{fmtMoney(stats.totalValue, currency)}</div>
              <div className="stat-sub">Invested {fmtMoney(stats.totalInvested, currency)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">24h change</div>
              <div className="stat-value" style={{ color: stats.change24h >= 0 ? 'var(--green-t)' : 'var(--red)' }}>
                {fmtMoney(stats.change24h, currency)}
              </div>
              <div className="stat-sub">{fmtPct(stats.change24hPercentage)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">7 days</div>
              <div className="stat-value" style={{ color: (w?.value ?? 0) >= 0 ? 'var(--green-t)' : 'var(--red)' }}>
                {w ? fmtMoney(w.value, currency) : '—'}
              </div>
              <div className="stat-sub">{w ? fmtPct(w.percentage) : 'No data'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">1 month (~30d)</div>
              <div className="stat-value" style={{ color: (m?.value ?? 0) >= 0 ? 'var(--green-t)' : 'var(--red)' }}>
                {m ? fmtMoney(m.value, currency) : '—'}
              </div>
              <div className="stat-sub">{m ? fmtPct(m.percentage) : 'No data'}</div>
            </div>
          </div>

          {Array.isArray(detail.items) && detail.items.length > 0 && (
            <div className="table-wrap" style={{ marginTop: 24 }}>
              <div className="table-header">
                <span className="table-title">Holdings ({detail.items.length})</span>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th className="r">Qty</th>
                      <th className="r">Value</th>
                      <th className="r">P/L</th>
                      <th className="r">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((row) => (
                      <tr key={row.id ?? row.market_hash_name}>
                        <td style={{ color: 'var(--text)', maxWidth: 320 }}>{row.market_hash_name || row.name || '—'}</td>
                        <td className="r">{row.stats?.holdings ?? '—'}</td>
                        <td className="r">{fmtMoney(row.stats?.currentValue, currency)}</td>
                        <td className="r" style={{ color: (row.stats?.totalProfit ?? 0) >= 0 ? 'var(--green-t)' : 'var(--red)' }}>
                          {fmtMoney(row.stats?.totalProfit, currency)}
                        </td>
                        <td className="r">{fmtPct(row.stats?.roi)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
