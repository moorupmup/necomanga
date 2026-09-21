import { defineStore } from 'pinia'
import { ref } from 'vue'

export type BookmarkStatus = 'reading' | 'planned' | 'completed' | 'favorite' | 'dropped'

export interface BookmarkItem {
  mangaId: string
  title: string
  altTitle?: string
  coverUrl: string
  status: BookmarkStatus
  updatedAt: number
}

export const BOOKMARK_LABELS: Record<BookmarkStatus, string> = {
  reading: 'Читаю',
  planned: 'В планах',
  completed: 'Прочитано',
  favorite: 'Любимое',
  dropped: 'Брошено'
}

export const BOOKMARK_COLORS: Record<BookmarkStatus, string> = {
  reading: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  planned: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  favorite: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  dropped: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
}

export const useBookmarksStore = defineStore('bookmarks', () => {
  const bookmarks = ref<Record<string, BookmarkItem>>({})

  // Load from localStorage on client
  const init = () => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('mangadex_ru_bookmarks')
        if (stored) {
          bookmarks.value = JSON.parse(stored)
        }
      } catch (e) {
        console.error('Failed to load bookmarks', e)
      }
    }
  }

  // Save to localStorage
  const save = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('mangadex_ru_bookmarks', JSON.stringify(bookmarks.value))
      } catch (e) {
        console.error('Failed to save bookmarks', e)
      }
    }
  }

  const setBookmark = (
    manga: { id: string; title: string; altTitle?: string; coverUrl: string },
    status: BookmarkStatus
  ) => {
    bookmarks.value[manga.id] = {
      mangaId: manga.id,
      title: manga.title,
      altTitle: manga.altTitle,
      coverUrl: manga.coverUrl,
      status,
      updatedAt: Date.now()
    }
    save()
  }

  const removeBookmark = (mangaId: string) => {
    if (bookmarks.value[mangaId]) {
      delete bookmarks.value[mangaId]
      save()
    }
  }

  const getBookmark = (mangaId: string): BookmarkItem | undefined => {
    return bookmarks.value[mangaId]
  }

  const isBookmarked = (mangaId: string): boolean => {
    return !!bookmarks.value[mangaId]
  }

  // Auto init
  init()

  return {
    bookmarks,
    setBookmark,
    removeBookmark,
    getBookmark,
    isBookmarked
  }
})
