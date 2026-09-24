<script setup lang="ts">
definePageMeta({
  layout: false
})

import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Settings,
  RotateCw,
  Layers,
  FileText,
  AlertCircle,
  Lock,
  ExternalLink,
  X,
  Download,
  Check
} from 'lucide-vue-next'
import { useReManga, isNativePlatform } from '~/composables/useReManga'
import { useReaderSettingsStore } from '~/stores/readerSettings'
import { useHistoryStore } from '~/stores/history'
import { useContentSourceStore } from '~/stores/contentSource'
import { registerBackHandler } from '~/composables/useBackButton'
import SpinnerArrow from '~/components/SpinnerArrow.vue'
import ZoomableImage from '~/components/ZoomableImage.vue'

const route = useRoute()
const router = useRouter()
const chapterId = computed(() => route.params.chapterId as string)
const mangaDir = computed(() => (route.query.dir as string) || '')

const { getChapterPages, getMangaById, getAdjacentChapters } = useReManga()
const readerSettings = useReaderSettingsStore()
const historyStore = useHistoryStore()
const contentSourceStore = useContentSourceStore()

const isLoading = ref(true)
const error = ref<string | null>(null)
const isHeaderVisible = ref(true)
const isSettingsOpen = ref(false)
const isContextMenuOpen = ref(false)
const contextMenuPage = ref<{ index: number; src: string } | null>(null)
const isSavingImage = ref(false)
const toastMessage = ref<string | null>(null)
let toastTimer: any = null

const showToast = (msg: string) => {
  if (toastTimer) clearTimeout(toastTimer)
  toastMessage.value = msg
  toastTimer = setTimeout(() => {
    toastMessage.value = null
  }, 2400)
}

const handleImageLongPress = (payload: { index: number; src: string }) => {
  contextMenuPage.value = payload
  isContextMenuOpen.value = true
}

const closeContextMenu = () => {
  isContextMenuOpen.value = false
}

const reloadContextImage = () => {
  if (!contextMenuPage.value) return
  const idx = contextMenuPage.value.index
  retryImage(idx)
  closeContextMenu()
  showToast(`Страница ${idx + 1} перезагружается...`)
}

const saveContextImage = async () => {
  if (!contextMenuPage.value) return
  const { index, src } = contextMenuPage.value
  isSavingImage.value = true

  const mangaTitle = parentManga.value?.title || mangaDir.value || 'manga'
  const cleanTitle = mangaTitle.replace(/[\\/:*?"<>|]+/g, '_').trim()
  const chNum = chapterInfo.value?.chapter || '0'
  const filename = `${cleanTitle}_glava_${chNum}_stranica_${index + 1}.jpg`

  try {
    const res = await fetch(src)
    if (!res.ok) throw new Error('Fetch failed')
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1500)
    showToast(`Страница ${index + 1} успешно сохранена`)
  } catch (err) {
    try {
      const a = document.createElement('a')
      a.href = src
      a.download = filename
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      showToast('Изображение открыто для сохранения')
    } catch {
      showToast('Не удалось сохранить изображение')
    }
  } finally {
    isSavingImage.value = false
    closeContextMenu()
  }
}

const chapterInfo = ref<any>(null)
const parentManga = ref<any>(null)
const pages = ref<string[]>([])
const prevChapter = ref<any>(null)
const nextChapter = ref<any>(null)

const isNovelChapter = computed(() => {
  if (chapterInfo.value?.isNovel !== undefined) {
    return chapterInfo.value.isNovel
  }
  return Boolean(
    chapterInfo.value?.content ||
    chapterInfo.value?.contentType === 'book' ||
    route.query.type === 'novel'
  )
})

const cleanNovelHtml = (html?: string) => {
  if (!html) return ''
  return html
    // 1. Rewrite media URLs to proxy
    .replace(/src="(https?:\/\/[^"]+|\/media\/[^"]+)"/g, (match, src) => {
      let fullUrl = src
      if (fullUrl.startsWith('/media/')) {
        fullUrl = `https://renovels.org${fullUrl}`
      }
      return `src="${wrapProxyImageUrl(fullUrl, true)}"`
    })
    // 2. Remove empty paragraphs containing only <br>, &nbsp;, whitespace, or invisible characters
    .replace(/<p\b[^>]*>(?:\s|&nbsp;|<br\s*\/?>|\u00A0|\u200B|\uFEFF)*<\/p>/gi, '')
    // 3. Remove leading and trailing <br> tags within paragraphs
    .replace(/(<p\b[^>]*>)(?:\s*<br\s*\/?>\s*)+/gi, '$1')
    .replace(/(?:\s*<br\s*\/?>\s*)+(<\/p>)/gi, '$1')
    // 4. Collapse multiple consecutive <br> inside paragraphs to at most one <br>
    .replace(/(?:<br\s*\/?>\s*){2,}/gi, '<br/>')
}

const novelThemeClasses = computed(() => {
  switch (readerSettings.novelTheme) {
    case 'black':
      return { bg: 'bg-black', text: 'text-zinc-300', title: 'text-white', border: 'border-zinc-900', card: 'bg-zinc-950' }
    case 'sepia':
      return { bg: 'bg-[#fbf0d9]', text: 'text-[#2e261f]', title: 'text-[#1c150e]', border: 'border-[#ebdcc0]', card: 'bg-[#f4e6ca]' }
    case 'light':
      return { bg: 'bg-[#f8f9fa]', text: 'text-zinc-800', title: 'text-zinc-950', border: 'border-zinc-200', card: 'bg-white' }
    case 'dark':
    default:
      return { bg: 'bg-[#090a0f]', text: 'text-zinc-300', title: 'text-zinc-100', border: 'border-zinc-800/60', card: 'bg-zinc-900/60' }
  }
})

const novelContentStyle = computed(() => {
  const lhMap = {
    normal: '1.6',
    relaxed: '1.85',
    loose: '2.15'
  }
  return {
    fontSize: `${readerSettings.novelFontSize}px`,
    lineHeight: lhMap[readerSettings.novelLineHeight] || '1.85',
    fontFamily: readerSettings.novelFontFamily === 'serif' ? 'Georgia, Cambria, "Times New Roman", Times, serif' : 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  }
})
const retryKeys = ref<Record<number, number>>({})

const getPageSrc = (originalUrl: string, index: number) => {
  const retry = retryKeys.value[index]
  if (retry) {
    const sep = originalUrl.includes('?') ? '&' : '?'
    return `${originalUrl}${sep}_r=${retry}`
  }
  return originalUrl
}

const currentPageIndex = ref(0)
const failedImages = ref<Record<number, boolean>>({})

// Preload next 2 pages in single-page mode for instant flipping
watch(currentPageIndex, (newIdx) => {
  if (readerSettings.mode === 'single' && pages.value.length > 0) {
    for (let i = 1; i <= 2; i++) {
      const nextIdx = newIdx + i
      if (nextIdx < pages.value.length) {
        const img = new Image()
        img.src = getPageSrc(pages.value[nextIdx], nextIdx)
      }
    }
  }
})

const widthClass = computed(() => {
  if (readerSettings.maxWidth === 'wide') return 'max-w-5xl'
  if (readerSettings.maxWidth === 'full') return 'max-w-none w-full'
  return 'max-w-3xl'
})

if (route.query.type === 'novel' && !contentSourceStore.isRanobe) {
  contentSourceStore.setMode('ranobe')
} else if (route.query.type === 'manga' && contentSourceStore.isRanobe) {
  contentSourceStore.setMode('manga')
}

const loadChapterData = async () => {
  isLoading.value = true
  error.value = null
  failedImages.value = {}
  currentPageIndex.value = 0
  retryKeys.value = {}
  prevChapter.value = null
  nextChapter.value = null

  try {
    const preferNovel = route.query.type === 'novel' ? true : (route.query.type === 'manga' ? false : undefined)
    const chapterData = await getChapterPages(chapterId.value, preferNovel)
    chapterInfo.value = chapterData
    pages.value = chapterData.pages
    prevChapter.value = chapterData.previous
    nextChapter.value = chapterData.next

    // Automatically synchronize store with actual chapter mode
    if (chapterData.isNovel && !contentSourceStore.isRanobe) {
      contentSourceStore.setMode('ranobe')
    } else if (!chapterData.isNovel && contentSourceStore.isRanobe) {
      contentSourceStore.setMode('manga')
    }

    // Asynchronously resolve adjacent chapters (prev & next) without blocking page render
    const branchId = chapterData.branchId
    if (branchId) {
      getAdjacentChapters(branchId, chapterData.id, chapterData.isNovel).then(({ prev, next }) => {
        if (!prevChapter.value && prev) prevChapter.value = prev
        if (!nextChapter.value && next) nextChapter.value = next
      }).catch(err => {
        console.warn('Could not determine adjacent chapters', err)
      })
    }

    // Instantly record progress and mark read with whatever info is available
    const saveCurrentProgress = () => {
      const effectiveId = parentManga.value?.id || mangaDir.value || ''
      const effectiveTitle = parentManga.value?.title || (mangaDir.value ? mangaDir.value.replace(/[-_]/g, ' ') : '')
      const effectiveCover = parentManga.value?.coverUrlSmall || parentManga.value?.coverUrl || ''

      if (effectiveId && chapterData.id) {
        historyStore.recordProgress({
          mangaId: effectiveId,
          mangaTitle: effectiveTitle || 'Манга',
          coverUrl: effectiveCover,
          chapterId: String(chapterData.id),
          chapterNumber: String(chapterData.chapter || '0'),
          volumeNumber: String(chapterData.tome || '1'),
          chapterTitle: chapterData.name,
          contentType: chapterData.isNovel ? 'novel' : 'manga',
          mangaDir: parentManga.value?.dir || mangaDir.value,
          numericId: parentManga.value?.numericId
        })
      }
    }

    saveCurrentProgress()

    // If mangaDir is known and parentManga isn't loaded yet, load title info in background
    const effectiveDir = mangaDir.value || parentManga.value?.dir || parentManga.value?.id
    if (effectiveDir && !parentManga.value) {
      getMangaById(effectiveDir, '', chapterData.isNovel).then(manga => {
        parentManga.value = manga
        saveCurrentProgress() // Re-save with loaded title and cover

        // Fallback for adjacent chapters if chapterData didn't have branchId
        if (!branchId && manga.branches?.[0]?.id) {
          getAdjacentChapters(manga.branches[0].id, chapterData.id, chapterData.isNovel).then(({ prev, next }) => {
            if (!prevChapter.value && prev) prevChapter.value = prev
            if (!nextChapter.value && next) nextChapter.value = next
          }).catch(e => {
            console.warn('Fallback adjacent chapters failed', e)
          })
        }
      }).catch(e => {
        console.warn('Could not load parent manga info in background', e)
      })
    }
  } catch (err: any) {
    error.value = err.message || 'Ошибка загрузки страниц главы'
  } finally {
    isLoading.value = false
  }
}

const markCurrentChapterRead = () => {
  const currentChapter = chapterInfo.value
  if (!currentChapter?.id) return

  const effectiveId = parentManga.value?.id || mangaDir.value || ''
  if (!effectiveId) return

  historyStore.markChapterRead(
    effectiveId,
    String(currentChapter.id),
    String(currentChapter.chapter || '0'),
    isNovelChapter.value ? 'novel' : 'manga',
    {
      mangaTitle: parentManga.value?.title || effectiveId,
      coverUrl: parentManga.value?.coverUrlSmall || parentManga.value?.coverUrl,
      mangaDir: parentManga.value?.dir || mangaDir.value,
      numericId: parentManga.value?.numericId,
      volumeNumber: String(currentChapter.tome || '1'),
      chapterTitle: currentChapter.name
    }
  )
}

const goToChapter = (id: string) => {
  markCurrentChapterRead()
  const dir = mangaDir.value || parentManga.value?.dir || parentManga.value?.id || ''
  const query: Record<string, string> = {}
  if (dir) query.dir = dir
  query.type = isNovelChapter.value ? 'novel' : 'manga'
  router.push({ path: `/read/${id}`, query })
}

const prevPage = () => {
  if (currentPageIndex.value > 0) {
    currentPageIndex.value--
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } else if (prevChapter.value) {
    goToChapter(prevChapter.value.id)
  }
}

const nextPage = () => {
  if (currentPageIndex.value < pages.value.length - 1) {
    currentPageIndex.value++
    window.scrollTo({ top: 0, behavior: 'smooth' })
    if (currentPageIndex.value === pages.value.length - 1) {
      markCurrentChapterRead()
    }
  } else if (nextChapter.value) {
    markCurrentChapterRead()
    goToChapter(nextChapter.value.id)
  }
}

const toggleControls = () => {
  isHeaderVisible.value = !isHeaderVisible.value
}

const retryImage = (index: number) => {
  retryKeys.value[index] = Date.now()
  delete failedImages.value[index]
}

const onImageError = (index: number) => {
  failedImages.value[index] = true
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    nextPage()
  } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
    prevPage()
  }
}

let lastScrollY = 0
const handleScroll = () => {
  const currentY = window.scrollY
  if (currentY > 100 && currentY > lastScrollY && !isSettingsOpen.value) {
    isHeaderVisible.value = false
  } else {
    isHeaderVisible.value = true
  }
  lastScrollY = currentY

  // Mark chapter read when scrolled past 70% of the document height in webtoon/novel mode
  if (typeof document !== 'undefined') {
    const scrollHeight = document.documentElement.scrollHeight
    const clientHeight = window.innerHeight
    if (scrollHeight > clientHeight + 300) {
      const scrollProgress = (currentY + clientHeight) / scrollHeight
      if (scrollProgress >= 0.7) {
        markCurrentChapterRead()
      }
    }
  }
}

watch(
  () => [route.params.chapterId, route.query.dir],
  ([newChId]) => {
    if (newChId) {
      loadChapterData()
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }
)

let unregisterBack: (() => void) | null = null

onMounted(() => {
  loadChapterData()
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('scroll', handleScroll, { passive: true })

  unregisterBack = registerBackHandler(() => {
    if (isContextMenuOpen.value) {
      isContextMenuOpen.value = false
      return true
    }
    if (isSettingsOpen.value) {
      isSettingsOpen.value = false
      return true
    }
    return false
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('scroll', handleScroll)
  if (toastTimer) clearTimeout(toastTimer)
  if (unregisterBack) {
    unregisterBack()
  }
})
</script>

<template>
  <div class="min-h-screen min-h-[100dvh] bg-black text-zinc-100 flex flex-col justify-between select-none">
    <!-- Top Sticky Floating Header with Safe Area -->
    <header
      :class="[
        'fixed top-0 left-0 right-0 z-50 bg-zinc-950 border-b border-zinc-800 transition-transform duration-300 pt-safe px-3 sm:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4',
        isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
      ]"
    >
      <!-- Left: Back Button & Titles -->
      <div class="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
        <NuxtLink
          :to="parentManga ? `/manga/${parentManga.id}?type=${isNovelChapter ? 'novel' : 'manga'}` : (mangaDir ? `/manga/${mangaDir}?type=${isNovelChapter ? 'novel' : 'manga'}` : '/catalog')"
          class="p-2 sm:p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 flex-shrink-0 transition-colors"
          title="Вернуться к тайтлу"
        >
          <ArrowLeft class="w-4 h-4 sm:w-5 sm:h-5" />
        </NuxtLink>

        <div class="min-w-0">
          <h2 class="text-xs sm:text-base font-bold truncate text-white">
            {{ parentManga?.title || (isNovelChapter ? 'Чтение ранобэ' : 'Чтение манги') }}
          </h2>
          <p class="text-[11px] sm:text-sm text-zinc-400 truncate font-medium">
            Гл. {{ chapterInfo?.chapter || '...' }}
            <span v-if="chapterInfo?.name"> — {{ chapterInfo.name }}</span>
          </p>
        </div>
      </div>

      <!-- Center: Quick Prev/Next (desktop only) -->
      <div class="hidden sm:flex items-center gap-2">
        <button
          type="button"
          :disabled="!prevChapter"
          class="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Предыдущая глава"
          @click="prevChapter && goToChapter(prevChapter.id)"
        >
          <ChevronLeft class="w-5 h-5" />
        </button>

        <span class="px-3 py-1.5 rounded-xl bg-zinc-900 text-sm font-bold border border-zinc-800">
          Гл. {{ chapterInfo?.chapter || '...' }}
        </span>

        <button
          type="button"
          :disabled="!nextChapter"
          class="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Следующая глава"
          @click="nextChapter && goToChapter(nextChapter.id)"
        >
          <ChevronRight class="w-5 h-5" />
        </button>
      </div>

      <!-- Right: Mobile Quick Nav + Settings -->
      <div class="flex items-center gap-1.5 sm:gap-2 relative shrink-0">
        <!-- Quick Chapter Buttons on Mobile -->
        <div class="sm:hidden flex items-center gap-0.5 bg-zinc-900 p-0.5 rounded-xl border border-zinc-800">
          <button
            type="button"
            :disabled="!prevChapter"
            class="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-zinc-300 hover:text-white disabled:opacity-25 active:scale-95 transition-transform"
            title="Предыдущая глава"
            @click="prevChapter && goToChapter(prevChapter.id)"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
          <span class="text-xs font-bold px-1.5 text-zinc-200 min-w-[28px] text-center font-mono">
            {{ chapterInfo?.chapter || '...' }}
          </span>
          <button
            type="button"
            :disabled="!nextChapter"
            class="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-zinc-300 hover:text-white disabled:opacity-25 active:scale-95 transition-transform"
            title="Следующая глава"
            @click="nextChapter && goToChapter(nextChapter.id)"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          class="min-w-[40px] min-h-[40px] p-2 sm:p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors flex items-center justify-center active:scale-95"
          title="Настройки читалки"
          @click="isSettingsOpen = !isSettingsOpen"
        >
          <Settings class="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <!-- Settings Dropdown Menu (Desktop) -->
        <div
          v-if="isSettingsOpen"
          class="hidden sm:block absolute right-0 top-full mt-2 w-80 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-5 z-50 text-sm space-y-5"
        >
          <!-- Novel specific settings -->
          <template v-if="isNovelChapter">
            <!-- Font Size -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="text-zinc-300 font-bold">Размер текста</label>
                <span class="text-xs font-mono font-bold text-blue-400">{{ readerSettings.novelFontSize }}px</span>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  class="py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold active:scale-95"
                  @click="readerSettings.setNovelFontSize(readerSettings.novelFontSize - 2)"
                >
                  Меньше (A-)
                </button>
                <button
                  type="button"
                  class="py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold active:scale-95"
                  @click="readerSettings.setNovelFontSize(readerSettings.novelFontSize + 2)"
                >
                  Больше (A+)
                </button>
              </div>
            </div>

            <!-- Font Family -->
            <div>
              <label class="block text-zinc-300 font-bold mb-2">Шрифт</label>
              <div class="grid grid-cols-2 gap-2 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800 text-xs">
                <button
                  type="button"
                  :class="['py-2 rounded-lg font-bold transition-colors', readerSettings.novelFontFamily === 'sans' ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-400 hover:text-white']"
                  @click="readerSettings.setNovelFontFamily('sans')"
                >
                  Без засечек
                </button>
                <button
                  type="button"
                  :class="['py-2 rounded-lg font-bold font-serif transition-colors', readerSettings.novelFontFamily === 'serif' ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-400 hover:text-white']"
                  @click="readerSettings.setNovelFontFamily('serif')"
                >
                  С засечками
                </button>
              </div>
            </div>

            <!-- Theme -->
            <div>
              <label class="block text-zinc-300 font-bold mb-2">Цветовая тема</label>
              <div class="grid grid-cols-4 gap-1.5 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800 text-xs">
                <button
                  type="button"
                  :class="['py-2 rounded-lg font-bold transition-colors', readerSettings.novelTheme === 'dark' ? 'bg-zinc-800 text-white border border-zinc-600' : 'text-zinc-400 hover:text-white']"
                  @click="readerSettings.setNovelTheme('dark')"
                >
                  Тёмная
                </button>
                <button
                  type="button"
                  :class="['py-2 rounded-lg font-bold transition-colors', readerSettings.novelTheme === 'black' ? 'bg-black text-white border border-zinc-700' : 'text-zinc-400 hover:text-white']"
                  @click="readerSettings.setNovelTheme('black')"
                >
                  OLED
                </button>
                <button
                  type="button"
                  :class="['py-2 rounded-lg font-bold transition-colors bg-[#fbf0d9] text-[#2c241b]', readerSettings.novelTheme === 'sepia' ? 'ring-2 ring-amber-500' : '']"
                  @click="readerSettings.setNovelTheme('sepia')"
                >
                  Сепия
                </button>
                <button
                  type="button"
                  :class="['py-2 rounded-lg font-bold transition-colors bg-white text-zinc-900', readerSettings.novelTheme === 'light' ? 'ring-2 ring-blue-500' : '']"
                  @click="readerSettings.setNovelTheme('light')"
                >
                  Светлая
                </button>
              </div>
            </div>
          </template>

          <!-- Manga specific Mode (Webtoon / Single) -->
          <template v-else>
            <div>
              <label class="block text-zinc-300 font-bold mb-2.5">Режим чтения</label>
              <div class="grid grid-cols-2 gap-2 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  :class="[
                    'py-2.5 px-3 rounded-lg font-bold text-center transition-colors flex items-center justify-center gap-2',
                    readerSettings.mode === 'webtoon' ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-400 hover:text-white'
                  ]"
                  @click="readerSettings.setMode('webtoon')"
                >
                  <Layers class="w-4 h-4" />
                  <span>Лента</span>
                </button>
                <button
                  type="button"
                  :class="[
                    'py-2.5 px-3 rounded-lg font-bold text-center transition-colors flex items-center justify-center gap-2',
                    readerSettings.mode === 'single' ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-400 hover:text-white'
                  ]"
                  @click="readerSettings.setMode('single')"
                >
                  <FileText class="w-4 h-4" />
                  <span>Постранично</span>
                </button>
              </div>
            </div>
          </template>

          <!-- Reader Width (Shared) -->
          <div>
            <label class="block text-zinc-300 font-bold mb-2.5">Ширина контента</label>
            <div class="grid grid-cols-3 gap-2 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800 text-xs">
              <button
                type="button"
                :class="[
                  'py-2 px-2 rounded-lg font-bold text-center transition-colors',
                  readerSettings.maxWidth === 'normal' ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-400 hover:text-white'
                ]"
                @click="readerSettings.setMaxWidth('normal')"
              >
                Стандарт
              </button>
              <button
                type="button"
                :class="[
                  'py-2 px-2 rounded-lg font-bold text-center transition-colors',
                  readerSettings.maxWidth === 'wide' ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-400 hover:text-white'
                ]"
                @click="readerSettings.setMaxWidth('wide')"
              >
                Широкий
              </button>
              <button
                type="button"
                :class="[
                  'py-2 px-2 rounded-lg font-bold text-center transition-colors',
                  readerSettings.maxWidth === 'full' ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-400 hover:text-white'
                ]"
                @click="readerSettings.setMaxWidth('full')"
              >
                На весь экран
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Mobile Settings Bottom Sheet Modal -->
    <Teleport to="body">
      <div
        v-if="isSettingsOpen"
        class="sm:hidden fixed inset-0 z-50 flex flex-col justify-end select-none"
      >
        <div
          class="fixed inset-0 bg-black/80"
          @click="isSettingsOpen = false"
        ></div>

        <div class="relative bg-zinc-950 border-t border-zinc-800 rounded-t-3xl p-5 pb-safe space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200">
          <!-- Drag Handle Indicator -->
          <div class="w-10 h-1 bg-zinc-700 rounded-full mx-auto -mt-1 mb-2"></div>

          <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div class="flex items-center gap-2">
              <Settings class="w-5 h-5 text-amber-400" />
              <h3 class="text-base font-black text-white">Настройки читалки</h3>
            </div>
            <button
              type="button"
              class="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white"
              @click="isSettingsOpen = false"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Novel specific settings -->
          <template v-if="isNovelChapter">
            <!-- Font Size -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="text-xs uppercase tracking-wider text-zinc-400 font-bold">Размер текста</label>
                <span class="text-xs font-mono font-bold text-blue-400">{{ readerSettings.novelFontSize }}px</span>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  class="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold active:scale-95"
                  @click="readerSettings.setNovelFontSize(readerSettings.novelFontSize - 2)"
                >
                  Меньше (A-)
                </button>
                <button
                  type="button"
                  class="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold active:scale-95"
                  @click="readerSettings.setNovelFontSize(readerSettings.novelFontSize + 2)"
                >
                  Больше (A+)
                </button>
              </div>
            </div>

            <!-- Font Family -->
            <div>
              <label class="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-2">Шрифт</label>
              <div class="grid grid-cols-2 gap-2 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800 text-xs">
                <button
                  type="button"
                  :class="['py-2 rounded-lg font-bold transition-colors', readerSettings.novelFontFamily === 'sans' ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-400 hover:text-white']"
                  @click="readerSettings.setNovelFontFamily('sans')"
                >
                  Без засечек
                </button>
                <button
                  type="button"
                  :class="['py-2 rounded-lg font-bold font-serif transition-colors', readerSettings.novelFontFamily === 'serif' ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-400 hover:text-white']"
                  @click="readerSettings.setNovelFontFamily('serif')"
                >
                  С засечками
                </button>
              </div>
            </div>

            <!-- Theme -->
            <div>
              <label class="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-2">Цветовая тема</label>
              <div class="grid grid-cols-4 gap-1.5 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800 text-xs">
                <button
                  type="button"
                  :class="['py-2 rounded-lg font-bold transition-colors', readerSettings.novelTheme === 'dark' ? 'bg-zinc-800 text-white border border-zinc-600' : 'text-zinc-400 hover:text-white']"
                  @click="readerSettings.setNovelTheme('dark')"
                >
                  Тёмная
                </button>
                <button
                  type="button"
                  :class="['py-2 rounded-lg font-bold transition-colors', readerSettings.novelTheme === 'black' ? 'bg-black text-white border border-zinc-700' : 'text-zinc-400 hover:text-white']"
                  @click="readerSettings.setNovelTheme('black')"
                >
                  OLED
                </button>
                <button
                  type="button"
                  :class="['py-2 rounded-lg font-bold transition-colors bg-[#fbf0d9] text-[#2c241b]', readerSettings.novelTheme === 'sepia' ? 'ring-2 ring-amber-500' : '']"
                  @click="readerSettings.setNovelTheme('sepia')"
                >
                  Сепия
                </button>
                <button
                  type="button"
                  :class="['py-2 rounded-lg font-bold transition-colors bg-white text-zinc-900', readerSettings.novelTheme === 'light' ? 'ring-2 ring-blue-500' : '']"
                  @click="readerSettings.setNovelTheme('light')"
                >
                  Светлая
                </button>
              </div>
            </div>
          </template>

          <!-- Manga Mode (Webtoon / Single) -->
          <template v-else>
            <div>
              <label class="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-2">Режим чтения</label>
              <div class="grid grid-cols-2 gap-2 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  :class="[
                    'py-2.5 px-3 rounded-lg font-bold text-xs text-center transition-colors flex items-center justify-center gap-2',
                    readerSettings.mode === 'webtoon' ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-400 hover:text-white'
                  ]"
                  @click="readerSettings.setMode('webtoon')"
                >
                  <Layers class="w-4 h-4" />
                  <span>Лента (Скролл)</span>
                </button>
                <button
                  type="button"
                  :class="[
                    'py-2.5 px-3 rounded-lg font-bold text-xs text-center transition-colors flex items-center justify-center gap-2',
                    readerSettings.mode === 'single' ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-400 hover:text-white'
                  ]"
                  @click="readerSettings.setMode('single')"
                >
                  <FileText class="w-4 h-4" />
                  <span>Постранично</span>
                </button>
              </div>
            </div>
          </template>

          <!-- Reader Width (Shared) -->
          <div>
            <label class="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-2">Ширина контента</label>
            <div class="grid grid-cols-3 gap-2 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800 text-xs">
              <button
                type="button"
                :class="[
                  'py-2 px-2 rounded-lg font-bold text-center transition-colors',
                  readerSettings.maxWidth === 'normal' ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-400 hover:text-white'
                ]"
                @click="readerSettings.setMaxWidth('normal')"
              >
                Стандарт
              </button>
              <button
                type="button"
                :class="[
                  'py-2 px-2 rounded-lg font-bold text-center transition-colors',
                  readerSettings.maxWidth === 'wide' ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-400 hover:text-white'
                ]"
                @click="readerSettings.setMaxWidth('wide')"
              >
                Широкий
              </button>
              <button
                type="button"
                :class="[
                  'py-2 px-2 rounded-lg font-bold text-center transition-colors',
                  readerSettings.maxWidth === 'full' ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-400 hover:text-white'
                ]"
                @click="readerSettings.setMaxWidth('full')"
              >
                На весь экран
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Main Reader Content Area -->
    <main class="flex-1 pt-14 sm:pt-20 pb-16 sm:pb-20">
      <!-- Loading State -->
      <div v-if="isLoading" class="min-h-[70vh] flex items-center justify-center">
        <div class="flex flex-col items-center gap-4 text-zinc-400">
          <SpinnerArrow class="w-10 h-10 text-zinc-300" />
          <span class="text-sm font-semibold">Загрузка страниц главы...</span>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="min-h-[60vh] flex items-center justify-center p-4">
        <div class="max-w-md w-full text-center space-y-4 bg-zinc-950 border border-zinc-800 p-6 sm:p-8 rounded-3xl shadow-2xl">
          <AlertCircle class="w-12 h-12 text-zinc-500 mx-auto" />
          <h2 class="text-lg sm:text-xl font-bold text-zinc-200">Не удалось загрузить главу</h2>
          <p class="text-xs sm:text-sm text-zinc-400">{{ error }}</p>
          <div class="flex justify-center gap-3 pt-2">
            <button
              type="button"
              class="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs sm:text-sm font-bold"
              @click="loadChapterData"
            >
              Попробовать снова
            </button>
            <NuxtLink
              :to="parentManga ? `/manga/${parentManga.id}?type=${isNovelChapter ? 'novel' : 'manga'}` : '/catalog'"
              class="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs sm:text-sm font-bold border border-zinc-800"
            >
              К тайтлу
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Paid / Licensed Chapter Notice -->
      <div v-else-if="chapterInfo?.isPaid || (!isNovelChapter && pages.length === 0)" class="min-h-[60vh] flex items-center justify-center p-4">
        <div class="max-w-lg w-full text-center space-y-6 bg-zinc-950 border border-amber-500/30 p-6 sm:p-10 rounded-3xl shadow-2xl">
          <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
            <Lock class="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <div class="space-y-2">
            <h2 class="text-xl sm:text-2xl font-black text-white">Платная глава</h2>
            <p class="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              {{ (chapterInfo?.msg || 'Эта глава лицензирована правообладателем или является платной.').replace(/remanga(\.org)?/gi, 'источник').replace(/renovels(\.org)?/gi, 'источник') }}
            </p>
          </div>

          <div class="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <a
              :href="isNovelChapter ? `https://renovels.org/titles/${mangaDir || ''}` : `https://remanga.org/manga/${mangaDir || ''}`"
              target="_blank"
              rel="noopener noreferrer"
              class="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-colors shadow-lg"
            >
              <span>Открыть источник</span>
              <ExternalLink class="w-4 h-4" />
            </a>

            <button
              v-if="nextChapter"
              type="button"
              class="px-6 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs sm:text-sm font-bold border border-zinc-800 transition-colors"
              @click="goToChapter(nextChapter.id)"
            >
              Следующая глава →
            </button>
          </div>
        </div>
      </div>

      <!-- Novel Reader Mode -->
      <div
        v-else-if="isNovelChapter"
        :class="['min-h-screen transition-colors duration-300', novelThemeClasses.bg, novelThemeClasses.text]"
      >
        <div :class="['mx-auto py-6 sm:py-14 px-4 sm:px-8', widthClass]" @click="toggleControls">
          <!-- Chapter Title Header -->
          <div class="mb-8 sm:mb-12 pb-6 border-b text-center space-y-2 select-none" :class="novelThemeClasses.border">
            <h1 class="text-xl sm:text-3xl font-black tracking-tight" :class="novelThemeClasses.title">
              {{ parentManga?.title || mangaDir }}
            </h1>
            <p class="text-xs sm:text-sm font-bold opacity-75">
              Том {{ chapterInfo?.tome || 1 }} · Глава {{ chapterInfo?.chapter }}
              <span v-if="chapterInfo?.name"> — {{ chapterInfo.name }}</span>
            </p>
          </div>

          <!-- Novel Body Text -->
          <div
            class="novel-content select-text"
            :style="novelContentStyle"
            v-html="cleanNovelHtml(chapterInfo?.content)"
          ></div>

          <!-- Novel Chapter Bottom Navigation -->
          <div class="mt-12 sm:mt-16 pt-8 border-t flex items-center justify-between gap-3 sm:gap-4 select-none" :class="novelThemeClasses.border">
            <button
              type="button"
              :disabled="!prevChapter"
              class="flex-1 py-3.5 px-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 text-zinc-300 hover:text-white disabled:opacity-25 disabled:pointer-events-none transition-all active:scale-95 shadow-md"
              @click.stop="prevChapter && goToChapter(prevChapter.id)"
            >
              <ChevronLeft class="w-4 h-4" />
              <span>Предыдущая</span>
            </button>

            <NuxtLink
              :to="parentManga ? `/manga/${parentManga.id}?type=${isNovelChapter ? 'novel' : 'manga'}` : (mangaDir ? `/manga/${mangaDir}?type=${isNovelChapter ? 'novel' : 'manga'}` : '/catalog')"
              class="py-3.5 px-5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-xs sm:text-sm font-bold flex items-center justify-center text-zinc-300 hover:text-white transition-all active:scale-95 shadow-md"
              title="Оглавление"
            >
              <Layers class="w-4 h-4" />
            </NuxtLink>

            <button
              type="button"
              :disabled="!nextChapter"
              class="flex-1 py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 disabled:opacity-25 disabled:pointer-events-none transition-all active:scale-95 shadow-lg shadow-blue-600/25"
              @click.stop="nextChapter && goToChapter(nextChapter.id)"
            >
              <span>Следующая</span>
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- Manga Pages Rendering -->
      <div v-else>
        <!-- 1. Webtoon Continuous Vertical Scroll Mode -->
        <div
          v-if="readerSettings.mode === 'webtoon'"
          :class="['mx-auto flex flex-col items-center select-none', widthClass]"
        >
          <div
            v-for="(pageUrl, index) in pages"
            :key="index"
            class="w-full relative min-h-[300px] sm:min-h-[400px] flex items-center justify-center bg-zinc-950"
          >
            <div v-if="failedImages[index]" class="py-24 text-center space-y-3">
              <p class="text-xs sm:text-sm text-zinc-500">Не удалось загрузить страницу {{ index + 1 }}</p>
              <button
                type="button"
                class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold rounded-lg flex items-center gap-2 mx-auto"
                @click.stop="retryImage(index)"
              >
                <RotateCw class="w-3.5 h-3.5" />
                <span>Повторить</span>
              </button>
            </div>

            <ZoomableImage
              v-else
              :src="getPageSrc(pageUrl, index)"
              :index="index"
              :alt="`Страница ${index + 1}`"
              @error="onImageError(index)"
              @tap-center="toggleControls"
              @long-press="handleImageLongPress"
            />
          </div>
        </div>

        <!-- 2. Single Page Mode with Pinch & Tap Zones -->
        <div
          v-else
          :class="['mx-auto flex flex-col items-center select-none relative', widthClass]"
        >
          <div class="w-full relative min-h-[450px] sm:min-h-[600px] flex items-center justify-center bg-zinc-950">
            <div v-if="failedImages[currentPageIndex]" class="py-24 text-center space-y-3 z-20">
              <p class="text-xs sm:text-sm text-zinc-500">Не удалось загрузить страницу {{ currentPageIndex + 1 }}</p>
              <button
                type="button"
                class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold rounded-lg flex items-center gap-2 mx-auto"
                @click.stop="retryImage(currentPageIndex)"
              >
                <RotateCw class="w-3.5 h-3.5" />
                <span>Повторить</span>
              </button>
            </div>

            <ZoomableImage
              v-else
              :src="getPageSrc(pages[currentPageIndex], currentPageIndex)"
              :index="currentPageIndex"
              :alt="`Страница ${currentPageIndex + 1}`"
              :is-single-page="true"
              @error="onImageError(currentPageIndex)"
              @tap-left="prevPage"
              @tap-center="toggleControls"
              @tap-right="nextPage"
              @long-press="handleImageLongPress"
            />
          </div>

          <!-- Page Counter Pill -->
          <div class="py-3 sm:py-4 flex items-center gap-3">
            <span class="text-xs sm:text-sm font-bold text-zinc-400">
              Страница {{ currentPageIndex + 1 }} из {{ pages.length }}
            </span>
          </div>
        </div>

        <!-- Bottom Chapter Navigation Controls -->
        <div class="max-w-xl mx-auto px-4 py-8 sm:py-12 flex flex-col items-center gap-4 sm:gap-6">
          <div class="flex items-center gap-2.5 sm:gap-3 w-full">
            <button
              type="button"
              :disabled="!prevChapter"
              class="flex-1 py-3.5 sm:py-4 px-4 sm:px-6 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white font-bold text-xs sm:text-base border border-zinc-800 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]"
              @click="prevChapter && goToChapter(prevChapter.id)"
            >
              <ChevronLeft class="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Пред. глава</span>
            </button>

            <button
              type="button"
              :disabled="!nextChapter"
              class="flex-1 py-3.5 sm:py-4 px-4 sm:px-6 rounded-2xl bg-white hover:bg-zinc-200 text-zinc-950 font-black text-xs sm:text-base disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-2 transition-all shadow-xl active:scale-[0.98]"
              @click="nextChapter && goToChapter(nextChapter.id)"
            >
              <span>След. глава</span>
              <ChevronRight class="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <NuxtLink
            :to="parentManga ? `/manga/${parentManga.id}?type=${isNovelChapter ? 'novel' : 'manga'}` : (mangaDir ? `/manga/${mangaDir}?type=${isNovelChapter ? 'novel' : 'manga'}` : '/catalog')"
            class="text-xs sm:text-sm font-bold text-zinc-400 hover:text-white transition-colors"
          >
            ← К списку глав
          </NuxtLink>
        </div>
      </div>
    </main>

    <!-- Long Press Context Menu Bottom Sheet / Modal -->
    <Teleport to="body">
      <transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isContextMenuOpen && contextMenuPage"
          class="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 select-none"
          @click.self="closeContextMenu"
        >
          <div
            class="w-full max-w-sm bg-zinc-950 sm:bg-zinc-900 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4 pb-safe animate-in slide-in-from-bottom duration-200"
          >
            <!-- Mobile drag handle pill -->
            <div class="w-10 h-1 bg-zinc-700/80 rounded-full mx-auto -mt-1 mb-2 sm:hidden"></div>

            <!-- Header -->
            <div class="flex items-center justify-between gap-3 border-b border-zinc-800/80 pb-3.5">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-14 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0">
                  <img
                    :src="contextMenuPage.src"
                    alt="Миниатюра страницы"
                    class="w-full h-full object-cover object-top"
                  />
                </div>
                <div class="min-w-0">
                  <h3 class="text-sm sm:text-base font-bold text-white truncate">
                    Страница {{ contextMenuPage.index + 1 }}
                  </h3>
                  <p class="text-xs text-zinc-400 truncate">
                    Глава {{ chapterInfo?.chapter || '1' }}
                    <span v-if="parentManga?.title"> · {{ parentManga.title }}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                class="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                title="Закрыть"
                @click="closeContextMenu"
              >
                <X class="w-5 h-5" />
              </button>
            </div>

            <!-- 2 Context Actions -->
            <div class="space-y-2">
              <!-- Action 1: Reload Image -->
              <button
                type="button"
                class="w-full flex items-center gap-3.5 p-3 sm:p-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 border border-zinc-800 text-left transition-all active:scale-[0.98] cursor-pointer group"
                @click="reloadContextImage"
              >
                <div class="w-10 h-10 rounded-xl bg-zinc-800/90 group-hover:bg-zinc-700 flex items-center justify-center text-zinc-200 shrink-0 border border-zinc-700/60 shadow">
                  <RotateCw class="w-5 h-5 text-amber-400" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-xs sm:text-sm font-bold text-zinc-100 group-hover:text-white">
                    Перезагрузить изображение
                  </div>
                  <div class="text-[11px] text-zinc-400">
                    Очистить кэш и скачать страницу заново
                  </div>
                </div>
              </button>

              <!-- Action 2: Save Image -->
              <button
                type="button"
                :disabled="isSavingImage"
                class="w-full flex items-center gap-3.5 p-3 sm:p-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 border border-zinc-800 text-left transition-all active:scale-[0.98] cursor-pointer group disabled:opacity-50"
                @click="saveContextImage"
              >
                <div class="w-10 h-10 rounded-xl bg-zinc-800/90 group-hover:bg-zinc-700 flex items-center justify-center text-zinc-200 shrink-0 border border-zinc-700/60 shadow">
                  <SpinnerArrow v-if="isSavingImage" class="w-5 h-5 text-sky-400" />
                  <Download v-else class="w-5 h-5 text-sky-400" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-xs sm:text-sm font-bold text-zinc-100 group-hover:text-white">
                    {{ isSavingImage ? 'Сохранение...' : 'Сохранить изображение' }}
                  </div>
                  <div class="text-[11px] text-zinc-400">
                    Скачать файл страницы на устройство
                  </div>
                </div>
              </button>
            </div>

            <!-- Cancel Button -->
            <button
              type="button"
              class="w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-400 hover:text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              @click="closeContextMenu"
            >
              Отмена
            </button>
          </div>
        </div>
      </transition>

      <!-- Floating Toast Notification -->
      <transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-3 scale-95"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 translate-y-3 scale-95"
      >
        <div
          v-if="toastMessage"
          class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] bg-zinc-900/95 text-zinc-100 px-4 py-2.5 rounded-2xl border border-zinc-700/80 shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-xs sm:text-sm font-bold pointer-events-none"
        >
          <Check class="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{{ toastMessage }}</span>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style>
.novel-content p {
  margin-bottom: 0.9em;
  text-indent: 1.25em;
  word-break: break-word;
}
.novel-content p:last-child {
  margin-bottom: 0;
}
.novel-content p:empty,
.novel-content p:has(> br:only-child) {
  display: none;
}
.novel-content strong {
  font-weight: 700;
}
.novel-content em,
.novel-content i {
  font-style: italic;
}
.novel-content img {
  max-width: 100%;
  height: auto;
  border-radius: 0.75rem;
  margin: 1.5rem auto;
  display: block;
}
</style>
