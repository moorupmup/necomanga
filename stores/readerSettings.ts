import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ReaderMode = 'webtoon' | 'single'
export type ReaderQuality = 'data' | 'dataSaver'
export type ReaderWidth = 'normal' | 'wide' | 'full'
export type SiteTheme = 'dark' | 'light'

export const useReaderSettingsStore = defineStore('readerSettings', () => {
  const mode = ref<ReaderMode>('webtoon')
  const quality = ref<ReaderQuality>('data')
  const maxWidth = ref<ReaderWidth>('normal')
  const theme = ref<SiteTheme>('dark')

  const init = () => {
    if (typeof window !== 'undefined') {
      try {
        const storedMode = localStorage.getItem('mangadex_reader_mode')
        if (storedMode === 'webtoon' || storedMode === 'single') mode.value = storedMode

        const storedQuality = localStorage.getItem('mangadex_reader_quality')
        if (storedQuality === 'data' || storedQuality === 'dataSaver') quality.value = storedQuality

        const storedWidth = localStorage.getItem('mangadex_reader_width')
        if (storedWidth === 'normal' || storedWidth === 'wide' || storedWidth === 'full') maxWidth.value = storedWidth

        const storedTheme = localStorage.getItem('mangadex_theme')
        if (storedTheme === 'dark' || storedTheme === 'light') {
          theme.value = storedTheme
          applyTheme(storedTheme)
        }
      } catch (e) {
        console.error('Failed to load reader settings', e)
      }
    }
  }

  const applyTheme = (t: SiteTheme) => {
    if (typeof document !== 'undefined') {
      if (t === 'light') {
        document.documentElement.classList.remove('dark')
        document.body.classList.add('light')
      } else {
        document.documentElement.classList.add('dark')
        document.body.classList.remove('light')
      }
    }
  }

  const setMode = (val: ReaderMode) => {
    mode.value = val
    if (typeof window !== 'undefined') {
      localStorage.setItem('mangadex_reader_mode', val)
    }
  }

  const setQuality = (val: ReaderQuality) => {
    quality.value = val
    if (typeof window !== 'undefined') {
      localStorage.setItem('mangadex_reader_quality', val)
    }
  }

  const setMaxWidth = (val: ReaderWidth) => {
    maxWidth.value = val
    if (typeof window !== 'undefined') {
      localStorage.setItem('mangadex_reader_width', val)
    }
  }

  const toggleTheme = () => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    applyTheme(theme.value)
    if (typeof window !== 'undefined') {
      localStorage.setItem('mangadex_theme', theme.value)
    }
  }

  init()

  return {
    mode,
    quality,
    maxWidth,
    theme,
    setMode,
    setQuality,
    setMaxWidth,
    toggleTheme,
    applyTheme
  }
})
