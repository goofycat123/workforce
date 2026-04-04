const BASE = '/api/pricempire'

async function peFetch(path) {
  const res = await fetch(`${BASE}${path.startsWith('/') ? path : `/${path}`}`, {
    headers: { Accept: 'application/json' },
  })
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { _raw: text }
  }
  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && (data.message || data.error)) ||
      `HTTP ${res.status}`
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }
  return data
}

export function fetchPortfolios() {
  return peFetch('/portfolios')
}

export function fetchPortfolioDetails(slug) {
  return peFetch(`/portfolios/${encodeURIComponent(slug)}`)
}
