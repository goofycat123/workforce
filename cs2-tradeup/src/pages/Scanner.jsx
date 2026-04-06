import { useState, useMemo } from 'react'
import { COLLECTIONS, RARITY, WEAR } from '../data/collections'
import { scanRoutes, calcOutputFloat } from '../utils/math'

const WEAR_OPTIONS = ['FN', 'MW']

export default function Scanner() {
  const [targetWears, setTargetWears] = useState(['MW'])
  const [inputFtMin, setInputFtMin] = useState(0.15)
  const [inputFtMax, setInputFtMax] = useState(0.22)
  const [filterCol, setFilterCol] = useState('all')
  const [filterTier, setFilterTier] = useState('all')
  const [showGuaranteedOnly, setShowGuaranteedOnly] = useState(false)
  const [expanded, setExpanded] = useState(null)

  const routes = useMemo(() => scanRoutes(COLLECTIONS, {
    targetWears,
    inputWearMin: inputFtMin,
    inputWearMax: inputFtMax,
  }), [targetWears, inputFtMin, inputFtMax])

  const filtered = routes.filter(r => {
    if (filterCol !== 'all' && r.collection.id !== filterCol) return false
    if (filterTier !== 'all' && r.inputTier !== filterTier) return false
    if (showGuaranteedOnly && !r.guaranteed) return false
    return true
  })

  function toggleWear(w) {
    setTargetWears(prev => prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w])
  }

  const wearColors = { FN: '#4ade80', MW: '#60a5fa', FT: '#facc15', WW: '#fb923c', BS: '#f87171' }
  const wearBg = { FN: '#052e16', MW: '#172554', FT: '#1c1a06', WW: '#1c0a01', BS: '#2d0707' }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Route Scanner</h1>
        <p>Automatically find trade-up routes where averaging FT-range inputs produces MW or FN outputs. The formula: <code>outputFloat = skinMin + avgInput × (skinMax − skinMin)</code></p>
      </div>

      {/* Filters */}
      <div className="card filters-card">
        <div className="filters-row">
          <div className="field">
            <label>Target Output Wear</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {WEAR_OPTIONS.map(w => (
                <button
                  key={w}
                  className={`wear-toggle ${targetWears.includes(w) ? 'active' : ''}`}
                  style={targetWears.includes(w) ? { background: wearBg[w], color: wearColors[w], borderColor: wearColors[w] } : {}}
                  onClick={() => toggleWear(w)}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Input Float Range (avg of 10)</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="number" step="0.001" min="0.15" max="0.38" value={inputFtMin}
                onChange={e => setInputFtMin(parseFloat(e.target.value))} style={{ width: 90 }} />
              <span style={{ color: '#475569' }}>–</span>
              <input type="number" step="0.001" min="0.15" max="0.38" value={inputFtMax}
                onChange={e => setInputFtMax(parseFloat(e.target.value))} style={{ width: 90 }} />
            </div>
          </div>

          <div className="field">
            <label>Collection</label>
            <select value={filterCol} onChange={e => setFilterCol(e.target.value)}>
              <option value="all">All Collections</option>
              {COLLECTIONS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Input Tier</label>
            <select value={filterTier} onChange={e => setFilterTier(e.target.value)}>
              <option value="all">All Tiers</option>
              <option value="milspec">Mil-Spec → Restricted</option>
              <option value="restricted">Restricted → Classified</option>
              <option value="classified">Classified → Covert</option>
            </select>
          </div>

          <div className="field" style={{ justifyContent: 'flex-end' }}>
            <label style={{ visibility: 'hidden' }}>.</label>
            <label className="toggle-label">
              <input type="checkbox" checked={showGuaranteedOnly}
                onChange={e => setShowGuaranteedOnly(e.target.checked)} />
              Guaranteed only
            </label>
          </div>
        </div>

        <div className="results-meta">
          Found <strong>{filtered.length}</strong> routes
          {filtered.filter(r => r.guaranteed).length > 0 && (
            <span className="guaranteed-count"> — {filtered.filter(r => r.guaranteed).length} guaranteed</span>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="route-list">
        {filtered.length === 0 && (
          <div className="empty-state">
            No routes match these filters. Try widening the float range or selecting both FN and MW targets.
          </div>
        )}
        {filtered.map(route => {
          const isOpen = expanded === route.id
          const w = WEAR[route.targetWear]
          return (
            <div key={route.id} className={`route-card ${route.guaranteed ? 'guaranteed' : 'partial'}`}>
              <div className="route-header" onClick={() => setExpanded(isOpen ? null : route.id)}>
                <div className="route-left">
                  <span className="route-icon">{route.collection.icon}</span>
                  <div>
                    <div className="route-title">{route.collection.name}</div>
                    <div className="route-subtitle">
                      <span style={{ color: RARITY[route.inputTier]?.color }}>{RARITY[route.inputTier]?.label}</span>
                      <span style={{ color: '#475569' }}> → </span>
                      <span style={{ color: RARITY[route.outputTier]?.color }}>{RARITY[route.outputTier]?.label}</span>
                    </div>
                  </div>
                </div>

                <div className="route-badges">
                  <span className="wear-badge" style={{ background: w?.bg, color: w?.color }}>
                    Target: {w?.label}
                  </span>
                  <span className={`status-badge ${route.guaranteed ? 'green' : 'yellow'}`}>
                    {route.guaranteed ? '✓ Guaranteed' : `${route.feasibleOutputs.length}/${route.totalOutputs} skins`}
                  </span>
                  <span className="hit-rate" style={{ color: route.hitRate === 1 ? '#4ade80' : '#facc15' }}>
                    {(route.hitRate * 100).toFixed(0)}% hit
                  </span>
                  <span className="expand-icon">{isOpen ? '▲' : '▼'}</span>
                </div>
              </div>

              {isOpen && (
                <div className="route-body">
                  {route.guaranteed && route.safeAvgMin !== null && (
                    <div className="guaranteed-box">
                      <span className="gb-label">Safe avg input range (all outputs become {route.targetWear})</span>
                      <span className="gb-val mono">
                        {route.safeAvgMin.toFixed(4)} – {route.safeAvgMax.toFixed(4)}
                      </span>
                      <span className="gb-tip">
                        Buy 10× {RARITY[route.inputTier]?.label} skins with floats near{' '}
                        <strong>{((route.safeAvgMin + route.safeAvgMax) / 2).toFixed(4)}</strong>
                      </span>
                    </div>
                  )}

                  <div className="output-table">
                    <div className="output-table-header">
                      <span>Output Skin</span>
                      <span>Float Range</span>
                      <span>Avg Input Needed</span>
                      <span>Output Float</span>
                      <span>Status</span>
                      <span>Links</span>
                    </div>
                    {route.outputAnalysis.map((o, i) => {
                      const sw = o.feasible ? WEAR[route.targetWear] : null
                      return (
                        <div key={i} className={`output-table-row ${o.feasible ? 'feasible' : 'infeasible'}`}>
                          <span className="otname">{o.name}</span>
                          <span className="mono small">[{o.skin.minFloat} – {o.skin.maxFloat}]</span>
                          {o.feasible ? (
                            <span className="mono small green">
                              {o.avgInputMin.toFixed(4)} – {o.avgInputMax.toFixed(4)}
                            </span>
                          ) : (
                            <span className="mono small muted">not achievable</span>
                          )}
                          {o.feasible ? (
                            <span className="mono small">
                              {o.outFloatMin.toFixed(4)} – {o.outFloatMax.toFixed(4)}
                            </span>
                          ) : (
                            <span className="mono small muted">—</span>
                          )}
                          <span>
                            {o.feasible
                              ? <span className="status-badge green">✓ {route.targetWear}</span>
                              : <span className="status-badge red">✗</span>}
                          </span>
                          <span style={{ display: 'flex', gap: 6 }}>
                            <a href={`https://float.market/buy?name=${encodeURIComponent(o.name)}`} target="_blank" rel="noreferrer" className="market-link">float</a>
                            <a href={`https://buff.163.com/market/?game=csgo#tab=selling&page_num=1&search=${encodeURIComponent(o.name)}`} target="_blank" rel="noreferrer" className="market-link buff">buff</a>
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  <div className="route-inputs">
                    <span className="hint">Available input skins from this collection:</span>
                    <div className="input-chips">
                      {route.inputSkins.map((s, i) => (
                        <a
                          key={i}
                          href={`https://buff.163.com/market/?game=csgo#tab=selling&page_num=1&search=${encodeURIComponent(`${s.weapon} | ${s.skin}`)}`}
                          target="_blank" rel="noreferrer"
                          className="input-chip"
                        >
                          {s.weapon} | {s.skin}
                          <span className="chip-float">[{s.minFloat}–{s.maxFloat}]</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
