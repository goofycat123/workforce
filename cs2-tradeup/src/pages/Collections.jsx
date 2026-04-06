import { useState } from 'react'
import { COLLECTIONS, RARITY, TIER_ORDER } from '../data/collections'
import { calcOutputFloat, getWear } from '../utils/math'

export default function Collections() {
  const [selected, setSelected] = useState(COLLECTIONS[0].id)
  const [previewAvg, setPreviewAvg] = useState(0.16)

  const col = COLLECTIONS.find(c => c.id === selected)

  const rarityColors = {
    milspec: '#4b69ff', restricted: '#8847ff', classified: '#d32ce6', covert: '#eb4b4b',
  }
  const rarityBg = {
    milspec: '#0a0d1f', restricted: '#110b1f', classified: '#180a1f', covert: '#1f0a0a',
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Collection Browser</h1>
        <p>Browse all skins per case with float ranges. The preview shows the output float for a given avg input.</p>
      </div>

      <div className="col-tabs">
        {COLLECTIONS.map(c => (
          <button
            key={c.id}
            className={`col-tab ${selected === c.id ? 'active' : ''}`}
            onClick={() => setSelected(c.id)}
          >
            {c.icon} {c.name.replace(' Case', '')}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <label style={{ color: '#94a3b8', fontSize: 13 }}>Preview with avg input float:</label>
          <input
            type="range" min="0.15" max="0.38" step="0.001" value={previewAvg}
            onChange={e => setPreviewAvg(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: '#60a5fa' }}
          />
          <span className="mono" style={{ minWidth: 70, color: '#e2e8f0' }}>{previewAvg.toFixed(4)}</span>
          <span className="wear-badge" style={{ background: '#172554', color: '#60a5fa' }}>
            {getWear(previewAvg).label}
          </span>
        </div>
      </div>

      {col && TIER_ORDER.map((tier, ti) => {
        const skins = col.tiers[tier] || []
        if (!skins.length) return null
        const isOutput = ti > 0
        return (
          <div key={tier} className="tier-section">
            <div className="tier-header" style={{ background: rarityBg[tier], borderLeft: `3px solid ${rarityColors[tier]}` }}>
              <span style={{ color: rarityColors[tier], fontWeight: 600 }}>{RARITY[tier]?.label}</span>
              <span className="tier-count">{skins.length} skins</span>
              {ti > 0 && <span className="tier-note">← outputs from {RARITY[TIER_ORDER[ti - 1]]?.label} trade-up</span>}
              {ti < TIER_ORDER.length - 1 && <span className="tier-note">→ use as inputs to get {RARITY[TIER_ORDER[ti + 1]]?.label}</span>}
            </div>
            <div className="skin-grid">
              {skins.map((skin, i) => {
                const outFloat = calcOutputFloat(previewAvg, skin)
                const wear = getWear(outFloat)
                return (
                  <div key={i} className="skin-card">
                    <div className="skin-name">
                      <span className="skin-weapon">{skin.weapon}</span>
                      <span className="skin-skin">| {skin.skin}</span>
                    </div>
                    <div className="skin-stats">
                      <div className="skin-stat">
                        <span className="sl">Float range</span>
                        <span className="sv mono">[{skin.minFloat.toFixed(2)} – {skin.maxFloat.toFixed(2)}]</span>
                      </div>
                      <div className="skin-stat">
                        <span className="sl">Output float</span>
                        <span className="sv mono" style={{ color: wear.color }}>{outFloat.toFixed(6)}</span>
                      </div>
                      <div className="skin-stat">
                        <span className="sl">Output wear</span>
                        <span className="wear-badge" style={{ background: wear.bg, color: wear.color, fontSize: 11 }}>
                          {wear.label}
                        </span>
                      </div>
                    </div>
                    <div className="skin-links">
                      <a href={`https://float.market/buy?name=${encodeURIComponent(`${skin.weapon} | ${skin.skin}`)}`}
                        target="_blank" rel="noreferrer" className="market-link">float.market</a>
                      <a href={`https://buff.163.com/market/?game=csgo#tab=selling&search=${encodeURIComponent(`${skin.weapon} | ${skin.skin}`)}`}
                        target="_blank" rel="noreferrer" className="market-link buff">buff</a>
                      <a href={`https://csgofloat.com/skin/${encodeURIComponent(`${skin.weapon} | ${skin.skin}`)}`}
                        target="_blank" rel="noreferrer" className="market-link float-site">csfloat</a>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
