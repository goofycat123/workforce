import { useState, useMemo } from 'react'
import { COLLECTIONS, RARITY, TIER_ORDER, WEAR } from '../data/collections'
import { calcOutputFloat, avgFloat, getWear, analyzeOutputs, requiredAvgFloat } from '../utils/math'

const DEFAULT_FLOATS = Array(10).fill('')

export default function Calculator() {
  const [floats, setFloats] = useState(DEFAULT_FLOATS)
  const [colId, setColId] = useState(COLLECTIONS[0].id)
  const [inputTier, setInputTier] = useState('milspec')
  const [inputCosts, setInputCosts] = useState(Array(10).fill(''))
  const [outputPrices, setOutputPrices] = useState({})
  const [targetFloat, setTargetFloat] = useState('')

  const collection = COLLECTIONS.find(c => c.id === colId)
  const outputTierIdx = TIER_ORDER.indexOf(inputTier) + 1
  const outputTier = TIER_ORDER[outputTierIdx]
  const outputSkins = collection?.tiers[outputTier] || []

  const parsedFloats = floats.map(f => parseFloat(f) || 0)
  const validFloats = parsedFloats.filter(f => f > 0)
  const avg = validFloats.length > 0 ? validFloats.reduce((a, b) => a + b, 0) / validFloats.length : null

  const outputs = useMemo(() => {
    if (avg === null) return []
    return analyzeOutputs(avg, outputSkins)
  }, [avg, outputSkins])

  const totalInputCost = inputCosts.reduce((sum, c) => sum + (parseFloat(c) || 0), 0)

  const targetAvgNeeded = useMemo(() => {
    if (!targetFloat || !outputSkins.length) return null
    return outputSkins.map(skin => ({
      name: `${skin.weapon} | ${skin.skin}`,
      avgNeeded: requiredAvgFloat(parseFloat(targetFloat), skin),
    }))
  }, [targetFloat, outputSkins])

  function setFloat(i, val) {
    const next = [...floats]
    next[i] = val
    setFloats(next)
  }

  function fillEven(val) {
    setFloats(Array(10).fill(val.toString()))
  }

  const wearColors = { FN: '#4ade80', MW: '#60a5fa', FT: '#facc15', WW: '#fb923c', BS: '#f87171' }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Trade-Up Calculator</h1>
        <p>Enter 10 input skin floats to predict output float across all possible output skins.</p>
      </div>

      {/* Config row */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row-g3">
          <div className="field">
            <label>Collection</label>
            <select value={colId} onChange={e => setColId(e.target.value)}>
              {COLLECTIONS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Input Rarity</label>
            <select value={inputTier} onChange={e => setInputTier(e.target.value)}>
              {TIER_ORDER.slice(0, -1).map(t => (
                <option key={t} value={t}>{RARITY[t]?.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Quick Fill (all 10)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="number" step="0.0001" min="0.15" max="0.38"
                placeholder="0.1500"
                onBlur={e => fillEven(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="btn-sm btn-ghost" onClick={() => { setFloats(DEFAULT_FLOATS); setInputCosts(Array(10).fill('')) }}>
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="two-col">
        {/* Left: input skins */}
        <div>
          <div className="card">
            <div className="section-title">Input Skins (10 required)</div>
            <div className="float-grid">
              {floats.map((f, i) => {
                const pf = parseFloat(f)
                const wear = pf ? getWear(pf) : null
                return (
                  <div key={i} className="float-input-row">
                    <span className="float-num">{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <input
                        type="number" step="0.0001" min="0" max="1"
                        placeholder="0.0000"
                        value={f}
                        onChange={e => setFloat(i, e.target.value)}
                        className={wear ? `wear-${wear.code}` : ''}
                      />
                    </div>
                    {wear && (
                      <span className="wear-badge" style={{ background: wear.bg, color: wear.color, border: `1px solid ${wear.color}33` }}>
                        {wear.code}
                      </span>
                    )}
                    <input
                      type="number" step="0.01" min="0"
                      placeholder="$0.00"
                      value={inputCosts[i]}
                      onChange={e => { const n = [...inputCosts]; n[i] = e.target.value; setInputCosts(n) }}
                      className="price-input"
                    />
                  </div>
                )
              })}
            </div>

            {avg !== null && (
              <div className="avg-bar">
                <div>
                  <span className="avg-label">Avg Input Float</span>
                  <span className="avg-value">{avg.toFixed(6)}</span>
                </div>
                <div>
                  <span className="avg-label">Input Wear</span>
                  <span className="wear-badge" style={{ background: getWear(avg).bg, color: getWear(avg).color }}>
                    {getWear(avg).label}
                  </span>
                </div>
                <div>
                  <span className="avg-label">Valid inputs</span>
                  <span className="avg-value">{validFloats.length}/10</span>
                </div>
              </div>
            )}
          </div>

          {/* Target float reverse calc */}
          <div className="card" style={{ marginTop: 12 }}>
            <div className="section-title">Reverse: Target Output Float</div>
            <p className="hint">Enter the float you want on the output — see what avg input you need.</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input
                type="number" step="0.0001" min="0" max="1"
                placeholder="e.g. 0.1499"
                value={targetFloat}
                onChange={e => setTargetFloat(e.target.value)}
                style={{ flex: 1 }}
              />
              {targetFloat && getWear(parseFloat(targetFloat)) && (
                <span className="wear-badge" style={{ background: getWear(parseFloat(targetFloat)).bg, color: getWear(parseFloat(targetFloat)).color, alignSelf: 'center' }}>
                  {getWear(parseFloat(targetFloat)).label}
                </span>
              )}
            </div>
            {targetAvgNeeded && (
              <div className="output-list" style={{ marginTop: 8 }}>
                {targetAvgNeeded.map((r, i) => (
                  <div key={i} className="output-row">
                    <span style={{ fontSize: 13 }}>{r.name}</span>
                    {r.avgNeeded !== null ? (
                      <span style={{ fontFamily: 'monospace', color: r.avgNeeded >= 0.15 && r.avgNeeded <= 0.38 ? '#4ade80' : '#f87171' }}>
                        avg = {r.avgNeeded.toFixed(6)}
                        {r.avgNeeded >= 0.15 && r.avgNeeded <= 0.38 ? ' ✓ FT achievable' : ' ✗ out of FT range'}
                      </span>
                    ) : (
                      <span style={{ color: '#475569' }}>N/A</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: output analysis */}
        <div>
          <div className="card">
            <div className="section-title">Output Analysis — {outputTier ? RARITY[outputTier]?.label : '—'}</div>
            {outputs.length === 0 ? (
              <p className="hint">Enter at least one float value to see output predictions.</p>
            ) : (
              <div className="output-list">
                {outputs.map((o, i) => (
                  <div key={i} className={`output-card ${o.wear.code}`}>
                    <div className="output-skin-name">{o.name}</div>
                    <div className="output-stats">
                      <div>
                        <span className="stat-label">Output Float</span>
                        <span className="stat-val mono">{o.outputFloat.toFixed(6)}</span>
                      </div>
                      <div>
                        <span className="stat-label">Wear</span>
                        <span className="wear-badge" style={{ background: o.wear.bg, color: o.wear.color }}>
                          {o.wear.label}
                        </span>
                      </div>
                      <div>
                        <span className="stat-label">Range</span>
                        <span className="stat-val mono" style={{ fontSize: 11 }}>
                          [{o.skin.minFloat} – {o.skin.maxFloat}]
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Est. value $</span>
                      <input
                        type="number" step="0.01" min="0" placeholder="0.00"
                        className="price-input"
                        value={outputPrices[o.name] || ''}
                        onChange={e => setOutputPrices(p => ({ ...p, [o.name]: e.target.value }))}
                        style={{ width: 80 }}
                      />
                      <a href={`https://float.market/buy?name=${encodeURIComponent(o.name)}`} target="_blank" rel="noreferrer" className="market-link">
                        float.market
                      </a>
                      <a href={`https://buff.163.com/market/?game=csgo#tab=selling&page_num=1&search=${encodeURIComponent(o.name)}`} target="_blank" rel="noreferrer" className="market-link buff">
                        buff
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Profit summary */}
          {totalInputCost > 0 && Object.keys(outputPrices).length > 0 && (
            <div className="card profit-card" style={{ marginTop: 12 }}>
              <div className="section-title">Profit Summary</div>
              <div className="profit-row">
                <span>Total Input Cost</span>
                <span className="mono">${totalInputCost.toFixed(2)}</span>
              </div>
              {Object.entries(outputPrices).map(([name, price]) => {
                const pv = parseFloat(price) || 0
                const profit = pv - totalInputCost
                const roi = totalInputCost > 0 ? (profit / totalInputCost) * 100 : 0
                return (
                  <div key={name} className="profit-row">
                    <span style={{ fontSize: 12 }}>{name}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div className="mono">${pv.toFixed(2)}</div>
                      <div style={{ color: profit >= 0 ? '#4ade80' : '#f87171', fontSize: 12 }}>
                        {profit >= 0 ? '+' : ''}{profit.toFixed(2)} ({roi >= 0 ? '+' : ''}{roi.toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                )
              })}
              <div className="profit-hint">
                Output is random — probability is 1/{outputs.length} per skin
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
