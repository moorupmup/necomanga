import type { H3Event } from 'h3'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const ALLOWED_IMAGE_HOSTS = [
  'remanga.org',
  'reimg.org',
  'reimg2.org',
  'img.reimg.org',
  'img-reserve.reimg2.org',
]

function remangaRoute(pathname: string) {
  const prefix = '/api/remanga/'
  if (!pathname.startsWith(prefix)) return ''
  return decodeURIComponent(pathname.slice(prefix.length)).replace(/\/+$/, '')
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

  if (route === 'catalog') return `https://api.remanga.org/api/search/catalog/${qs}`
  if (route === 'search') return `https://api.remanga.org/api/v2/search/${qs}`
  if (route === 'forms') return `https://api.remanga.org/api/forms/titles/${qs}`
  if (route === 'chapters') return `https://api.remanga.org/api/titles/chapters/${qs}`

  const chapter = route.match(/^chapter\/(\d+)/)
  if (chapter) return `https://api.remanga.org/api/v2/titles/chapters/${chapter[1]}/`

  const title = route.match(/^title\/([^/]+)/)
  if (title) {
    return `https://api.remanga.org/api/titles/${encodeURIComponent(decodeURIComponent(title[1]))}/`
  }

  return null
}

async function proxyJson(event: H3Event, targetUrl: string) {
  let upstream: Response
  try {
    upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent': UA,
        Referer: 'https://remanga.org/',
        Accept: 'application/json',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    })
  } catch {
    setResponseStatus(event, 502)
    return { error: 'Upstream request failed' }
  }

  setResponseStatus(event, upstream.status || 500)
  setResponseHeader(event, 'content-type', 'application/json; charset=utf-8')
  const text = await upstream.text()
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
        'User-Agent': UA,
        Referer: 'https://remanga.org/',
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
  const route = remangaRoute(requestUrl.pathname)

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
