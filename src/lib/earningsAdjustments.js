/**
 * Half-month keys from the period dropdown, e.g. "2026-3-second", or "all".
 * Advance / penalty / bonuses / paid are stored per user per key via payout_period_key.
 */

export function aggregateUserAdjustments(rows, userId) {
  const list = rows.filter(a => a.user_id === userId)
  if (!list.length) return {}
  const acc = {
    advance: 0,
    penalty: 0,
    vence_bonus: 0,
    owner_bonus: 0,
    paid: true,
  }
  for (const r of list) {
    acc.advance += +(r.advance || 0)
    acc.penalty += +(r.penalty || 0)
    acc.vence_bonus += +(r.vence_bonus || 0)
    acc.owner_bonus += +(r.owner_bonus || 0)
    if (r.paid === false) acc.paid = false
  }
  return acc
}

export function adjustmentForPeriod(adjusts, userId, periodFilter) {
  if (!userId) return {}
  if (periodFilter === 'all') return aggregateUserAdjustments(adjusts, userId)
  return adjusts.find(a => a.user_id === userId && a.payout_period_key === periodFilter) || {}
}

export function findAdjustmentRow(adjusts, userId, periodFilter) {
  if (!userId || periodFilter === 'all') return null
  return adjusts.find(a => a.user_id === userId && a.payout_period_key === periodFilter) || null
}
