import { useContentSourceStore } from '~/stores/contentSource'

export interface MangaTitle {
  id: string // slug / dir
  numericId?: number
  dir: string
  title: string
  altTitle?: string
  description?: string
  coverUrl: string
  coverUrlSmall: string
  coverUrlOriginal: string
  contentType?: 'manga' | 'novel'
  status: string
  statusId?: number
  translateStatus?: string
  year?: number
  avgRating?: string
  totalVotes?: number
  totalViews?: number
  countBookmarks?: number
  countChapters?: number
  genres: string[]
  categories: string[]
  type: string // "Манхва", "Маньхуа", "Манга", etc.
  typeId?: number
  originalLanguage?: string
  branches?: {
    id: number
    count_chapters: number
    publishers: { id: number; name: string }[]
    total_votes?: number
  }[]
  firstChapter?: {
    id: number
    tome: number
    chapter: string
  }
}

export interface ChapterItem {
  id: string
  chapter: string
  tome?: string | number
  name?: string
  publishAt?: string
  uploadDate?: string
  isPaid?: boolean
  price?: string | null
  score?: number
  groupName?: string
  index?: number
}

export interface VolumeGroup {
  volume: string
  chapters: ChapterItem[]
}

export interface ChapterNav {
  id: string
  chapter: string
  tome?: string | number
  name?: string
  isPaid?: boolean
}

// Module-level in-memory cache for branch chapters
const branchChaptersCache = new Map<string, ChapterItem[]>()
const branchFetchingPromises = new Map<string, Promise<ChapterItem[]>>()

export interface ReMangaGenre {
  id: number
  name: string
  description?: string
  dir?: string
}

export interface ReMangaType {
  id: number
  name: string
}

export interface ReMangaStatus {
  id: number
  name: string
}

export const isNativePlatform = (): boolean => {
  if (typeof window === 'undefined') return false
  const proto = window.location.protocol
  const host = window.location.hostname
  const port = window.location.port
  return (
    proto === 'capacitor:' ||
    proto === 'ionic:' ||
    ((host === 'localhost' || host === '127.0.0.1') && !port) ||
    Boolean((window as any).Capacitor?.isNativePlatform?.())
  )
}

export const normalizeCoverUrl = (path?: string, isRanobe = false): string => {
  if (!path) return '/no-cover.svg'
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const host = isRanobe ? 'https://renovels.org' : 'https://remanga.org'
  if (path.startsWith('/media/')) return `${host}${path}`
  if (path.startsWith('media/')) return `${host}/${path}`
  return `${host}/media/${path.replace(/^\/+/, '')}`
}

export const wrapProxyImageUrl = (url: string, isRanobe = false): string => {
  if (!url) return ''
  let fixed = url.replace(/^http:\/\//i, 'https://')
  fixed = fixed.replace('img.reimg.org', 'img-reserve.reimg2.org')
  if (isNativePlatform()) {
    return fixed
  }
  const isNovelImg = isRanobe || fixed.includes('renovels.org')
  const proxyEndpoint = isNovelImg ? '/api/renovels/img' : '/api/remanga/img'
  return `${proxyEndpoint}?url=${encodeURIComponent(fixed)}`
}

export const useReManga = () => {
  const contentSourceStore = useContentSourceStore()

  const resolveUrl = (endpoint: string, isNovelOverride?: boolean): string => {
    if (endpoint.startsWith('http')) return endpoint
    const isNovel = isNovelOverride !== undefined ? isNovelOverride : contentSourceStore.isRanobe

    // On standard web (Open Server), use local proxy
    if (!isNativePlatform()) {
      return isNovel ? `/api/renovels${endpoint}` : `/api/remanga${endpoint}`
    }

    // Inside Android APK (Capacitor), route directly to ReManga or ReNovels
    const [path, query] = endpoint.split('?')
    const qs = query ? `?${query}` : ''
    const cleanPath = path.replace(/^\/+/, '')

    if (isNovel) {
      if (cleanPath === 'catalog') return `https://api.renovels.org/api/search/catalog/${qs}`
      if (cleanPath === 'search') return `https://api.renovels.org/api/v2/search/${qs}`
      if (cleanPath === 'forms') return `https://api.renovels.org/api/forms/titles/${qs}`
      if (cleanPath === 'chapters') return `https://api.renovels.org/api/titles/chapters/${qs}`
      if (cleanPath === 'top' || cleanPath.startsWith('top?')) return `https://api.renovels.org/api/v2/titles/top/${qs}`

      const chapterMatch = cleanPath.match(/^chapter\/(\d+)/)
      if (chapterMatch) return `https://api.renovels.org/api/v2/titles/chapters/${chapterMatch[1]}/`

      const titleMatch = cleanPath.match(/^title\/([^/]+)/)
      if (titleMatch) return `https://api.renovels.org/api/titles/${encodeURIComponent(decodeURIComponent(titleMatch[1]))}/${qs}`

      return `https://api.renovels.org/api/${cleanPath}${qs}`
    }

    if (cleanPath === 'catalog') return `https://remanga.org/api/search/catalog/${qs}`
    if (cleanPath === 'search') return `https://remanga.org/api/v2/search/${qs}`
    if (cleanPath === 'forms') return `https://remanga.org/api/forms/titles/${qs}`
    if (cleanPath === 'chapters') return `https://remanga.org/api/titles/chapters/${qs}`
    if (cleanPath === 'top' || cleanPath.startsWith('top?')) return `https://api.remanga.org/api/v2/titles/top/${qs}`

    const chapterMatch = cleanPath.match(/^chapter\/(\d+)/)
    if (chapterMatch) return `https://api.remanga.org/api/v2/titles/chapters/${chapterMatch[1]}/`

    const titleMatch = cleanPath.match(/^title\/([^/]+)/)
    if (titleMatch) return `https://remanga.org/api/titles/${encodeURIComponent(decodeURIComponent(titleMatch[1]))}/${qs}`

    return `https://remanga.org/api/${cleanPath}${qs}`
  }

  /**
   * Safe fetch with timeout
   */
  const apiFetch = async (endpoint: string, options: RequestInit = {}, isNovelOverride?: boolean) => {
    const url = resolveUrl(endpoint, isNovelOverride)
    const isNovel = isNovelOverride !== undefined ? isNovelOverride : contentSourceStore.isRanobe

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          ...(options.headers || {})
        }
      })

      if (!response.ok) {
        throw new Error(`${isNovel ? 'ReNovels' : 'ReManga'} API error: ${response.status} ${response.statusText}`)
      }

      const contentType = response.headers.get('content-type') || ''
      if (contentType && !contentType.includes('application/json') && !contentType.includes('text/json')) {
        const text = await response.text()
        throw new Error(`Некорректный формат ответа (${contentType}): ${text.slice(0, 100)}`)
      }

      return await response.json()
    } finally {
      clearTimeout(timeout)
    }
  }

  /**
   * Helper to format raw ReManga title object to MangaTitle
   */
  const formatManga = (item: any): MangaTitle => {
    const dir = item.dir || String(item.id)
    const title = item.main_name || item.rus_name || item.name || ''
    const altTitle = item.secondary_name || item.en_name || item.another_name || ''

    const coverHigh = item.cover?.high || item.img?.high || item.cover?.mid || item.cover?.low || ''
    const coverMid = item.cover?.mid || item.img?.mid || coverHigh
    const coverLow = item.cover?.low || item.img?.low || coverMid

    // Determine type label and id
    let typeName = 'Манга'
    let typeId: number | undefined
    if (typeof item.type === 'object' && item.type) {
      typeName = item.type.name || 'Манга'
      typeId = item.type.id
    } else if (typeof item.type === 'string') {
      typeName = item.type
    }

    // Determine language from type
    let originalLanguage = 'ja'
    if (typeName.toLowerCase().includes('манхва') || typeId === 2) originalLanguage = 'ko'
    if (typeName.toLowerCase().includes('маньхуа') || typeId === 3) originalLanguage = 'zh'
    if (typeName.toLowerCase().includes('рукомикс') || typeId === 5) originalLanguage = 'ru'

    // Determine status label and id
    let statusName = 'Онгоинг'
    let statusId: number | undefined
    if (typeof item.status === 'object' && item.status) {
      statusName = item.status.name || 'Онгоинг'
      statusId = item.status.id
    } else if (typeof item.status === 'string') {
      statusName = item.status
    }

    // Genres & categories
    const genres = (item.genres || []).map((g: any) => (typeof g === 'object' ? g.name : g))
    const categories = (item.categories || []).map((c: any) => (typeof c === 'object' ? c.name : c))

    const isNovel = (item.content_type === 'book' || item.type?.id === 4 || item.type?.name?.toLowerCase().includes('ранобэ'))
      ? true
      : (item.content_type === 'comics' ? false : contentSourceStore.isRanobe)

    return {
      id: dir,
      numericId: item.id,
      dir,
      title,
      altTitle,
      description: item.description || '',
      coverUrl: normalizeCoverUrl(coverMid, isNovel),
      coverUrlSmall: normalizeCoverUrl(coverLow, isNovel),
      coverUrlOriginal: normalizeCoverUrl(coverHigh, isNovel),
      contentType: isNovel ? 'novel' : 'manga',
      status: statusName,
      statusId,
      translateStatus: typeof item.translate_status === 'object' ? item.translate_status?.name : item.translate_status,
      year: item.issue_year,
      avgRating: item.avg_rating ? String(item.avg_rating) : undefined,
      totalVotes: item.total_votes,
      totalViews: item.total_views,
      countBookmarks: item.count_bookmarks,
      countChapters: item.count_chapters,
      genres,
      categories,
      type: typeName,
      typeId,
      originalLanguage,
      branches: item.branches,
      firstChapter: item.first_chapter
    }
  }

  /**
   * Fetch catalog titles
   */
  const getMangaList = async (params: {
    ordering?: string
    types?: number | string
    genres?: string | number[]
    categories?: string | number[]
    status?: number | string
    query?: string
    page?: number
    count?: number
  } = {}) => {
    const page = params.page || 1
    const count = params.count || 24

    const queryParams: Record<string, string> = {
      page: String(page),
      count: String(count),
      ordering: params.ordering || '-rating'
    }

    if (params.query?.trim()) {
      queryParams.query = params.query.trim()
    }
    if (params.types && params.types !== 'all') {
      queryParams.types = String(params.types)
    }
    if (params.status && params.status !== 'all') {
      queryParams.status = String(params.status)
    }
    if (params.genres) {
      queryParams.genres = Array.isArray(params.genres) ? params.genres.join(',') : String(params.genres)
    }
    if (params.categories) {
      queryParams.categories = Array.isArray(params.categories) ? params.categories.join(',') : String(params.categories)
    }

    const qs = new URLSearchParams(queryParams).toString()
    const data = await apiFetch(`/catalog?${qs}`)

    const items = (data.content || []).map(formatManga)
    const total = data.props?.total_items || items.length
    const totalPages = data.props?.total_pages || 1

    return {
      items,
      total,
      hasMore: page < totalPages
    }
  }

  /**
   * Fast search with autocomplete
   */
  const searchManga = async (queryText: string, page = 1, count = 10) => {
    if (!queryText.trim()) return { items: [], total: 0, hasMore: false }

    const qs = new URLSearchParams({
      query: queryText.trim(),
      page: String(page),
      count: String(count)
    }).toString()

    const data = await apiFetch(`/search?${qs}`)
    const rawResults = data.results || data.content || []
    const items = rawResults.map(formatManga)
    const total = data.meta?.total_items || items.length

    return {
      items,
      total,
      hasMore: page < (data.meta?.total_pages || 1)
    }
  }

  /**
   * Fetch full title details by dir slug with smart fallback for ReNovels
   */
  const getMangaById = async (dir: string, fallbackTitle = '', isNovelOverride?: boolean): Promise<MangaTitle> => {
    const isNovel = isNovelOverride !== undefined ? isNovelOverride : contentSourceStore.isRanobe
    const titleQuery = fallbackTitle ? `?title=${encodeURIComponent(fallbackTitle)}` : ''

    try {
      const data = await apiFetch(`/title/${encodeURIComponent(dir)}${titleQuery}`, {}, isNovel)
      const raw = data.content || data
      if (raw && raw.id) {
        return formatManga(raw)
      }
    } catch (e: any) {
      if (!isNovel) throw e
    }

    if (isNovel) {
      const candidates: string[] = []
      if (!dir.startsWith('rn')) {
        candidates.push(`rn${dir}`)
      }
      const stripped = dir.replace(/^(novel-|\d+-)/, '')
      if (stripped !== dir) {
        candidates.push(stripped)
        candidates.push(`rn${stripped}`)
      }

      for (const cand of candidates) {
        try {
          const cData = await apiFetch(`/title/${encodeURIComponent(cand)}`, {}, true)
          const raw = cData.content || cData
          if (raw && raw.id) {
            return formatManga(raw)
          }
        } catch {
          // continue
        }
      }

      const searchQueries = [
        fallbackTitle.replace(/\s*\(.*?\)\s*/g, ' ').trim(),
        dir.replace(/^(rn|novel-|\d+-)/, '').replace(/[-_]/g, ' ').trim()
      ].filter(t => t.length >= 2)

      for (const query of searchQueries) {
        try {
          const results = await searchManga(query)
          for (const item of results) {
            if (item.dir && item.dir !== dir) {
              try {
                const sData = await apiFetch(`/title/${encodeURIComponent(item.dir)}`, {}, true)
                const raw = sData.content || sData
                if (raw && raw.id) {
                  return formatManga(raw)
                }
              } catch {
                if (!item.dir.startsWith('rn')) {
                  try {
                    const rnData = await apiFetch(`/title/${encodeURIComponent('rn' + item.dir)}`, {}, true)
                    const raw = rnData.content || rnData
                    if (raw && raw.id) {
                      return formatManga(raw)
                    }
                  } catch {
                    // continue
                  }
                }
              }
            }
          }
        } catch {
          // continue
        }
      }
    }

    throw new Error('Тайтл не найден')
  }

  /**
   * Fetch chapters list for a branch
   */
  const getChapters = async (branchId: number, page = 1, count = 100, isNovelOverride?: boolean) => {
    const qs = new URLSearchParams({
      branch_id: String(branchId),
      page: String(page),
      count: String(count)
    }).toString()

    const data = await apiFetch(`/chapters?${qs}`, {}, isNovelOverride)
    const rawList = data.content || data.results || []

    const chapters: ChapterItem[] = rawList.map((ch: any) => ({
      id: String(ch.id),
      chapter: String(ch.chapter || ''),
      tome: ch.tome,
      name: ch.name || '',
      uploadDate: ch.upload_date,
      publishAt: ch.upload_date,
      isPaid: Boolean(ch.is_paid),
      price: ch.price,
      score: ch.score,
      groupName: ch.publishers?.[0]?.name,
      index: ch.index
    }))

    return {
      chapters,
      hasMore: rawList.length >= count
    }
  }

  /**
   * Fetch all chapters grouped by volumes
   */
  const getAllChaptersGrouped = async (branchId: number, isNovelOverride?: boolean): Promise<{ groups: VolumeGroup[]; allChapters: ChapterItem[] }> => {
    const isNovel = isNovelOverride !== undefined ? isNovelOverride : contentSourceStore.isRanobe
    const cacheKey = `${isNovel ? 'novel' : 'manga'}_${branchId}`
    let allChapters: ChapterItem[] = branchChaptersCache.get(cacheKey) || []

    if (allChapters.length === 0) {
      let page = 1
      let hasMore = true

      // Fetch up to 20 pages (2000 chapters)
      while (hasMore && page <= 20) {
        const res = await getChapters(branchId, page, 100, isNovel)
        allChapters.push(...res.chapters)
        hasMore = res.hasMore
        page++
      }

      // Sort ascending by index or chapter number
      allChapters.sort((a, b) => {
        if (a.index !== undefined && b.index !== undefined) {
          return a.index - b.index
        }
        return (parseFloat(a.chapter) || 0) - (parseFloat(b.chapter) || 0)
      })

      branchChaptersCache.set(cacheKey, allChapters)
    }

    // Group by volume
    const volumeMap: Record<string, ChapterItem[]> = {}
    for (const ch of allChapters) {
      const vol = ch.tome ? `Том ${ch.tome}` : 'Без тома'
      if (!volumeMap[vol]) volumeMap[vol] = []
      volumeMap[vol].push(ch)
    }

    const groups: VolumeGroup[] = Object.entries(volumeMap).map(([volume, chapters]) => ({
      volume,
      chapters
    }))

    return {
      groups,
      allChapters
    }
  }

  /**
   * Fetch pages/text of a single chapter
   * Automatically falls back to the other source (ReNovels <-> ReManga) if not found
   */
  const getChapterPages = async (chapterId: string | number, preferNovel?: boolean) => {
    const primaryIsNovel = preferNovel !== undefined ? preferNovel : contentSourceStore.isRanobe
    let data: any = null
    let usedIsNovel = primaryIsNovel

    const isValidChapter = (d: any) => {
      if (!d) return false
      if (d.id) return true
      if (typeof d.content === 'object' && d.content !== null && !Array.isArray(d.content) && d.content.id) return true
      return false
    }

    // 1. Try primary source
    try {
      data = await apiFetch(`/chapter/${chapterId}`, {}, primaryIsNovel)
      if (!isValidChapter(data)) {
        throw new Error('Invalid chapter response')
      }
    } catch (primaryErr) {
      // 2. Fallback to alternative source
      try {
        usedIsNovel = !primaryIsNovel
        data = await apiFetch(`/chapter/${chapterId}`, {}, usedIsNovel)
        if (!isValidChapter(data)) {
          throw primaryErr
        }
      } catch {
        throw primaryErr
      }
    }

    // Safely extract chapterData
    const isContentAnObject = typeof data.content === 'object' && data.content !== null && !Array.isArray(data.content) && ('id' in data.content || 'pages' in data.content)
    const chapterData = isContentAnObject ? data.content : data

    const chapterIdVal = chapterData.id || data.id || chapterId
    if (!chapterIdVal) {
      throw new Error(data?.msg || chapterData?.msg || 'Глава не найдена')
    }

    let contentHtml: string | null = null
    if (typeof chapterData.content === 'string') {
      contentHtml = chapterData.content
    } else if (typeof data.content === 'string') {
      contentHtml = data.content
    }

    const contentType = chapterData.content_type || data.content_type || (contentHtml ? 'book' : 'comics')
    const isNovel = contentType === 'book' || Boolean(contentHtml) || usedIsNovel

    const rawPages = chapterData.pages || data.pages || []
    const pageUrls: string[] = []

    for (const item of rawPages) {
      if (Array.isArray(item)) {
        for (const p of item) {
          if (p && p.link) {
            pageUrls.push(wrapProxyImageUrl(p.link, isNovel))
          }
        }
      } else if (item && item.link) {
        pageUrls.push(wrapProxyImageUrl(item.link, isNovel))
      }
    }

    return {
      id: String(chapterIdVal),
      chapter: String(chapterData.chapter ?? data.chapter ?? ''),
      tome: chapterData.tome ?? data.tome ?? 1,
      name: chapterData.name ?? data.name ?? '',
      isPaid: Boolean(chapterData.is_paid ?? data.is_paid),
      msg: data.msg || chapterData.msg || '',
      pages: pageUrls,
      content: contentHtml,
      contentType,
      isNovel,
      branchId: (chapterData.branch_id || data.branch_id) ? Number(chapterData.branch_id || data.branch_id) : undefined,
      next: (chapterData.next || data.next) ? {
        id: String((chapterData.next || data.next).id),
        chapter: String((chapterData.next || data.next).chapter || ''),
        tome: (chapterData.next || data.next).tome || 1,
        isPaid: Boolean((chapterData.next || data.next).is_paid)
      } : null,
      previous: (chapterData.previous || data.previous) ? {
        id: String((chapterData.previous || data.previous).id),
        chapter: String((chapterData.previous || data.previous).chapter || ''),
        tome: (chapterData.previous || data.previous).tome || 1,
        isPaid: Boolean((chapterData.previous || data.previous).is_paid)
      } : null
    }
  }

  /**
   * Resolve previous and next chapter from branch chapters
   */
  const getAdjacentChapters = async (
    branchId: number,
    currentChapterId: string | number,
    isNovelOverride?: boolean
  ): Promise<{ prev: ChapterNav | null; next: ChapterNav | null }> => {
    const isNovel = isNovelOverride !== undefined ? isNovelOverride : contentSourceStore.isRanobe
    const cacheKey = `${isNovel ? 'novel' : 'manga'}_${branchId}`
    let chapters = branchChaptersCache.get(cacheKey)

    if (!chapters || chapters.length === 0) {
      if (!branchFetchingPromises.has(cacheKey)) {
        const fetchPromise = (async () => {
          let list: ChapterItem[] = []
          let page = 1
          let hasMore = true
          while (hasMore && page <= 20) {
            const res = await getChapters(branchId, page, 100, isNovel)
            list.push(...res.chapters)
            hasMore = res.hasMore
            page++
          }
          list.sort((a, b) => {
            if (a.index !== undefined && b.index !== undefined) {
              return a.index - b.index
            }
            return (parseFloat(a.chapter) || 0) - (parseFloat(b.chapter) || 0)
          })
          branchChaptersCache.set(cacheKey, list)
          return list
        })().finally(() => {
          branchFetchingPromises.delete(cacheKey)
        })

        branchFetchingPromises.set(cacheKey, fetchPromise)
      }

      chapters = await branchFetchingPromises.get(cacheKey)!
    }

    if (!chapters || chapters.length === 0) {
      return { prev: null, next: null }
    }

    const strId = String(currentChapterId)
    const idx = chapters.findIndex(c => String(c.id) === strId)

    if (idx === -1) {
      return { prev: null, next: null }
    }

    const prev: ChapterNav | null = idx > 0 ? {
      id: chapters[idx - 1].id,
      chapter: chapters[idx - 1].chapter,
      tome: chapters[idx - 1].tome,
      name: chapters[idx - 1].name,
      isPaid: chapters[idx - 1].isPaid
    } : null

    const next: ChapterNav | null = idx < chapters.length - 1 ? {
      id: chapters[idx + 1].id,
      chapter: chapters[idx + 1].chapter,
      tome: chapters[idx + 1].tome,
      name: chapters[idx + 1].name,
      isPaid: chapters[idx + 1].isPaid
    } : null

    return { prev, next }
  }

  /**
   * Fetch filter options (genres, categories, types, status)
   */
  const getFilters = async () => {
    const data = await apiFetch('/forms?get=genres&get=categories&get=types&get=status')
    const content = data.content || {}
    return {
      genres: (content.genres || []) as ReMangaGenre[],
      categories: (content.categories || []) as ReMangaGenre[],
      types: (content.types || []) as ReMangaType[],
      status: (content.status || []) as ReMangaStatus[]
    }
  }

  /**
   * Fetch trending titles ("В тренде") from ReManga v2/titles/top
   */
  const getTrendingTitles = async (count = 8): Promise<MangaTitle[]> => {
    try {
      const data = await apiFetch(`/top?count=${count}`)
      const rawList = data.titles || data.content || []
      return rawList.map(formatManga)
    } catch (e) {
      console.error('Failed to load trending titles', e)
      return []
    }
  }

  return {
    getMangaList,
    getTrendingTitles,
    searchManga,
    getMangaById,
    getChapters,
    getAllChaptersGrouped,
    getChapterPages,
    getAdjacentChapters,
    getFilters
  }
}
