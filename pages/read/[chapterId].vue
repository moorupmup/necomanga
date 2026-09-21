<script setup lang="ts">
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
  X
} from 'lucide-vue-next'
import { useReManga, isNativePlatform } from '~/composables/useReManga'
import { useReaderSettingsStore } from '~/stores/readerSettings'
import { useHistoryStore } from '~/stores/history'
import SpinnerArrow from '~/components/SpinnerArrow.vue'

const route = useRoute()
const router = useRouter()
const chapterId = computed(() => route.params.chapterId as string)
const mangaDir = computed(() => (route.query.dir as string) || '')

const { getChapterPages, getMangaById } = useReManga()
const readerSettings = useReaderSettingsStore()
const historyStore = useHistoryStore()

const isLoading = ref(true)
const error = ref<string | null>(null)
const isHeaderVisible = ref(true)
const isSettingsOpen = ref(false)

const chapterInfo = ref<any>(null)
const parentManga = ref<any>(null)
const pages = ref<string[]>([])
const prevChapter = ref<any>(null)
const nextChapter = ref<any>(null)
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

const loadChapterData = async () => {
  isLoading.value = true
  error.value = null
  failedImages.value = {}
  currentPageIndex.value = 0
  retryKeys.value = {}
  prevChapter.value = null
  nextChapter.value = null

  try {
    const chapterData = await getChapterPages(chapterId.value)
    chapterInfo.value = chapterData
    pages.value = chapterData.pages
    prevChapter.value = chapterData.previous
    nextChapter.value = chapterData.next

    // If mangaDir is known, load title info & record progress
    if (mangaDir.value) {
      try {
        const manga = await getMangaById(mangaDir.value)
        parentManga.value = manga

        historyStore.recordProgress({
          mangaId: manga.id,
          mangaTitle: manga.title,
          coverUrl: manga.coverUrlSmall || manga.coverUrl,
          chapterId: chapterData.id,
          chapterNumber: chapterData.chapter || '0',
          volumeNumber: String(chapterData.tome || '1'),
          chapterTitle: chapterData.name
        })
      } catch (e) {
        console.warn('Could not load parent manga info', e)
      }
    }
  } catch (err: any) {
    error.value = err.message || 'Ошибка загрузки страниц главы'
  } finally {
    isLoading.value = false
  }
}

const goToChapter = (id: string) => {
  const query = mangaDir.value ? { dir: mangaDir.value } : {}
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
  } else if (nextChapter.value) {
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
}

watch(chapterId, () => {
  loadChapterData()
  window.scrollTo({ top: 0, behavior: 'instant' })
})

onMounted(() => {
  loadChapterData()
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div class="min-h-screen min-h-[100dvh] bg-black text-zinc-100 flex flex-col justify-between select-none">
    <!-- Top Sticky Floating Header with Safe Area -->
    <header
      :class="[
        'fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-b border-zinc-800/80 transition-transform duration-300 pt-safe px-3 sm:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4',
        isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
      ]"
    >
      <!-- Left: Back Button & Titles -->
      <div class="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
        <NuxtLink
          :to="parentManga ? `/manga/${parentManga.id}` : (mangaDir ? `/manga/${mangaDir}` : '/catalog')"
          class="p-2 sm:p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 flex-shrink-0 transition-colors"
          title="Вернуться к тайтлу"
        >
          <ArrowLeft class="w-4 h-4 sm:w-5 sm:h-5" />
        </NuxtLink>

        <div class="min-w-0">
          <h2 class="text-xs sm:text-base font-bold truncate text-white">
            {{ parentManga?.title || 'Чтение манги' }}
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
        <div class="sm:hidden flex items-center gap-1 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
          <button
            type="button"
            :disabled="!prevChapter"
            class="p-1.5 rounded-lg text-zinc-300 hover:text-white disabled:opacity-30"
            @click="prevChapter && goToChapter(prevChapter.id)"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
          <span class="text-xs font-bold px-1 text-zinc-200">
            {{ chapterInfo?.chapter || '...' }}
          </span>
          <button
            type="button"
            :disabled="!nextChapter"
            class="p-1.5 rounded-lg text-zinc-300 hover:text-white disabled:opacity-30"
            @click="nextChapter && goToChapter(nextChapter.id)"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          class="p-2 sm:p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors"
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
          <!-- Mode (Webtoon / Single) -->
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

          <!-- Reader Width -->
          <div>
            <label class="block text-zinc-300 font-bold mb-2.5">Ширина страницы</label>
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
          class="fixed inset-0 bg-black/75 backdrop-blur-xs"
          @click="isSettingsOpen = false"
        ></div>

        <div class="relative bg-zinc-950 border-t border-zinc-800 rounded-t-3xl p-5 pb-safe space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200">
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

          <!-- Mode (Webtoon / Single) -->
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

          <!-- Reader Width -->
          <div>
            <label class="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-2">Ширина страниц</label>
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
              :to="parentManga ? `/manga/${parentManga.id}` : '/catalog'"
              class="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs sm:text-sm font-bold border border-zinc-800"
            >
              К тайтлу
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Paid / Licensed Chapter Notice -->
      <div v-else-if="chapterInfo?.isPaid || pages.length === 0" class="min-h-[60vh] flex items-center justify-center p-4">
        <div class="max-w-lg w-full text-center space-y-6 bg-zinc-950 border border-amber-500/30 p-6 sm:p-10 rounded-3xl shadow-2xl">
          <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
            <Lock class="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <div class="space-y-2">
            <h2 class="text-xl sm:text-2xl font-black text-white">Платная глава</h2>
            <p class="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              {{ (chapterInfo?.msg || 'Эта глава лицензирована правообладателем или является платной.').replace(/remanga(\.org)?/gi, 'источник') }}
            </p>
          </div>

          <div class="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <a
              :href="`https://remanga.org/manga/${mangaDir || ''}`"
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

      <!-- Success: Pages rendering -->
      <div v-else>
        <!-- 1. Webtoon Continuous Vertical Scroll Mode -->
        <div
          v-if="readerSettings.mode === 'webtoon'"
          :class="['mx-auto flex flex-col items-center select-none', widthClass]"
          @click="toggleControls"
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

            <img
              v-else
              :src="getPageSrc(pageUrl, index)"
              :alt="`Страница ${index + 1}`"
              class="w-full h-auto block"
              loading="lazy"
              @error="onImageError(index)"
            />
          </div>
        </div>

        <!-- 2. Single Page Mode with 3 Touch Zones -->
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

            <img
              v-else
              :src="getPageSrc(pages[currentPageIndex], currentPageIndex)"
              :alt="`Страница ${currentPageIndex + 1}`"
              class="w-full h-auto block pointer-events-none"
              @error="onImageError(currentPageIndex)"
            />

            <!-- 3 Touch Tap Zones for Single Page Mode -->
            <div class="absolute inset-0 z-10 flex">
              <!-- Left 30%: Previous Page -->
              <div
                class="w-[30%] h-full cursor-w-resize"
                title="Предыдущая страница"
                @click="prevPage"
              ></div>

              <!-- Center 40%: Toggle Controls -->
              <div
                class="w-[40%] h-full cursor-pointer"
                title="Показать/скрыть меню"
                @click="toggleControls"
              ></div>

              <!-- Right 30%: Next Page -->
              <div
                class="w-[30%] h-full cursor-e-resize"
                title="Следующая страница"
                @click="nextPage"
              ></div>
            </div>
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
            :to="parentManga ? `/manga/${parentManga.id}` : (mangaDir ? `/manga/${mangaDir}` : '/catalog')"
            class="text-xs sm:text-sm font-bold text-zinc-400 hover:text-white transition-colors"
          >
            ← К списку глав
          </NuxtLink>
        </div>
      </div>
    </main>
  </div>
</template>
