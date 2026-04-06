import { WEAR, TIER_ORDER } from '../data/collections'

/**
 * Core trade-up float formula (community verified):
 * outputFloat = skinMinFloat + avgInputFloat * (skinMaxFloat - skinMinFloat)
 *
 * The output skin is drawn randomly from the next tier in the same case pool.
 * Each possible output skin gets a DIFFERENT output float from the same inputs
 * because each skin has its own [minFloat, maxFloat] range.
 */
export function calcOutputFloat(avgInputFloat, skin) {
  const range = skin.maxFloat - skin.minFloat
  return skin.minFloat + avgInputFloat * range
}

export function avgFloat(floats) {
  const valid = floats.filter(f => f > 0 && f <= 1)
  if (!valid.length) return 0
  return valid.reduce((a, b) => a + b, 0) / valid.length
}

export function getWear(float) {
  for (const w of Object.values(WEAR)) {
    if (float >= w.min && float < w.max) return w
  }
  return WEAR.BS
}

/**
 * What average input float is needed to produce a given output float for a skin?
 * Inverse of calcOutputFloat.
 */
export function requiredAvgFloat(targetOutputFloat, skin) {
  const range = skin.maxFloat - skin.minFloat
  if (range === 0) return null
  return (targetOutputFloat - skin.minFloat) / range
}

/**
 * For a given avg input float, return the output float AND wear for every possible
 * output skin in the pool. This shows the "distribution" of possible outcomes.
 */
export function analyzeOutputs(avgInputFloat, outputSkins) {
  return outputSkins.map(skin => {
    const outputFloat = calcOutputFloat(avgInputFloat, skin)
    const wear = getWear(outputFloat)
    return {
      skin,
      name: `${skin.weapon} | ${skin.skin}`,
      outputFloat,
      wear,
    }
  })
}

/**
 * Scanner: find all routes where averaging FT-range inputs produces MW or FN output
 * for ALL possible output skins (guaranteed) or a subset (partial).
 *
 * Strategy: user buys cheap low-float FT skins, averages them, gets MW/FN output.
 * Key insight: if avg input is ~0.15–0.17, and output skin maxFloat is 0.80,
 *   outputFloat = 0.15 * 0.80 = 0.12 → MW!
 */
export function scanRoutes(collections, opts = {}) {
  const {
    targetWears = ['FN', 'MW'],
    inputWearMin = 0.15,  // FT low boundary
    inputWearMax = 0.38,  // FT high boundary
    inputTiers = TIER_ORDER.slice(0, -1),
  } = opts

  const results = []

  for (const col of collections) {
    for (let ti = 0; ti < TIER_ORDER.length - 1; ti++) {
      const inputTier = TIER_ORDER[ti]
      const outputTier = TIER_ORDER[ti + 1]

      if (!inputTiers.includes(inputTier)) continue

      const inputSkins = col.tiers[inputTier] || []
      const outputSkins = col.tiers[outputTier] || []
      if (!inputSkins.length || !outputSkins.length) continue

      // For each target wear, find the avg input float range that hits it
      for (const wearCode of targetWears) {
        const targetWear = WEAR[wearCode]
        if (!targetWear) continue

        // For each output skin, what avg input gives this wear?
        const outputAnalysis = outputSkins.map(skin => {
          const range = skin.maxFloat - skin.minFloat
          if (range === 0) return { skin, feasible: false }

          // output must be in [targetWear.min, targetWear.max)
          // outputMin clamp to skin range
          const outMin = Math.max(targetWear.min, skin.minFloat)
          const outMax = Math.min(targetWear.max, skin.maxFloat)
          if (outMin >= outMax) return { skin, feasible: false }

          const avgMin = (outMin - skin.minFloat) / range
          const avgMax = (outMax - skin.minFloat) / range

          // Overlap with FT input range?
          const feasibleMin = Math.max(avgMin, inputWearMin)
          const feasibleMax = Math.min(avgMax, inputWearMax)
          if (feasibleMin >= feasibleMax) return { skin, feasible: false }

          return {
            skin,
            name: `${skin.weapon} | ${skin.skin}`,
            feasible: true,
            avgInputMin: feasibleMin,
            avgInputMax: feasibleMax,
            outFloatMin: calcOutputFloat(feasibleMin, skin),
            outFloatMax: calcOutputFloat(Math.min(feasibleMax, inputWearMax), skin),
          }
        })

        const feasible = outputAnalysis.filter(o => o.feasible)
        if (!feasible.length) continue

        // The "safe" avg input range where ALL output skins hit target wear
        const globalMin = Math.max(...feasible.map(o => o.avgInputMin))
        const globalMax = Math.min(...feasible.map(o => o.avgInputMax))
        const guaranteed = globalMin < globalMax

        results.push({
          id: `${col.id}-${inputTier}-${outputTier}-${wearCode}`,
          collection: col,
          inputTier,
          outputTier,
          targetWear: wearCode,
          inputSkins,
          outputAnalysis,
          feasibleOutputs: feasible,
          totalOutputs: outputSkins.length,
          guaranteed,
          safeAvgMin: guaranteed ? globalMin : null,
          safeAvgMax: guaranteed ? globalMax : null,
          hitRate: feasible.length / outputSkins.length,
        })
      }
    }
  }

  // Sort: guaranteed first, then by hit rate desc
  return results.sort((a, b) => {
    if (a.guaranteed !== b.guaranteed) return b.guaranteed - a.guaranteed
    return b.hitRate - a.hitRate
  })
}
