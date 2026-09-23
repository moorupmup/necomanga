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
const branchChaptersCache = new Map<number, ChapterItem[]>()
const branchFetchingPromises = new Map<number, Promise<ChapterItem[]>>()

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

export const normalizeCoverUrl = (path?: string): string => {
  if (!path) return '/no-cover.svg'
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  if (path.startsWith('/media/')) return `https://remanga.org${path}`
  if (path.startsWith('media/')) return `https://remanga.org/${path}`
  return `https://remanga.org/media/${path.replace(/^\/+/, '')}`
}

export const wrapProxyImageUrl = (url: string): string => {
  if (!url) return ''
  let fixed = url.replace(/^http:\/\//i, 'https://')
  fixed = fixed.replace('img.reimg.org', 'img-reserve.reimg2.org')
  if (isNativePlatform()) {
    return fixed
  }
  return `/api/remanga/img?url=${encodeURIComponent(fixed)}`
}

export const useReManga = () => {
  const resolveUrl = (endpoint: string): string => {
    if (endpoint.startsWith('http')) return endpoint

    // On standard web (Open Server), use local proxy
    if (!isNativePlatform()) {
      return `/api/remanga${endpoint}`
    }

    // Inside Android APK (Capacitor), route directly to ReManga
    const [path, query] = endpoint.split('?')
    const qs = query ? `?${query}` : ''
    const cleanPath = path.replace(/^\/+/, '')

    if (cleanPath === 'catalog') return `https://remanga.org/api/search/catalog/${qs}`
    if (cleanPath === 'search') return `https://remanga.org/api/v2/search/${qs}`
    if (cleanPath === 'forms') return `https://remanga.org/api/forms/titles/${qs}`
    if (cleanPath === 'chapters') return `https://remanga.org/api/titles/chapters/${qs}`
    if (cleanPath === 'top' || cleanPath.startsWith('top?')) return `https://api.remanga.org/api/v2/titles/top/${qs}`

    const chapterMatch = cleanPath.match(/^chapter\/(\d+)/)
    if (chapterMatch) return `https://api.remanga.org/api/v2/titles/chapters/${chapterMatch[1]}/`

    const titleMatch = cleanPath.match(/^title\/([^/]+)/)
    if (titleMatch) return `https://remanga.org/api/titles/${encodeURIComponent(decodeURIComponent(titleMatch[1]))}/`

    return `https://remanga.org/api/${cleanPath}${qs}`
  }

  /**
   * Safe fetch with timeout
   */
  const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const url = resolveUrl(endpoint)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Referer': 'https://remanga.org/',
          ...(options.headers || {})
        }
      })

      if (!response.ok) {
        throw new Error(`ReManga API error: ${response.status} ${response.statusText}`)
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

    return {
      id: dir,
      numericId: item.id,
      dir,
      title,
      altTitle,
      description: item.description || '',
      coverUrl: normalizeCoverUrl(coverMid),
      coverUrlSmall: normalizeCoverUrl(coverLow),
      coverUrlOriginal: normalizeCoverUrl(coverHigh),
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
   * Fetch full title details by dir slug
   */
  const getMangaById = async (dir: string): Promise<MangaTitle> => {
    const data = await apiFetch(`/title/${encodeURIComponent(dir)}`)
    const raw = data.content || data
    if (!raw || !raw.id) {
      throw new Error('Тайтл не найден')
    }
    return formatManga(raw)
  }

  /**
   * Fetch chapters list for a branch
   */
  const getChapters = async (branchId: number, page = 1, count = 100) => {
    const qs = new URLSearchParams({
      branch_id: String(branchId),
      page: String(page),
      count: String(count)
    }).toString()

    const data = await apiFetch(`/chapters?${qs}`)
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
  const getAllChaptersGrouped = async (branchId: number): Promise<{ groups: VolumeGroup[]; allChapters: ChapterItem[] }> => {
    let allChapters: ChapterItem[] = branchChaptersCache.get(branchId) || []

    if (allChapters.length === 0) {
      let page = 1
      let hasMore = true

      // Fetch up to 20 pages (2000 chapters)
      while (hasMore && page <= 20) {
        const res = await getChapters(branchId, page, 100)
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

      branchChaptersCache.set(branchId, allChapters)
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
   * Fetch pages of a single chapter
   */
  const getChapterPages = async (chapterId: string | number) => {
    const data = await apiFetch(`/chapter/${chapterId}`)
    const chapterData = data.content || data

    if (!chapterData || !chapterData.id) {
      throw new Error(data.msg || 'Глава не найдена')
    }

    const rawPages = chapterData.pages || []
    const pageUrls: string[] = []

    for (const item of rawPages) {
      if (Array.isArray(item)) {
        for (const p of item) {
          if (p && p.link) {
            pageUrls.push(wrapProxyImageUrl(p.link))
          }
        }
      } else if (item && item.link) {
        pageUrls.push(wrapProxyImageUrl(item.link))
      }
    }

    return {
      id: String(chapterData.id),
      chapter: String(chapterData.chapter || ''),
      tome: chapterData.tome || 1,
      name: chapterData.name || '',
      isPaid: Boolean(chapterData.is_paid),
      msg: data.msg || '',
      pages: pageUrls,
      branchId: chapterData.branch_id ? Number(chapterData.branch_id) : undefined,
      next: chapterData.next ? {
        id: String(chapterData.next.id),
        chapter: String(chapterData.next.chapter || ''),
        tome: chapterData.next.tome || 1,
        isPaid: Boolean(chapterData.next.is_paid)
      } : null,
      previous: chapterData.previous ? {
        id: String(chapterData.previous.id),
        chapter: String(chapterData.previous.chapter || ''),
        tome: chapterData.previous.tome || 1,
        isPaid: Boolean(chapterData.previous.is_paid)
      } : null
    }
  }

  /**
   * Resolve previous and next chapter from branch chapters
   */
  const getAdjacentChapters = async (
    branchId: number,
    currentChapterId: string | number
  ): Promise<{ prev: ChapterNav | null; next: ChapterNav | null }> => {
    let chapters = branchChaptersCache.get(branchId)

    if (!chapters || chapters.length === 0) {
      if (!branchFetchingPromises.has(branchId)) {
        const fetchPromise = (async () => {
          let list: ChapterItem[] = []
          let page = 1
          let hasMore = true
          while (hasMore && page <= 20) {
            const res = await getChapters(branchId, page, 100)
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
          branchChaptersCache.set(branchId, list)
          return list
        })().finally(() => {
          branchFetchingPromises.delete(branchId)
        })

        branchFetchingPromises.set(branchId, fetchPromise)
      }

      chapters = await branchFetchingPromises.get(branchId)!
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
