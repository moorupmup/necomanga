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
}

export const useHistoryStore = defineStore('history', () => {
  const history = ref<HistoryItem[]>([])

  const init = () => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('mangadex_ru_history')
        if (stored) {
          history.value = JSON.parse(stored)
        }
      } catch (e) {
        console.error('Failed to load history', e)
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
    }
  }

  const recordProgress = (item: Omit<HistoryItem, 'timestamp'>) => {
    // Remove previous entry for this manga to avoid duplicate cards in history
    history.value = history.value.filter(h => h.mangaId !== item.mangaId)

    // Add new entry at top
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

  const getLastRead = (mangaId: string): HistoryItem | undefined => {
    return history.value.find(h => h.mangaId === mangaId)
  }

  const clearHistory = () => {
    history.value = []
    save()
  }

  init()

  return {
    history,
    recordProgress,
    getLastRead,
    clearHistory
  }
})
