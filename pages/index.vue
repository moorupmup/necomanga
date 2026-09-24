<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useIntersectionObserver, useWindowSize } from '@vueuse/core'
import {
  Flame,
  Clock,
  Sparkles,
  BookOpen,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  RefreshCw,
  Layers,
  Zap,
  ShieldAlert,
  RotateCcw,
  Crown,
  GraduationCap,
  Swords,
  Star,
  Compass,
  Smile,
  Trophy,
  Heart,
  Brain,
  Laugh,
  Ghost,
  Scroll,
  Award
} from 'lucide-vue-next'
import { useReManga, type MangaTitle } from '~/composables/useReManga'
import { useContentSourceStore } from '~/stores/contentSource'
import MangaCard from '~/components/MangaCard.vue'
import AsyncImage from '~/components/AsyncImage.vue'
import SpinnerArrow from '~/components/SpinnerArrow.vue'

const { getMangaList, getTrendingTitles } = useReManga()
const contentSourceStore = useContentSourceStore()

const activeTab = ref<'popular' | 'latest' | 'manhwa' | 'manhua'>('popular')
const mangaItems = ref<MangaTitle[]>([])
const featuredItems = ref<MangaTitle[]>([])
const trendingItems = ref<MangaTitle[]>([])
const popularTodayItems = ref<MangaTitle[]>([])

const isLoading = ref(true)
const isLoadingMore = ref(false)
const isLoadingTrending = ref(true)
const isLoadingPopularToday = ref(true)

const error = ref<string | null>(null)
const loadMoreError = ref<string | null>(null)
const page = ref(1)
const hasMore = ref(true)
const loadMoreTrigger = ref<HTMLElement | null>(null)

const tabs = computed(() => {
  if (contentSourceStore.isRanobe) {
    return [
      { id: 'popular' as const, label: 'Популярное', icon: Flame },
      { id: 'latest' as const, label: 'Новые главы', icon: Clock },
      { id: 'manhwa' as const, label: 'Корейские новеллы', icon: Layers },
      { id: 'manhua' as const, label: 'Китайские новеллы', icon: Sparkles }
    ]
  }
  return [
    { id: 'popular' as const, label: 'Популярное', icon: Flame },
    { id: 'latest' as const, label: 'Новые главы', icon: Clock },
    { id: 'manhwa' as const, label: 'Корейская манхва', icon: Layers },
    { id: 'manhua' as const, label: 'Китайская маньхуа', icon: Sparkles }
  ]
})

interface CollectionSubItem {
  id: string
  label: string
  emoji?: string
  icon?: any
  params: {
    categories?: number | string
    genres?: number | string
    types?: number | string
    ordering?: string
  }
}

interface CollectionCategory {
  id: 'trope' | 'mood' | 'format'
  label: string
  icon: any
  tagline: string
  activeCircleClass: string
  inactiveCircleClass: string
  activeLabelClass: string
  dotClass: string
  items: CollectionSubItem[]
}

const mangaCollectionCategories: CollectionCategory[] = [
  {
    id: 'trope',
    label: 'По тропу',
    icon: Compass,
    tagline: 'Любимые сюжетные архетипы, всесильные герои и реинкарнации',
    activeCircleClass: 'bg-gradient-to-br from-amber-400/40 via-amber-500/25 to-orange-500/35 text-amber-300 ring-2 ring-amber-400 ring-offset-4 ring-offset-zinc-950 shadow-xl shadow-amber-500/30 scale-105 border border-amber-400/80',
    inactiveCircleClass: 'bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-zinc-900/90 text-amber-400/80 border border-amber-500/30 hover:border-amber-400/60 hover:from-amber-500/25 hover:text-amber-300',
    activeLabelClass: 'text-amber-400',
    dotClass: 'bg-amber-400',
    items: [
      {
        id: 'op_mc',
        label: 'ГГ имба',
        emoji: '💥',
        params: { categories: 110, ordering: '-votes' }
      },
      {
        id: 'dungeons',
        label: 'Врата, Подземелья и Охотники',
        emoji: '⚔️',
        params: { categories: 86, ordering: '-votes' }
      },
      {
        id: 'revenge',
        label: 'Второй шанс и Месть',
        emoji: '🗡️',
        params: { categories: 79, ordering: '-votes' }
      },
      {
        id: 'villainess',
        label: 'Злодейки и Дворцовые интриги',
        emoji: '👑',
        params: { categories: 117, ordering: '-votes' }
      },
      {
        id: 'academy',
        label: 'Магическая академия',
        emoji: '🔮',
        params: { categories: 78, ordering: '-votes' }
      },
      {
        id: 'cultivation',
        label: 'Боевые искусства',
        emoji: '🥋',
        params: { categories: 18, ordering: '-votes' }
      }
    ]
  },
  {
    id: 'mood',
    label: 'По настроению',
    icon: Smile,
    tagline: 'Истории под любое душевное состояние — от комедии до триллера',
    activeCircleClass: 'bg-gradient-to-br from-rose-400/40 via-pink-500/25 to-purple-600/35 text-pink-200 ring-2 ring-rose-400 ring-offset-4 ring-offset-zinc-950 shadow-xl shadow-rose-500/30 scale-105 border border-rose-400/80',
    inactiveCircleClass: 'bg-gradient-to-br from-rose-500/15 via-pink-500/10 to-zinc-900/90 text-rose-400/80 border border-rose-500/30 hover:border-rose-400/60 hover:from-rose-500/25 hover:text-pink-300',
    activeLabelClass: 'text-rose-400',
    dotClass: 'bg-rose-400',
    items: [
      {
        id: 'action',
        label: 'Помахаться (Экшен)',
        emoji: '⚔️',
        params: { genres: 2, ordering: '-votes' }
      },
      {
        id: 'romance',
        label: 'Романтика и бабочки',
        emoji: '💖',
        params: { genres: 25, ordering: '-votes' }
      },
      {
        id: 'mindbreak',
        label: 'Сломать мозг (Психология / Детектив)',
        emoji: '🧠',
        params: { genres: 24, ordering: '-votes' }
      },
      {
        id: 'comedy',
        label: 'Поржать (Комедия)',
        emoji: '😂',
        params: { genres: 50, ordering: '-votes' }
      },
      {
        id: 'isekai',
        label: 'Попаданцы (Исекай)',
        emoji: '🏰',
        params: { categories: 115, ordering: '-votes' }
      },
      {
        id: 'thriller',
        label: 'Пощекотать нервы (Хоррор / Триллер)',
        emoji: '👻',
        params: { genres: 35, ordering: '-votes' }
      }
    ]
  },
  {
    id: 'format',
    label: 'По формату',
    icon: Trophy,
    tagline: 'Проверенные временем форматы, классика и элитные шедевры',
    activeCircleClass: 'bg-gradient-to-br from-sky-400/40 via-cyan-500/25 to-blue-600/35 text-cyan-200 ring-2 ring-sky-400 ring-offset-4 ring-offset-zinc-950 shadow-xl shadow-sky-500/30 scale-105 border border-sky-400/80',
    inactiveCircleClass: 'bg-gradient-to-br from-sky-500/15 via-indigo-500/10 to-zinc-900/90 text-sky-400/80 border border-sky-500/30 hover:border-sky-400/70 hover:from-sky-500/25 hover:text-cyan-300',
    activeLabelClass: 'text-sky-400',
    dotClass: 'bg-sky-400',
    items: [
      {
        id: 'classic_manga',
        label: 'Золотая манга-классика',
        emoji: '📜',
        params: { types: 1, ordering: '-votes' }
      },
      {
        id: 'completed_masterpieces',
        label: 'Завершённые шедевры',
        emoji: '🏆',
        params: { ordering: '-votes' }
      },
      {
        id: 'club_9',
        label: 'Клуб 9.0+ (Абсолютный топ читателей)',
        emoji: '⭐',
        params: { ordering: '-rating' }
      }
    ]
  }
]

const ranobeCollectionCategories: CollectionCategory[] = [
  {
    id: 'trope',
    label: 'По тропу',
    icon: Compass,
    tagline: 'Любимые сюжетные архетипы новелл: реинкарнации, ЛитРПГ, системы и читы',
    activeCircleClass: 'bg-gradient-to-br from-blue-400/40 via-blue-500/25 to-indigo-600/35 text-blue-200 ring-2 ring-blue-400 ring-offset-4 ring-offset-zinc-950 shadow-xl shadow-blue-500/30 scale-105 border border-blue-400/80',
    inactiveCircleClass: 'bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-zinc-900/90 text-blue-400/80 border border-blue-500/30 hover:border-blue-400/60 hover:from-blue-500/25 hover:text-blue-300',
    activeLabelClass: 'text-blue-400',
    dotClass: 'bg-blue-400',
    items: [
      {
        id: 'reincarnation',
        label: 'Реинкарнация и перерождение',
        emoji: '🌀',
        params: { categories: 13, ordering: '-votes' }
      },
      {
        id: 'isekai_novels',
        label: 'Попаданцы (Исекай)',
        emoji: '🏰',
        params: { genres: 56, ordering: '-votes' }
      },
      {
        id: 'litrpg_novels',
        label: 'ЛитРПГ и Системы прокачки',
        emoji: '🎮',
        params: { genres: 57, ordering: '-votes' }
      },
      {
        id: 'cheats_op',
        label: 'Читы и Сила бога',
        emoji: '⚡',
        params: { categories: 158, ordering: '-votes' }
      },
      {
        id: 'survival_game',
        label: 'Игры на выживание',
        emoji: '⚔️',
        params: { categories: 144, ordering: '-votes' }
      },
      {
        id: 'vr_gaming',
        label: 'Виртуальная реальность (VR)',
        emoji: '🕶️',
        params: { categories: 167, ordering: '-votes' }
      },
      {
        id: 'battle_fantasy',
        label: 'Боевое фэнтези',
        emoji: '🔥',
        params: { categories: 170, ordering: '-votes' }
      },
      {
        id: 'power_struggle',
        label: 'Борьба за власть и интриги',
        emoji: '👑',
        params: { categories: 54, ordering: '-votes' }
      },
      {
        id: 'reverse_harem',
        label: 'Обратный Гарем',
        emoji: '🌹',
        params: { categories: 40, ordering: '-votes' }
      }
    ]
  },
  {
    id: 'mood',
    label: 'По настроению',
    icon: Smile,
    tagline: 'Истории под любое состояние — от яростного боевика до романтических новелл',
    activeCircleClass: 'bg-gradient-to-br from-rose-400/40 via-pink-500/25 to-purple-600/35 text-pink-200 ring-2 ring-rose-400 ring-offset-4 ring-offset-zinc-950 shadow-xl shadow-rose-500/30 scale-105 border border-rose-400/80',
    inactiveCircleClass: 'bg-gradient-to-br from-rose-500/15 via-pink-500/10 to-zinc-900/90 text-rose-400/80 border border-rose-500/30 hover:border-rose-400/60 hover:from-rose-500/25 hover:text-pink-300',
    activeLabelClass: 'text-rose-400',
    dotClass: 'bg-rose-400',
    items: [
      {
        id: 'action_novels',
        label: 'Ураганный экшен (Боевик)',
        emoji: '💥',
        params: { genres: 59, ordering: '-votes' }
      },
      {
        id: 'romance_novels',
        label: 'Любовные романы',
        emoji: '💖',
        params: { genres: 62, ordering: '-votes' }
      },
      {
        id: 'dark_fantasy_novel',
        label: 'Тёмное фэнтези',
        emoji: '💀',
        params: { categories: 172, ordering: '-votes' }
      },
      {
        id: 'urban_fantasy_novel',
        label: 'Городское фэнтези',
        emoji: '🌆',
        params: { categories: 171, ordering: '-votes' }
      },
      {
        id: 'suspense_thriller',
        label: 'Триллер и саспенс',
        emoji: '🕵️',
        params: { genres: 67, ordering: '-votes' }
      },
      {
        id: 'comedy_novel',
        label: 'Поржать (Комедия и юмор)',
        emoji: '😂',
        params: { genres: 53, ordering: '-votes' }
      },
      {
        id: 'time_travel_novel',
        label: 'Путешествия во времени',
        emoji: '⏳',
        params: { categories: 43, ordering: '-votes' }
      }
    ]
  },
  {
    id: 'format',
    label: 'По формату',
    icon: Trophy,
    tagline: 'Мировые школы новелл, авторские вселенные и признанные шедевры',
    activeCircleClass: 'bg-gradient-to-br from-sky-400/40 via-cyan-500/25 to-blue-600/35 text-cyan-200 ring-2 ring-sky-400 ring-offset-4 ring-offset-zinc-950 shadow-xl shadow-sky-500/30 scale-105 border border-sky-400/80',
    inactiveCircleClass: 'bg-gradient-to-br from-sky-500/15 via-indigo-500/10 to-zinc-900/90 text-sky-400/80 border border-sky-500/30 hover:border-sky-400/70 hover:from-sky-500/25 hover:text-cyan-300',
    activeLabelClass: 'text-sky-400',
    dotClass: 'bg-sky-400',
    items: [
      {
        id: 'korean_novels',
        label: 'Корейские веб-новеллы',
        emoji: '🇰🇷',
        params: { types: 10, ordering: '-votes' }
      },
      {
        id: 'chinese_novels',
        label: 'Китайские новеллы (Сянься/Уся)',
        emoji: '🇨🇳',
        params: { types: 11, ordering: '-votes' }
      },
      {
        id: 'japanese_light_novels',
        label: 'Японские ранобэ (Light Novel)',
        emoji: '🇯🇵',
        params: { types: 9, ordering: '-votes' }
      },
      {
        id: 'author_novels',
        label: 'Оригинальные авторские новеллы',
        emoji: '✍️',
        params: { types: 8, ordering: '-votes' }
      },
      {
        id: 'top_voted_novels',
        label: 'Абсолютный топ читателей',
        emoji: '⭐',
        params: { ordering: '-votes' }
      },
      {
        id: 'club_9_novels',
        label: 'Клуб 9.0+ (Шедевры)',
        emoji: '🏆',
        params: { ordering: '-rating' }
      }
    ]
  }
]

const collectionCategories = computed<CollectionCategory[]>(() => {
  return contentSourceStore.isRanobe ? ranobeCollectionCategories : mangaCollectionCategories
})

const selectedCategoryId = ref<'trope' | 'mood' | 'format'>('trope')
const selectedSubId = ref(contentSourceStore.isRanobe ? 'reincarnation' : 'op_mc')

// In-memory cache for collections: subKey -> { items: MangaTitle[], page: number, hasMore: boolean }
const collectionCache = ref<Record<string, { items: MangaTitle[]; page: number; hasMore: boolean }>>({})
const isLoadingSubCollection = ref(false)
const isLoadingMoreRows = ref(false)

// Grid row count logic: 3 rows initially, +5 rows on click
const visibleRows = ref(3)

const { width: windowWidth } = useWindowSize()

const gridColumns = computed(() => {
  if (windowWidth.value >= 1280) return 8
  if (windowWidth.value >= 1024) return 6
  if (windowWidth.value >= 768) return 5
  if (windowWidth.value >= 640) return 4
  return 3 // Exactly 3 cards per row on mobile!
})

const targetItemCount = computed(() => visibleRows.value * gridColumns.value)

const currentCategory = computed(() =>
  collectionCategories.value.find(c => c.id === selectedCategoryId.value) || collectionCategories.value[0]
)

const currentSubItem = computed(() =>
  currentCategory.value.items.find(i => i.id === selectedSubId.value) || currentCategory.value.items[0]
)

const activeCollectionKey = computed(() => `${contentSourceStore.mode}_${selectedCategoryId.value}_${selectedSubId.value}`)

const displayedCollectionItems = computed(() => {
  const cached = collectionCache.value[activeCollectionKey.value]
  if (!cached) return []
  return cached.items.slice(0, targetItemCount.value)
})

const hasMoreCollectionItems = computed(() => {
  const cached = collectionCache.value[activeCollectionKey.value]
  if (!cached) return false
  return cached.hasMore || cached.items.length > displayedCollectionItems.value.length
})

const selectCategory = (catId: 'trope' | 'mood' | 'format') => {
  if (selectedCategoryId.value === catId) return
  selectedCategoryId.value = catId
  const firstSub = currentCategory.value.items[0]
  if (firstSub) {
    selectSubItem(firstSub.id)
  }
}

const selectSubItem = async (subId: string) => {
  selectedSubId.value = subId
  visibleRows.value = 3

  const key = activeCollectionKey.value
  const cached = collectionCache.value[key]

  // If already cached with enough items or no more items, avoid refetching
  if (cached && (cached.items.length >= targetItemCount.value || !cached.hasMore)) {
    return
  }

  isLoadingSubCollection.value = true
  try {
    const sub = currentCategory.value.items.find(i => i.id === subId) || currentSubItem.value
    const pageToFetch = cached ? cached.page + 1 : 1
    const res = await getMangaList({
      page: pageToFetch,
      count: 24,
      ...sub.params
    })

    if (cached) {
      const existingIds = new Set(cached.items.map(m => m.id))
      const newItems = res.items.filter(m => !existingIds.has(m.id))
      cached.items.push(...newItems)
      cached.page = pageToFetch
      cached.hasMore = res.hasMore && res.items.length > 0
    } else {
      collectionCache.value[key] = {
        items: res.items,
        page: 1,
        hasMore: res.hasMore && res.items.length > 0
      }
    }
  } catch (e) {
    console.error('Failed to load collection items for', key, e)
  } finally {
    isLoadingSubCollection.value = false
  }
}

const loadMoreRows = async () => {
  visibleRows.value += 5

  const key = activeCollectionKey.value
  const cached = collectionCache.value[key]
  if (!cached) return

  // If cached count is less than needed and API has more, fetch next page
  if (cached.items.length < targetItemCount.value && cached.hasMore) {
    isLoadingMoreRows.value = true
    try {
      const sub = currentSubItem.value
      const nextPage = cached.page + 1
      const res = await getMangaList({
        page: nextPage,
        count: 24,
        ...sub.params
      })

      const existingIds = new Set(cached.items.map(m => m.id))
      const newItems = res.items.filter(m => !existingIds.has(m.id))
      cached.items.push(...newItems)
      cached.page = nextPage
      cached.hasMore = res.hasMore && res.items.length > 0
    } catch (e) {
      console.error('Failed to load more rows for collection', key, e)
    } finally {
      isLoadingMoreRows.value = false
    }
  }
}

const loadCuratedSections = async () => {
  // 1. Featured (Главные хиты)
  if (featuredItems.value.length === 0) {
    try {
      const res = await getMangaList({ page: 1, count: 8, ordering: '-votes' })
      featuredItems.value = res.items
    } catch (e) {
      console.error('Failed to load featured', e)
    }
  }

  // 2. В тренде (Trending) - from ReManga v2/titles/top
  isLoadingTrending.value = true
  try {
    trendingItems.value = await getTrendingTitles(8)
  } catch (e) {
    console.error('Failed to load trending titles', e)
  } finally {
    isLoadingTrending.value = false
  }

  // 3. Популярно сегодня (Top views)
  isLoadingPopularToday.value = true
  try {
    const res = await getMangaList({ page: 1, count: 8, ordering: '-views' })
    popularTodayItems.value = res.items
  } catch (e) {
    console.error('Failed to load popular today', e)
  } finally {
    isLoadingPopularToday.value = false
  }

  // 4. Initial Collection Sub-item
  const initialSub = contentSourceStore.isRanobe ? 'reincarnation' : 'op_mc'
  selectSubItem(initialSub)
}

const loadData = async (reset = false) => {
  if (reset) {
    page.value = 1
    mangaItems.value = []
    hasMore.value = true
    isLoading.value = true
    error.value = null
  } else {
    isLoadingMore.value = true
    loadMoreError.value = null
  }

  try {
    let ordering = '-votes'
    let types: number | string | undefined

    if (activeTab.value === 'popular') {
      ordering = '-votes'
    } else if (activeTab.value === 'latest') {
      ordering = '-chapter_date'
    } else if (activeTab.value === 'manhwa') {
      ordering = '-votes'
      types = contentSourceStore.isRanobe ? 10 : 2
    } else if (activeTab.value === 'manhua') {
      ordering = '-votes'
      types = contentSourceStore.isRanobe ? 11 : 3
    }

    const res = await getMangaList({
      page: page.value,
      count: 24,
      ordering,
      types
    })

    if (reset) {
      mangaItems.value = res.items
    } else {
      const existingIds = new Set(mangaItems.value.map(m => m.id))
      const newItems = res.items.filter(m => !existingIds.has(m.id))
      mangaItems.value.push(...newItems)
    }

    hasMore.value = res.hasMore && res.items.length > 0
  } catch (err: any) {
    if (reset) {
      error.value = err.message || 'Ошибка при загрузке каталога'
    } else {
      loadMoreError.value = err.message || 'Не удалось подгрузить следующие тайтлы'
    }
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

const loadMore = () => {
  if (!isLoadingMore.value && hasMore.value) {
    page.value++
    loadData(false)
  }
}

// Infinite scroll auto-trigger
useIntersectionObserver(
  loadMoreTrigger,
  ([{ isIntersecting }]) => {
    if (isIntersecting && !isLoading.value && !isLoadingMore.value && hasMore.value && !loadMoreError.value) {
      loadMore()
    }
  },
  {
    rootMargin: '400px'
  }
)

watch(activeTab, () => {
  loadData(true)
})

watch(() => contentSourceStore.mode, () => {
  collectionCache.value = {}
  featuredItems.value = []
  trendingItems.value = []
  popularTodayItems.value = []
  activeTab.value = 'popular'
  selectedCategoryId.value = 'trope'
  selectedSubId.value = contentSourceStore.isRanobe ? 'reincarnation' : 'op_mc'
  loadData(true)
  loadCuratedSections()
})

onMounted(() => {
  loadData(true)
  loadCuratedSections()
})
</script>

<template>
  <div class="w-full px-3.5 sm:px-8 xl:px-12 py-4 sm:py-10 space-y-8 sm:space-y-14">
    
    <!-- Hero Spotlight Section (Horizontal swipe on mobile, grid on desktop) -->
    <section v-if="featuredItems.length > 0" class="relative">
      <div class="flex items-center justify-between mb-3 sm:mb-6">
        <div class="space-y-0.5 sm:space-y-1.5">
          <h2 class="text-lg sm:text-3xl font-black tracking-tight text-white flex items-center gap-2 sm:gap-3">
            <Sparkles class="w-5 h-5 sm:w-7 sm:h-7" :class="contentSourceStore.accentText" />
            <span>{{ contentSourceStore.isRanobe ? 'Главные новеллы' : 'Главные хиты' }}</span>
          </h2>
          <p class="text-xs sm:text-base text-zinc-400 font-medium">Самые читаемые произведения</p>
        </div>
        <NuxtLink to="/catalog?sort=-votes" class="text-xs sm:text-base font-bold text-zinc-200 hover:text-white flex items-center gap-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl transition-colors shadow-lg active:scale-95">
          <span>Все</span>
          <ChevronRight class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </NuxtLink>
      </div>

      <div class="flex sm:grid overflow-x-auto sm:overflow-visible gap-2.5 sm:gap-4 pb-2 sm:pb-0 scrollbar-none snap-x sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 min-[1120px]:grid-cols-8 xl:grid-cols-8 -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
        <div
          v-for="item in featuredItems"
          :key="item.id"
          class="w-[140px] sm:w-auto flex-shrink-0 snap-start"
        >
          <MangaCard :manga="item" />
        </div>
      </div>
    </section>

    <!-- Trending Section (В тренде) -->
    <section v-if="trendingItems.length > 0 || isLoadingTrending" class="relative">
      <div class="flex items-center justify-between mb-3 sm:mb-6">
        <div class="space-y-0.5 sm:space-y-1.5">
          <h2 class="text-lg sm:text-3xl font-black tracking-tight text-white flex items-center gap-2 sm:gap-3">
            <TrendingUp class="w-5 h-5 sm:w-7 sm:h-7 text-rose-400" />
            <span>В тренде</span>
          </h2>
          <p class="text-xs sm:text-base text-zinc-400 font-medium">Горячие новинки и обсуждаемые онгоинги</p>
        </div>
        <NuxtLink to="/catalog" class="text-xs sm:text-base font-bold text-zinc-200 hover:text-white flex items-center gap-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl transition-colors shadow-lg active:scale-95">
          <span>Все</span>
          <ChevronRight class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </NuxtLink>
      </div>

      <!-- Skeletons -->
      <div v-if="isLoadingTrending" class="flex sm:grid overflow-x-auto sm:overflow-visible gap-2.5 sm:gap-4 pb-2 sm:pb-0 scrollbar-none snap-x sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 min-[1120px]:grid-cols-8 xl:grid-cols-8 -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
        <div
          v-for="i in 8"
          :key="i"
          class="w-[140px] sm:w-auto flex-shrink-0 snap-start aspect-[2/3] rounded-2xl bg-zinc-900/40 border border-zinc-800/60 animate-pulse"
        ></div>
      </div>

      <!-- Items -->
      <div v-else class="flex sm:grid overflow-x-auto sm:overflow-visible gap-2.5 sm:gap-4 pb-2 sm:pb-0 scrollbar-none snap-x sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 min-[1120px]:grid-cols-8 xl:grid-cols-8 -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
        <div
          v-for="item in trendingItems"
          :key="item.id"
          class="w-[140px] sm:w-auto flex-shrink-0 snap-start"
        >
          <MangaCard :manga="item" />
        </div>
      </div>
    </section>

    <!-- Popular Today Section (Популярно сегодня) -->
    <section v-if="popularTodayItems.length > 0 || isLoadingPopularToday" class="relative">
      <div class="flex items-center justify-between mb-3 sm:mb-6">
        <div class="space-y-0.5 sm:space-y-1.5">
          <h2 class="text-lg sm:text-3xl font-black tracking-tight text-white flex items-center gap-2 sm:gap-3">
            <Flame class="w-5 h-5 sm:w-7 sm:h-7 text-amber-400" />
            <span>Популярно сегодня</span>
          </h2>
          <p class="text-xs sm:text-base text-zinc-400 font-medium">Самое читаемое пользователями за день</p>
        </div>
        <NuxtLink to="/catalog?sort=-views" class="text-xs sm:text-base font-bold text-zinc-200 hover:text-white flex items-center gap-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl transition-colors shadow-lg active:scale-95">
          <span>Все</span>
          <ChevronRight class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </NuxtLink>
      </div>

      <!-- Skeletons -->
      <div v-if="isLoadingPopularToday" class="flex sm:grid overflow-x-auto sm:overflow-visible gap-2.5 sm:gap-4 pb-2 sm:pb-0 scrollbar-none snap-x sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 min-[1120px]:grid-cols-8 xl:grid-cols-8 -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
        <div
          v-for="i in 8"
          :key="i"
          class="w-[140px] sm:w-auto flex-shrink-0 snap-start aspect-[2/3] rounded-2xl bg-zinc-900/40 border border-zinc-800/60 animate-pulse"
        ></div>
      </div>

      <!-- Items -->
      <div v-else class="flex sm:grid overflow-x-auto sm:overflow-visible gap-2.5 sm:gap-4 pb-2 sm:pb-0 scrollbar-none snap-x sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 min-[1120px]:grid-cols-8 xl:grid-cols-8 -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
        <div
          v-for="item in popularTodayItems"
          :key="item.id"
          class="w-[140px] sm:w-auto flex-shrink-0 snap-start"
        >
          <MangaCard :manga="item" />
        </div>
      </div>
    </section>

    <!-- Choose Your Manga Section (Выбери свою мангу: двухуровневый селектор + сетка 3 ряда с кнопкой +5 рядов) -->
    <section class="relative space-y-5 sm:space-y-7">
      <!-- Section Header with clear bottom spacing to prevent text overlap -->
      <div class="space-y-1.5 sm:space-y-2 pb-2">
        <h2 class="text-xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5 sm:gap-3">
          <component :is="currentCategory.icon" class="w-6 h-6 sm:w-8 sm:h-8 transition-colors" :class="contentSourceStore.accentText" />
          <span>{{ contentSourceStore.isRanobe ? 'Выбери своё ранобэ' : 'Выбери свою мангу' }}</span>
        </h2>
        <p class="text-xs sm:text-base text-zinc-400 font-medium leading-relaxed">
          {{ currentCategory.tagline }}
        </p>
      </div>

      <!-- Level 1: Circle Sliders (Centered, generous padding, zero clipping) -->
      <div class="flex items-center justify-center gap-5 sm:gap-8 py-5 px-3 w-full">
        <button
          v-for="cat in collectionCategories"
          :key="cat.id"
          type="button"
          class="flex flex-col items-center gap-2.5 group shrink-0 cursor-pointer focus:outline-none select-none transition-transform active:scale-95"
          @click="selectCategory(cat.id)"
        >
          <!-- Circle with SVG icon (Enlarged: 80px mobile / 96px desktop) -->
          <div
            :class="[
              'w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center transition-all duration-300 relative',
              selectedCategoryId === cat.id
                ? cat.activeCircleClass
                : cat.inactiveCircleClass
            ]"
          >
            <component
              :is="cat.icon"
              class="w-8 h-8 sm:w-10 sm:h-10 transition-transform duration-300 group-hover:scale-110"
            />
            <span
              v-if="selectedCategoryId === cat.id"
              :class="['absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-zinc-950 animate-pulse', cat.dotClass]"
            ></span>
          </div>

          <!-- Title Label under Circle -->
          <span
            :class="[
              'text-xs sm:text-sm transition-colors text-center font-bold tracking-tight',
              selectedCategoryId === cat.id ? cat.activeLabelClass : 'text-zinc-400 group-hover:text-zinc-200'
            ]"
          >
            {{ cat.label }}
          </span>
        </button>
      </div>

      <!-- Level 2: Subsections / Labels Horizontal Slider -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
        <button
          v-for="sub in currentCategory.items"
          :key="sub.id"
          type="button"
          :class="[
            'flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm transition-all whitespace-nowrap border shrink-0 active:scale-95 cursor-pointer font-bold',
            selectedSubId === sub.id
              ? (contentSourceStore.isRanobe ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20 font-black' : 'bg-amber-400 text-zinc-950 border-amber-400 shadow-lg shadow-amber-500/20 font-black')
              : 'bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border-zinc-800'
          ]"
          @click="selectSubItem(sub.id)"
        >
          <span v-if="sub.emoji" class="text-sm leading-none">{{ sub.emoji }}</span>
          <component v-else-if="sub.icon" :is="sub.icon" class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>{{ sub.label }}</span>
        </button>
      </div>

      <!-- Level 3: Grid of Selected Manga (3 Cards per row on mobile, 3 Rows initially + 5 Rows Pagination) -->
      <div class="space-y-6 sm:space-y-8">
        <!-- Skeletons when initial sub-collection is loading -->
        <div
          v-if="isLoadingSubCollection"
          class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 min-[1120px]:grid-cols-8 xl:grid-cols-8 gap-2 sm:gap-3.5"
        >
          <div
            v-for="i in targetItemCount"
            :key="i"
            class="relative aspect-[2/3] rounded-2xl overflow-hidden border border-zinc-800/60 bg-zinc-900/40 flex flex-col justify-end p-2 sm:p-4 animate-pulse"
          >
            <div class="space-y-1.5 relative z-10">
              <div class="h-3 bg-zinc-800/80 rounded w-1/3"></div>
              <div class="h-3.5 bg-zinc-800 rounded w-4/5"></div>
            </div>
          </div>
        </div>

        <!-- Rendered Manga Cards Grid -->
        <div v-else-if="displayedCollectionItems.length > 0" class="space-y-6 sm:space-y-8">
          <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 min-[1120px]:grid-cols-8 xl:grid-cols-8 gap-2 sm:gap-3.5">
            <MangaCard
              v-for="manga in displayedCollectionItems"
              :key="manga.id"
              :manga="manga"
            />
          </div>

          <!-- Load More Button (+5 rows) -->
          <div v-if="hasMoreCollectionItems" class="flex justify-center pt-2">
            <button
              type="button"
              :disabled="isLoadingMoreRows"
              class="w-full sm:w-auto min-w-[240px] px-8 py-3.5 sm:py-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-100 hover:text-white text-xs sm:text-sm font-bold border border-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-center gap-2.5 shadow-xl shadow-black/40 active:scale-[0.98] cursor-pointer disabled:opacity-50"
              @click="loadMoreRows"
            >
              <SpinnerArrow v-if="isLoadingMoreRows" class="w-4 h-4" :class="contentSourceStore.accentText" />
              <ChevronDown v-else class="w-4 h-4" :class="contentSourceStore.accentText" />
              <span>{{ isLoadingMoreRows ? (contentSourceStore.isRanobe ? 'Подгружаем ранобэ...' : 'Подгружаем мангу...') : 'Показать еще' }}</span>
            </button>
          </div>
        </div>

        <!-- Empty state fallback -->
        <div v-else class="text-center py-12 text-zinc-500 space-y-2 bg-zinc-900/20 rounded-2xl border border-zinc-800/60 p-6">
          <BookOpen class="w-10 h-10 mx-auto opacity-40 text-zinc-400" />
          <p class="font-bold text-sm sm:text-base text-zinc-300">{{ contentSourceStore.isRanobe ? 'Ранобэ по данному фильтру пока не найдены' : 'Тайтлы по данному фильтру пока не найдены' }}</p>
          <p class="text-xs text-zinc-500">Попробуйте выбрать другой подраздел или формат</p>
        </div>
      </div>
    </section>

    <!-- Main Catalog Section -->
    <section class="space-y-6 sm:space-y-8">
      <!-- Filter Tabs -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-3 sm:pb-5">
        <div class="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            :class="[
              'flex items-center gap-2 px-3.5 sm:px-5 py-2 sm:py-3 rounded-xl text-xs sm:text-base font-bold transition-all whitespace-nowrap border shrink-0',
              activeTab === tab.id
                ? 'bg-zinc-100 text-zinc-950 border-white shadow-lg'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-900 border-zinc-800'
            ]"
            @click="activeTab = tab.id"
          >
            <component :is="tab.icon" class="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            <span>{{ tab.label }}</span>
          </button>
        </div>

        <span class="hidden sm:inline text-sm text-zinc-400 font-medium">
          Обновления каждый день
        </span>
      </div>

      <!-- Loading Skeletons for Large Cards (16 items) -->
      <div v-if="isLoading" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 min-[1120px]:grid-cols-8 xl:grid-cols-8 gap-2.5 sm:gap-4">
        <div
          v-for="i in 16"
          :key="i"
          class="relative aspect-[2/3] rounded-2xl overflow-hidden border border-zinc-800/60 bg-zinc-900/40 flex flex-col justify-end p-3 sm:p-5"
        >
          <div class="space-y-2 relative z-10">
            <div class="h-3.5 bg-zinc-800/80 rounded w-1/3"></div>
            <div class="h-4 bg-zinc-800 rounded w-4/5"></div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-12 sm:py-16 px-4 bg-zinc-900/40 rounded-2xl border border-rose-900/30 space-y-4">
        <p class="text-rose-400 text-sm sm:text-base font-semibold">{{ error }}</p>
        <button
          type="button"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-bold transition-colors"
          @click="loadData(true)"
        >
          <RefreshCw class="w-4 h-4" />
          <span>Повторить попытку</span>
        </button>
      </div>

      <!-- Manga Cards Grid (2 cols on mobile, 8 on wide desktop) -->
      <div v-else-if="mangaItems.length > 0" class="space-y-8 sm:space-y-12">
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 min-[1120px]:grid-cols-8 xl:grid-cols-8 gap-2.5 sm:gap-4">
          <MangaCard
            v-for="manga in mangaItems"
            :key="manga.id"
            :manga="manga"
          />
        </div>

        <!-- Skeletons for Infinite Scroll -->
        <div v-if="isLoadingMore" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 min-[1120px]:grid-cols-8 xl:grid-cols-8 gap-2.5 sm:gap-4 pt-2">
          <div
            v-for="i in 8"
            :key="i"
            class="relative aspect-[2/3] rounded-2xl overflow-hidden border border-zinc-800/60 bg-zinc-900/40 flex flex-col justify-end p-3 sm:p-5"
          >
            <div class="space-y-2 relative z-10">
              <div class="h-3.5 bg-zinc-800/80 rounded w-1/3"></div>
              <div class="h-4 bg-zinc-800 rounded w-4/5"></div>
            </div>
          </div>
        </div>

        <!-- Load More Error state with retry -->
        <div v-if="loadMoreError" class="flex flex-col items-center justify-center py-6 gap-3">
          <p class="text-sm text-rose-400 font-medium">{{ loadMoreError }}</p>
          <button
            type="button"
            class="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-bold transition-colors flex items-center gap-2 border border-zinc-700/60"
            @click="loadMore"
          >
            <RefreshCw class="w-4 h-4" />
            <span>Повторить загрузку</span>
          </button>
        </div>

        <!-- Infinite Scroll Sentinel Trigger -->
        <div ref="loadMoreTrigger" class="h-16 w-full flex items-center justify-center">
          <div v-if="isLoadingMore" class="flex items-center gap-3 text-zinc-300 text-sm sm:text-base font-semibold py-4">
            <SpinnerArrow class="w-5 h-5 text-zinc-300" />
            <span>{{ contentSourceStore.isRanobe ? 'Загрузка новых ранобэ...' : 'Загрузка новых тайтлов...' }}</span>
          </div>
          <div v-else-if="!hasMore && mangaItems.length > 0" class="text-zinc-500 text-sm font-semibold py-8 text-center">
            ✦ Все доступные произведения в данной категории загружены ✦
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-24 text-zinc-500 space-y-3">
        <BookOpen class="w-14 h-14 mx-auto opacity-40 text-zinc-400" />
        <p class="text-base sm:text-lg font-medium">{{ contentSourceStore.isRanobe ? 'Ранобэ в данной категории не найдены' : 'Тайтлы в данной категории не найдены' }}</p>
      </div>
    </section>
  </div>
</template>
