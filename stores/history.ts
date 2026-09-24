import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface HistoryItem {
  mangaId: string
  mangaTitle: string
  coverUrl: string
  chapterId: string
  chapterNumber: string
  volumeNumber?: string
  chapterTitle?: string
  pageIndex?: number
  timestamp: number
  contentType?: 'manga' | 'novel'
  mangaDir?: string
  numericId?: number
}

export const useHistoryStore = defineStore('history', () => {
  const history = ref<HistoryItem[]>([])
  // Map of manga identifier -> array of read chapter IDs
  const readChapters = ref<Record<string, string[]>>({})

  const init = () => {
    if (typeof window !== 'undefined') {
      try {
        const storedHistory = localStorage.getItem('mangadex_ru_history')
        if (storedHistory) {
          history.value = JSON.parse(storedHistory)
        }
      } catch (e) {
        console.error('Failed to load history', e)
      }

      try {
        const storedReadChapters = localStorage.getItem('mangadex_ru_read_chapters')
        if (storedReadChapters) {
          readChapters.value = JSON.parse(storedReadChapters)
        }
      } catch (e) {
        console.error('Failed to load read chapters', e)
      }
    }
  }

  const save = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('mangadex_ru_history', JSON.stringify(history.value))
      } catch (e) {
        console.error('Failed to save history', e)
      }

      try {
        localStorage.setItem('mangadex_ru_read_chapters', JSON.stringify(readChapters.value))
      } catch (e) {
        console.error('Failed to save read chapters', e)
      }
    }
  }

  /**
   * Internal helper to link chapter ID to manga read set
   */
  const addChapterToReadMap = (idOrDir: string, chapterId: string) => {
    if (!idOrDir || !chapterId) return
    const key = String(idOrDir).trim().toLowerCase()
    if (!readChapters.value[key]) {
      readChapters.value[key] = []
    }
    const strChId = String(chapterId)
    if (!readChapters.value[key].includes(strChId)) {
      readChapters.value[key].push(strChId)
    }
  }

  /**
   * Record viewing progress for a title (called when entering or advancing chapters)
   */
  const recordProgress = (item: Omit<HistoryItem, 'timestamp'>) => {
    const mangaKey = item.mangaDir || item.mangaId

    // 1. Mark this specific chapter as read
    addChapterToReadMap(item.mangaId, item.chapterId)
    if (item.mangaDir) addChapterToReadMap(item.mangaDir, item.chapterId)
    if (item.numericId) addChapterToReadMap(String(item.numericId), item.chapterId)

    // 2. Remove previous entry for this manga to avoid duplicate cards in history
    history.value = history.value.filter(h => {
      const matchId = h.mangaId === item.mangaId || (item.mangaDir && h.mangaId === item.mangaDir)
      const matchDir = item.mangaDir && h.mangaDir && h.mangaDir === item.mangaDir
      const matchNum = item.numericId && h.numericId && h.numericId === item.numericId
      return !(matchId || matchDir || matchNum)
    })

    // 3. Add updated entry at top
    history.value.unshift({
      ...item,
      timestamp: Date.now()
    })

    // Limit to 50 items
    if (history.value.length > 50) {
      history.value = history.value.slice(0, 50)
    }

    save()
  }

  /**
   * Explicitly mark a chapter as completed/read during reading
   */
  const markChapterRead = (
    mangaId: string,
    chapterId: string,
    chapterNumber?: string,
    contentType?: 'manga' | 'novel',
    extra?: Partial<HistoryItem>
  ) => {
    if (!mangaId || !chapterId) return

    addChapterToReadMap(mangaId, chapterId)
    if (extra?.mangaDir) addChapterToReadMap(extra.mangaDir, chapterId)
    if (extra?.numericId) addChapterToReadMap(String(extra.numericId), chapterId)

    // Check if we have an existing history item to update chapter info
    const existing = getLastRead(mangaId, extra?.numericId)
    if (existing) {
      existing.chapterId = String(chapterId)
      if (chapterNumber) existing.chapterNumber = String(chapterNumber)
      if (contentType) existing.contentType = contentType
      if (extra?.chapterTitle) existing.chapterTitle = extra.chapterTitle
      if (extra?.volumeNumber) existing.volumeNumber = extra.volumeNumber
      existing.timestamp = Date.now()
    } else if (extra?.mangaTitle && extra?.coverUrl) {
      history.value.unshift({
        mangaId,
        mangaTitle: extra.mangaTitle,
        coverUrl: extra.coverUrl,
        chapterId: String(chapterId),
        chapterNumber: String(chapterNumber || '1'),
        volumeNumber: extra.volumeNumber,
        chapterTitle: extra.chapterTitle,
        contentType: contentType || 'manga',
        mangaDir: extra.mangaDir,
        numericId: extra.numericId,
        timestamp: Date.now()
      })
    }

    save()
  }

  /**
   * Find last read item for a given manga identifier
   */
  const getLastRead = (mangaId: string, numericId?: string | number): HistoryItem | undefined => {
    if (!mangaId) return undefined
    const normId = String(mangaId).trim().toLowerCase()
    const strNum = numericId ? String(numericId) : null

    return history.value.find(h => {
      const hId = h.mangaId ? String(h.mangaId).trim().toLowerCase() : ''
      const hDir = h.mangaDir ? String(h.mangaDir).trim().toLowerCase() : ''
      const hNum = h.numericId ? String(h.numericId) : null

      return hId === normId ||
             hDir === normId ||
             (strNum && (hId === strNum || hNum === strNum))
    })
  }

  /**
   * Check if a specific chapter has been read
   */
  const isChapterRead = (
    mangaId: string,
    chapterId: string | number,
    chapterNumber?: string | number,
    numericId?: string | number
  ): boolean => {
    if (!mangaId) return false

    const strChId = String(chapterId)
    const normId = String(mangaId).trim().toLowerCase()
    const strNum = numericId ? String(numericId).trim() : null

    // 1. Direct check in readChapters map
    const list = readChapters.value[normId]
    if (list && list.includes(strChId)) return true

    if (strNum) {
      const numList = readChapters.value[strNum.toLowerCase()]
      if (numList && numList.includes(strChId)) return true
    }

    // 2. Relative check against lastRead chapter number
    if (chapterNumber !== undefined && chapterNumber !== '') {
      const last = getLastRead(mangaId, numericId)
      if (last && last.chapterNumber) {
        const readNum = parseFloat(String(last.chapterNumber))
        const curNum = parseFloat(String(chapterNumber))
        if (!isNaN(readNum) && !isNaN(curNum) && curNum > 0 && curNum <= readNum) {
          return true
        }
      }
    }

    return false
  }

  const clearHistory = () => {
    history.value = []
    readChapters.value = {}
    save()
  }

  init()

  return {
    history,
    readChapters,
    recordProgress,
    markChapterRead,
    getLastRead,
    isChapterRead,
    clearHistory
  }
})
