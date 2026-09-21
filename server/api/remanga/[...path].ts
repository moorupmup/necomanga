import type { H3Event } from 'h3'

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent': BROWSER_UA,
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
  'Referer': 'https://remanga.org/',
  'Origin': 'https://remanga.org',
  'Sec-Ch-Ua': '"Not A(Brand";v="8", "Chromium";v="132", "Google Chrome";v="132"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
  'Cache-Control': 'no-cache',
}

const ALLOWED_IMAGE_HOSTS = [
  'remanga.org',
  'reimg.org',
  'reimg2.org',
  'img.reimg.org',
  'img-reserve.reimg2.org',
]

function remangaRoute(event: H3Event): string {
  // Try route params from Nitro first
  const params = event.context.params?.path
  if (params) {
    return (Array.isArray(params) ? params.join('/') : params).replace(/\/+$/, '')
  }

  // Fallback to URL pathname
  const pathname = getRequestURL(event).pathname
  const prefix = '/api/remanga/'
  if (pathname.startsWith(prefix)) {
    return decodeURIComponent(pathname.slice(prefix.length)).replace(/\/+$/, '')
  }
  return pathname.replace(/^\/+/, '').replace(/\/+$/, '')
}

function isAllowedImageHost(host: string) {
  return ALLOWED_IMAGE_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))
}

function resolveImageUrl(raw: string) {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return null
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
  if (parsed.username || parsed.password) return null

  const host = parsed.hostname.toLowerCase()
  if (!isAllowedImageHost(host)) return null

  if (host === 'img.reimg.org') {
    parsed.hostname = 'img-reserve.reimg2.org'
  }

  return parsed
}

function resolveTarget(route: string, search: string) {
  const qs = search || '?'

  // Use primary remanga.org domain instead of api subdomain (less aggressive WAF filtering)
  if (route === 'catalog') return `https://remanga.org/api/search/catalog/${qs}`
  if (route === 'search') return `https://remanga.org/api/v2/search/${qs}`
  if (route === 'forms') return `https://remanga.org/api/forms/titles/${qs}`
  if (route === 'chapters') return `https://remanga.org/api/titles/chapters/${qs}`

  const chapter = route.match(/^chapter\/(\d+)/)
  if (chapter) return `https://remanga.org/api/v2/titles/chapters/${chapter[1]}/`

  const title = route.match(/^title\/([^/]+)/)
  if (title) {
    return `https://remanga.org/api/titles/${encodeURIComponent(decodeURIComponent(title[1]))}/`
  }

  return null
}

async function proxyJson(event: H3Event, targetUrl: string) {
  let upstream: Response
  try {
    upstream = await fetch(targetUrl, {
      headers: BROWSER_HEADERS,
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    })
  } catch (err: any) {
    console.error('[ReManga Proxy] Upstream request failed:', err)
    setResponseStatus(event, 502)
    return { error: 'Upstream request failed', message: err?.message }
  }

  const status = upstream.status || 500
  setResponseStatus(event, status)
  setResponseHeader(event, 'content-type', 'application/json; charset=utf-8')

  const text = await upstream.text()

  if (!upstream.ok) {
    console.error(`[ReManga Proxy] Upstream returned status ${status} for ${targetUrl}`)
    // If upstream returns 403 HTML page (e.g. from DDoS-Guard), wrap in informative JSON
    if (text.startsWith('<') || text.includes('<html>') || text.includes('ddos-guard')) {
      return JSON.stringify({
        error: 'Blocked by DDoS-Guard on upstream server',
        status,
        targetUrl,
        hint: 'ReManga DDoS protection blocks cloud datacenter IPs (like AWS/Vercel). A proxy or residential/RU server is required.'
      })
    }
  }

  return text || JSON.stringify({ error: 'Empty response from upstream' })
}

async function proxyImage(rawUrl: string) {
  const imageUrl = resolveImageUrl(rawUrl)
  if (!rawUrl) {
    return { status: 400, body: { error: 'Missing url parameter' } }
  }
  if (!imageUrl) {
    return { status: 403, body: { error: 'Disallowed domain' } }
  }

  let upstream: Response
  try {
    upstream = await fetch(imageUrl, {
      headers: {
        'User-Agent': BROWSER_UA,
        'Referer': 'https://remanga.org/',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    })
  } catch {
    return { status: 502, body: { error: 'Upstream request failed' } }
  }

  const headers = new Headers()
  const contentType = upstream.headers.get('content-type')
  const contentLength = upstream.headers.get('content-length')
  const etag = upstream.headers.get('etag')
  if (contentType) headers.set('content-type', contentType)
  if (contentLength) headers.set('content-length', contentLength)
  if (etag) headers.set('etag', etag)
  headers.set('access-control-allow-origin', '*')
  if (upstream.ok) {
    headers.set('cache-control', 'public, max-age=2592000, immutable')
  }

  return new Response(upstream.body, {
    status: upstream.status || 502,
    headers,
  })
}

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'Content-Type, Authorization, X-Requested-With',
  })

  if (event.method === 'OPTIONS') {
    setResponseStatus(event, 204)
    return null
  }

  if (event.method !== 'GET') {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  const requestUrl = getRequestURL(event)
  const route = remangaRoute(event)

  if (route === 'img') {
    const result = await proxyImage(requestUrl.searchParams.get('url') || '')
    if (result instanceof Response) return result
    setResponseStatus(event, result.status)
    return result.body
  }

  const target = resolveTarget(route, requestUrl.search)
  if (!target) {
    setResponseStatus(event, 404)
    return { error: 'Unknown ReManga API route', route }
  }

  return proxyJson(event, target)
})
