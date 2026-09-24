import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ReaderMode = 'webtoon' | 'single'
export type ReaderQuality = 'data' | 'dataSaver'
export type ReaderWidth = 'normal' | 'wide' | 'full'
export type SiteTheme = 'dark' | 'light'

export type NovelTheme = 'dark' | 'black' | 'sepia' | 'light'
export type NovelLineHeight = 'normal' | 'relaxed' | 'loose'
export type NovelFontFamily = 'sans' | 'serif'

export const useReaderSettingsStore = defineStore('readerSettings', () => {
  const mode = ref<ReaderMode>('webtoon')
  const quality = ref<ReaderQuality>('data')
  const maxWidth = ref<ReaderWidth>('normal')
  const theme = ref<SiteTheme>('dark')

  // Novel reader settings
  const novelFontSize = ref<number>(18)
  const novelLineHeight = ref<NovelLineHeight>('relaxed')
  const novelFontFamily = ref<NovelFontFamily>('sans')
  const novelTheme = ref<NovelTheme>('dark')

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

        const storedNovelSize = localStorage.getItem('novel_reader_font_size')
        if (storedNovelSize) novelFontSize.value = Number(storedNovelSize)

        const storedNovelLH = localStorage.getItem('novel_reader_line_height') as NovelLineHeight | null
        if (storedNovelLH) novelLineHeight.value = storedNovelLH

        const storedNovelFont = localStorage.getItem('novel_reader_font_family') as NovelFontFamily | null
        if (storedNovelFont) novelFontFamily.value = storedNovelFont

        const storedNovelTheme = localStorage.getItem('novel_reader_theme') as NovelTheme | null
        if (storedNovelTheme) novelTheme.value = storedNovelTheme
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

  const setNovelFontSize = (size: number) => {
    novelFontSize.value = Math.min(32, Math.max(14, size))
    if (typeof window !== 'undefined') {
      localStorage.setItem('novel_reader_font_size', String(novelFontSize.value))
    }
  }

  const setNovelLineHeight = (lh: NovelLineHeight) => {
    novelLineHeight.value = lh
    if (typeof window !== 'undefined') {
      localStorage.setItem('novel_reader_line_height', lh)
    }
  }

  const setNovelFontFamily = (f: NovelFontFamily) => {
    novelFontFamily.value = f
    if (typeof window !== 'undefined') {
      localStorage.setItem('novel_reader_font_family', f)
    }
  }

  const setNovelTheme = (t: NovelTheme) => {
    novelTheme.value = t
    if (typeof window !== 'undefined') {
      localStorage.setItem('novel_reader_theme', t)
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
    novelFontSize,
    novelLineHeight,
    novelFontFamily,
    novelTheme,
    setMode,
    setQuality,
    setMaxWidth,
    setNovelFontSize,
    setNovelLineHeight,
    setNovelFontFamily,
    setNovelTheme,
    toggleTheme,
    applyTheme
  }
})
