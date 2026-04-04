/**
 * Sales entry dates from Postgres are calendar dates (YYYY-MM-DD).
 * Never use `new Date('YYYY-MM-DD')` for period math — it is UTC midnight and
 * shifts the local calendar day in US timezones.
 */

/**
 * True if DB date string falls in a half-month period key, e.g. "2026-4-first".
 */
export function entryDateInPeriod(dateStr, period) {
  if (!dateStr || period === 'all') return true
  const dayPart = String(dateStr).split('T')[0]
  const seg = dayPart.split('-')
  if (seg.length !== 3) return false
  const y = +seg[0]
  const mo = +seg[1]
  const d = +seg[2]
  const parts = period.split('-')
  const py = +parts[0]
  const pm = +parts[1]
  if (y !== py || mo !== pm) return false
  return period.endsWith('first') ? d <= 15 : d > 15
}

/**
 * Owner dashboard quick entry:
 * - YYYY-MM-DD
 * - D.M or D.M.YYYY — European day.month (3.4 = 3 April)
 * - M/D or M/D/YYYY — US month/day (4/3 = 3 April)
 */
export function parseSalesEntryDateInput(raw) {
  if (!raw) return null
  const t = raw.trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t

  const us = t.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/)
  if (us) {
    const month = +us[1]
    const day = +us[2]
    const year = us[3] || '2026'
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
    return null
  }

  const eu = t.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?$/)
  if (eu) {
    const day = +eu[1]
    const month = +eu[2]
    const year = eu[3] || '2026'
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
    return null
  }

  return null
}
