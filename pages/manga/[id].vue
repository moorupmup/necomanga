<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWindowScroll } from '@vueuse/core'
import {
  BookOpen,
  Bookmark,
  ChevronDown,
  ArrowUpDown,
  Search,
  CheckCircle2,
  Calendar,
  Users,
  AlertCircle,
  Star,
  Eye,
  Lock,
  ArrowUp
} from 'lucide-vue-next'
import {
  useReManga,
  type MangaTitle,
  type VolumeGroup,
  type ChapterItem
} from '~/composables/useReManga'
import {
  useBookmarksStore,
  BOOKMARK_LABELS,
  type BookmarkStatus
} from '~/stores/bookmarks'
import AsyncImage from '~/components/AsyncImage.vue'
import SpinnerArrow from '~/components/SpinnerArrow.vue'
import { useHistoryStore } from '~/stores/history'

const route = useRoute()
const router = useRouter()
const mangaId = computed(() => route.params.id as string)

const { getMangaById, getAllChaptersGrouped } = useReManga()
const bookmarksStore = useBookmarksStore()
const historyStore = useHistoryStore()

const manga = ref<MangaTitle | null>(null)
const volumeGroups = ref<VolumeGroup[]>([])
const allChaptersList = ref<ChapterItem[]>([])
const selectedBranchId = ref<number | null>(null)
const isLoading = ref(true)
const isLoadingChapters = ref(false)
const error = ref<string | null>(null)
const isSortAsc = ref(true)
const chapterSearch = ref('')
const isBookmarkMenuOpen = ref(false)

const { y: scrollY } = useWindowScroll()

const scrollToTop = () => {
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const getStatusInfo = (status?: string) => {
  if (!status) return { text: 'Онгоинг', dotClass: 'bg-emerald-400', badgeClass: 'bg-emerald-950/30 text-emerald-300 border-emerald-800/40' }
  const s = status.toLowerCase()
  if (s.includes('заверш') || s.includes('complete')) {
    return { text: status, dotClass: 'bg-sky-400', badgeClass: 'bg-sky-950/30 text-sky-300 border-sky-800/40' }
  }
  if (s.includes('онгоинг') || s.includes('ongoing') || s.includes('продолж')) {
    return { text: status, dotClass: 'bg-emerald-400', badgeClass: 'bg-emerald-950/30 text-emerald-300 border-emerald-800/40' }
  }
  if (s.includes('заморож') || s.includes('pause') || s.includes('drop')) {
    return { text: status, dotClass: 'bg-rose-400', badgeClass: 'bg-rose-950/30 text-rose-300 border-rose-800/40' }
  }
  return { text: status, dotClass: 'bg-zinc-400', badgeClass: 'bg-zinc-900/80 text-zinc-300 border-zinc-800' }
}

const bookmark = computed(() => (manga.value ? bookmarksStore.getBookmark(manga.value.id) : null))
const lastRead = computed(() => historyStore.getLastRead(mangaId.value))

const allChapters = computed(() => {
  return [...allChaptersList.value].sort((a, b) => {
    const numA = parseFloat(a.chapter) || 0
    const numB = parseFloat(b.chapter) || 0
    return isSortAsc.value ? numA - numB : numB - numA
  })
})

const filteredChapters = computed(() => {
  if (!chapterSearch.value.trim()) return allChapters.value
  const q = chapterSearch.value.trim().toLowerCase()
  return allChapters.value.filter(ch => {
    return ch.chapter.includes(q) || (ch.name && ch.name.toLowerCase().includes(q))
  })
})

const firstChapter = computed(() => {
  const sorted = [...allChaptersList.value].sort((a, b) => {
    return (parseFloat(a.chapter) || 0) - (parseFloat(b.chapter) || 0)
  })
  // Prefer first free chapter if available
  const firstFree = sorted.find(c => !c.isPaid)
  return firstFree || sorted[0]
})

const loadChaptersForBranch = async (branchId: number) => {
  isLoadingChapters.value = true
  try {
    const res = await getAllChaptersGrouped(branchId)
    volumeGroups.value = res.groups
    allChaptersList.value = res.allChapters
  } catch (err: any) {
    console.error('Failed to load chapters for branch', branchId, err)
  } finally {
    isLoadingChapters.value = false
  }
}

const loadManga = async () => {
  isLoading.value = true
  error.value = null
  try {
    const mangaData = await getMangaById(mangaId.value)
    manga.value = mangaData

    // Default to first branch
    if (mangaData.branches && mangaData.branches.length > 0) {
      selectedBranchId.value = mangaData.branches[0].id
      await loadChaptersForBranch(mangaData.branches[0].id)
    }
  } catch (err: any) {
    error.value = err.message || 'Ошибка загрузки манги'
  } finally {
    isLoading.value = false
  }
}

watch(selectedBranchId, (newBranch) => {
  if (newBranch) {
    loadChaptersForBranch(newBranch)
  }
})

const toggleSort = () => {
  isSortAsc.value = !isSortAsc.value
}

const setBookmark = (status: BookmarkStatus) => {
  if (!manga.value) return
  bookmarksStore.setBookmark(manga.value, status)
  isBookmarkMenuOpen.value = false
}

const removeBookmark = () => {
  if (!manga.value) return
  bookmarksStore.removeBookmark(manga.value.id)
  isBookmarkMenuOpen.value = false
}

const isChapterRead = (chapterId: string, chapterNumber: string) => {
  if (!lastRead.value) return false
  const readNum = parseFloat(lastRead.value.chapterNumber) || 0
  const curNum = parseFloat(chapterNumber) || 0
  return curNum <= readNum
}

onMounted(() => {
  loadManga()
})
</script>

<template>
  <div v-if="isLoading" class="min-h-[70vh] flex items-center justify-center">
    <div class="flex flex-col items-center gap-4 text-zinc-400">
      <SpinnerArrow class="w-10 h-10 text-zinc-300" />
      <span class="text-sm font-semibold">Загрузка тайтла...</span>
    </div>
  </div>

  <div v-else-if="error" class="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
    <AlertCircle class="w-12 h-12 text-zinc-500 mx-auto" />
    <h2 class="text-xl font-bold text-zinc-200">Не удалось загрузить тайтл</h2>
    <p class="text-sm text-zinc-400">{{ error }}</p>
    <button
      type="button"
      class="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-bold"
      @click="loadManga"
    >
      Попробовать снова
    </button>
  </div>

  <div v-else-if="manga" class="relative min-h-screen">
    <!-- Ambient Backdrop Glow (positioned absolute, eliminates empty gap) -->
    <div class="absolute top-0 inset-x-0 h-[480px] overflow-hidden pointer-events-none select-none z-0">
      <img
        :src="manga.coverUrlOriginal || manga.coverUrl"
        :alt="manga.title"
        class="w-full h-full object-cover object-center blur-3xl opacity-20 scale-125"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-zinc-950/20 via-zinc-950/80 to-zinc-950"></div>
    </div>

    <!-- Main Content Container with Natural Top Padding -->
    <div class="relative z-10 w-full px-4 sm:px-8 xl:px-12 pt-6 sm:pt-8 md:pt-10 space-y-10 pb-28">
      
      <!-- Top Info Section (Poster + Details) -->
      <div class="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start">
        
        <!-- Left Poster Column (Fixed, optimal width) -->
        <div class="w-full sm:w-72 md:w-80 lg:w-[280px] xl:w-[320px] flex-shrink-0 flex flex-col items-center sm:items-start space-y-4">
          <div class="relative aspect-[2/3] w-64 sm:w-full rounded-3xl overflow-hidden shadow-2xl shadow-black/80 border border-zinc-800/80 bg-zinc-950 group">
            <AsyncImage
              :src="manga.coverUrlOriginal || manga.coverUrl"
              :alt="manga.title"
              aspect-class="aspect-[2/3]"
              img-class="group-hover:scale-105 transition-transform duration-500"
            />
            <!-- Type badge with glass effect -->
            <div class="absolute top-3.5 left-3.5">
              <span class="glass-badge inline-flex items-center px-3 py-1.5 text-xs sm:text-sm font-bold rounded-xl text-zinc-100 shadow-md">
                {{ manga.type || 'Манга' }}
              </span>
            </div>
            <!-- Rating badge -->
            <div v-if="manga.avgRating" class="absolute top-3.5 right-3.5">
              <span class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-black rounded-xl bg-amber-400 text-zinc-950 shadow-lg font-mono">
                <Star class="w-3.5 h-3.5 fill-current" />
                {{ manga.avgRating }}
              </span>
            </div>
          </div>

          <!-- Bookmark Selector -->
          <div class="w-64 sm:w-full relative">
            <button
              type="button"
              class="w-full py-3.5 px-5 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-between border transition-all bg-zinc-900/80 hover:bg-zinc-800 text-zinc-100 border-zinc-800 hover:border-zinc-700 shadow-lg"
              @click="isBookmarkMenuOpen = !isBookmarkMenuOpen"
            >
              <div class="flex items-center gap-2.5">
                <Bookmark :class="['w-5 h-5', bookmark ? 'fill-white text-white' : 'text-zinc-400']" />
                <span>{{ bookmark ? BOOKMARK_LABELS[bookmark.status] : 'Добавить в закладки' }}</span>
              </div>
              <ChevronDown class="w-4 h-4 text-zinc-400" />
            </button>

            <!-- Dropdown Menu -->
            <div
              v-if="isBookmarkMenuOpen"
              class="absolute left-0 right-0 top-full mt-2 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl py-2 z-30 divide-y divide-zinc-900"
            >
              <button
                v-for="(label, key) in BOOKMARK_LABELS"
                :key="key"
                type="button"
                class="w-full px-5 py-3 text-left text-sm font-semibold text-zinc-200 hover:bg-zinc-900 flex items-center gap-3"
                @click="setBookmark(key as BookmarkStatus)"
              >
                <span class="w-2.5 h-2.5 rounded-full bg-zinc-400"></span>
                <span>{{ label }}</span>
              </button>
              <button
                v-if="bookmark"
                type="button"
                class="w-full px-5 py-3 text-left text-sm font-bold text-rose-400 hover:bg-rose-950/20"
                @click="removeBookmark"
              >
                Удалить из закладок
              </button>
            </div>
          </div>
        </div>

        <!-- Right: Metadata & Actions (Fills remaining space next to poster) -->
        <div class="flex-1 min-w-0 space-y-6">
          <div class="space-y-2">
            <h1 class="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
              {{ manga.title }}
            </h1>
            <p v-if="manga.altTitle" class="text-lg sm:text-xl text-zinc-400 font-medium">
              {{ manga.altTitle }}
            </p>
          </div>

          <!-- Badges Row (Technical metadata with icons and status indicator) -->
          <div class="flex flex-wrap items-center gap-2.5">
            <span :class="['inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold border transition-colors', getStatusInfo(manga.status).badgeClass]">
              <span :class="['w-2 h-2 rounded-full', getStatusInfo(manga.status).dotClass]"></span>
              {{ getStatusInfo(manga.status).text }}
            </span>

            <span v-if="manga.year" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900/90 text-zinc-300 text-xs sm:text-sm font-semibold border border-zinc-800">
              <Calendar class="w-4 h-4 text-zinc-400" />
              {{ manga.year }}
            </span>

            <span v-if="manga.totalViews" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900/90 text-zinc-300 text-xs sm:text-sm font-semibold border border-zinc-800">
              <Eye class="w-4 h-4 text-zinc-400" />
              {{ manga.totalViews.toLocaleString('ru-RU') }} просмотров
            </span>

            <span v-if="allChapters.length" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900/90 text-zinc-300 text-xs sm:text-sm font-semibold border border-zinc-800">
              <BookOpen class="w-4 h-4 text-zinc-400" />
              {{ allChapters.length }} глав
            </span>
          </div>

          <!-- Branches / Translators Selector (if multiple teams) -->
          <div v-if="manga.branches && manga.branches.length > 1" class="space-y-2 pt-2">
            <label class="block text-xs uppercase tracking-wider text-zinc-400 font-bold">Команда перевода</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="branch in manga.branches"
                :key="branch.id"
                type="button"
                :class="[
                  'px-4 py-2 rounded-xl text-sm font-bold border transition-colors',
                  selectedBranchId === branch.id
                    ? 'bg-zinc-100 text-zinc-950 border-white shadow'
                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                ]"
                @click="selectedBranchId = branch.id"
              >
                {{ branch.publishers?.[0]?.name || 'Основной перевод' }} ({{ branch.count_chapters }} глав)
              </button>
            </div>
          </div>

          <!-- Genres & Categories Tags (Interactive hashtag pills) -->
          <div v-if="manga.genres?.length || manga.categories?.length" class="flex flex-wrap items-center gap-2 pt-1">
            <NuxtLink
              v-for="genre in (manga.genres || [])"
              :key="genre"
              :to="{ path: '/catalog', query: { q: genre } }"
              class="group inline-flex items-center gap-1 px-3.5 py-1 rounded-full text-xs sm:text-sm font-medium bg-zinc-900/70 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer shadow-xs"
              :title="`Искать тайтлы в жанре «${genre}»`"
            >
              <span class="text-zinc-500 group-hover:text-amber-400 transition-colors font-mono">#</span>
              <span>{{ genre }}</span>
            </NuxtLink>

            <NuxtLink
              v-for="cat in (manga.categories || []).slice(0, 6)"
              :key="cat"
              :to="{ path: '/catalog', query: { q: cat } }"
              class="inline-flex items-center px-3 py-1 rounded-full text-xs font-normal bg-zinc-950/70 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-900 hover:border-zinc-800 transition-all cursor-pointer"
              :title="`Искать по категории «${cat}»`"
            >
              {{ cat }}
            </NuxtLink>
          </div>

          <!-- Description Card (Full description displayed) -->
          <div class="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 text-base sm:text-lg text-zinc-300 leading-relaxed">
            <div v-if="manga.description" class="prose prose-invert max-w-none text-zinc-300" v-html="manga.description"></div>
            <p v-else class="text-zinc-500 italic">
              Описание пока отсутствует.
            </p>
          </div>

          <!-- Action Buttons (High contrast vibrant CTA) -->
          <div class="flex flex-wrap items-center gap-4 pt-1">
            <NuxtLink
              v-if="lastRead"
              :to="`/read/${lastRead.chapterId}?dir=${manga.id}`"
              class="px-8 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-base flex items-center gap-3 shadow-xl shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <BookOpen class="w-5 h-5" />
              <span>Продолжить чтение (Гл. {{ lastRead.chapterNumber }})</span>
            </NuxtLink>

            <NuxtLink
              v-if="firstChapter"
              :to="`/read/${firstChapter.id}?dir=${manga.id}`"
              :class="[
                'px-8 py-4 rounded-2xl font-black text-base flex items-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98]',
                lastRead
                  ? 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-800'
                  : 'bg-amber-400 hover:bg-amber-300 text-zinc-950 shadow-xl shadow-amber-500/20'
              ]"
            >
              <BookOpen class="w-5 h-5" />
              <span>{{ lastRead ? 'Читать сначала' : 'Начать читать (Гл. ' + firstChapter.chapter + ')' }}</span>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Chapter List Section -->
      <section class="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
          <div class="flex items-center gap-3">
            <h2 class="text-2xl sm:text-3xl font-black text-white tracking-tight">Список глав</h2>
            <span class="text-sm px-3 py-1 rounded-full bg-zinc-800 text-zinc-200 font-bold">
              {{ allChapters.length }}
            </span>
            <SpinnerArrow v-if="isLoadingChapters" class="w-4 h-4 text-zinc-400" />
          </div>

          <!-- Search and Sort Controls -->
          <div class="flex items-center gap-3">
            <div class="relative w-48 sm:w-72">
              <Search class="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
              <input
                v-model="chapterSearch"
                type="text"
                placeholder="Поиск по номеру главы..."
                class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 text-sm font-medium"
              />
            </div>

            <button
              type="button"
              class="px-5 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 text-zinc-200 font-bold flex items-center gap-2 border border-zinc-800 text-sm transition-colors"
              @click="toggleSort"
            >
              <ArrowUpDown class="w-4 h-4 text-zinc-400" />
              <span>{{ isSortAsc ? 'С 1 главы' : 'С новых глав' }}</span>
            </button>
          </div>
        </div>

        <!-- Chapters List (Rendered without nested scrollbar) -->
        <div v-if="filteredChapters.length > 0" class="divide-y divide-zinc-900/80">
          <NuxtLink
            v-for="ch in filteredChapters"
            :key="ch.id"
            :to="`/read/${ch.id}?dir=${manga.id}`"
            class="group flex items-center justify-between py-4 px-3 rounded-xl hover:bg-zinc-900/60 transition-colors"
          >
            <div class="flex items-center gap-4">
              <div
                :class="[
                  'w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 transition-colors border',
                  ch.isPaid
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : isChapterRead(ch.id, ch.chapter)
                      ? 'bg-zinc-800 text-white border-zinc-700'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 group-hover:bg-white group-hover:text-zinc-950'
                ]"
              >
                <Lock v-if="ch.isPaid" class="w-4 h-4" />
                <span v-else>{{ ch.chapter }}</span>
              </div>

              <div>
                <div class="text-base sm:text-lg font-bold text-zinc-100 group-hover:text-white transition-colors flex items-center gap-2">
                  <span>Глава {{ ch.chapter }}</span>
                  <span v-if="ch.name" class="text-sm text-zinc-400 font-normal">
                    — {{ ch.name }}
                  </span>
                  <span
                    v-if="ch.isPaid"
                    class="px-2 py-0.5 text-xs font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  >
                    Платная глава
                  </span>
                </div>
                <div class="text-xs sm:text-sm text-zinc-400 flex items-center gap-3 mt-1 font-medium">
                  <span v-if="ch.tome">Том {{ ch.tome }}</span>
                  <span v-if="ch.groupName">Перевод: {{ ch.groupName }}</span>
                  <span v-if="ch.uploadDate" class="text-zinc-500">{{ new Date(ch.uploadDate).toLocaleDateString('ru-RU') }}</span>
                </div>
              </div>
            </div>

            <!-- Checkmark or Action -->
            <div class="flex items-center gap-3 text-sm text-zinc-400">
              <CheckCircle2
                v-if="isChapterRead(ch.id, ch.chapter)"
                class="w-5 h-5 text-zinc-300"
                title="Прочитано"
              />
              <span class="opacity-0 group-hover:opacity-100 text-zinc-100 font-bold transition-opacity hidden sm:inline">
                {{ ch.isPaid ? 'Открыть →' : 'Читать →' }}
              </span>
            </div>
          </NuxtLink>
        </div>

        <div v-else class="text-center py-16 text-zinc-400 text-sm sm:text-base font-medium">
          Главы по запросу «{{ chapterSearch }}» не найдены
        </div>
      </section>
    </div>

    <!-- Floating Back to Top Button -->
    <transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-4"
    >
      <button
        v-if="scrollY > 500"
        type="button"
        class="fixed bottom-6 right-6 z-50 p-3.5 sm:px-4 sm:py-3 rounded-2xl bg-zinc-900/90 hover:bg-amber-400 text-zinc-300 hover:text-zinc-950 border border-zinc-700/80 hover:border-amber-400 shadow-2xl backdrop-blur-md transition-all group flex items-center gap-2 font-bold text-sm cursor-pointer"
        title="Наверх"
        @click="scrollToTop"
      >
        <ArrowUp class="w-5 h-5 transition-transform group-hover:-translate-y-0.5" />
        <span class="hidden sm:inline">Наверх</span>
      </button>
    </transition>
  </div>
</template>
