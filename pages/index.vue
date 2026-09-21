<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useIntersectionObserver } from '@vueuse/core'
import {
  Flame,
  Clock,
  Sparkles,
  BookOpen,
  ChevronRight,
  Loader2,
  RefreshCw,
  Layers
} from 'lucide-vue-next'
import { useReManga, type MangaTitle } from '~/composables/useReManga'
import MangaCard from '~/components/MangaCard.vue'
import AsyncImage from '~/components/AsyncImage.vue'
import SpinnerArrow from '~/components/SpinnerArrow.vue'

const { getMangaList } = useReManga()

const activeTab = ref<'popular' | 'latest' | 'manhwa' | 'manhua'>('popular')
const mangaItems = ref<MangaTitle[]>([])
const featuredItems = ref<MangaTitle[]>([])
const isLoading = ref(true)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)
const loadMoreError = ref<string | null>(null)
const page = ref(1)
const hasMore = ref(true)
const loadMoreTrigger = ref<HTMLElement | null>(null)

const tabs = [
  { id: 'popular', label: 'Популярное', icon: Flame },
  { id: 'latest', label: 'Новые главы', icon: Clock },
  { id: 'manhwa', label: 'Корейская манхва', icon: Layers },
  { id: 'manhua', label: 'Китайская маньхуа', icon: Sparkles }
] as const

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
      types = 2
    } else if (activeTab.value === 'manhua') {
      ordering = '-votes'
      types = 3
    }

    const res = await getMangaList({
      page: page.value,
      count: 24,
      ordering,
      types
    })

    if (reset) {
      mangaItems.value = res.items
      if (activeTab.value === 'popular' && featuredItems.value.length === 0) {
        featuredItems.value = res.items.slice(0, 8)
      }
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

onMounted(() => {
  loadData(true)
})
</script>

<template>
  <div class="w-full px-3.5 sm:px-8 xl:px-12 py-4 sm:py-10 space-y-8 sm:space-y-14">
    
    <!-- Hero Spotlight Section (Horizontal swipe on mobile, grid on desktop) -->
    <section v-if="featuredItems.length > 0" class="relative">
      <div class="flex items-center justify-between mb-3 sm:mb-6">
        <div class="space-y-0.5 sm:space-y-1.5">
          <h2 class="text-lg sm:text-3xl font-black tracking-tight text-white flex items-center gap-2 sm:gap-3">
            <Sparkles class="w-5 h-5 sm:w-7 sm:h-7 text-amber-400" />
            <span>Главные хиты</span>
          </h2>
          <p class="text-xs sm:text-base text-zinc-400 font-medium">Самые читаемые произведения</p>
        </div>
        <NuxtLink to="/catalog" class="text-xs sm:text-base font-bold text-zinc-200 hover:text-white flex items-center gap-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl transition-colors shadow-lg">
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
            <span>Загрузка новых тайтлов...</span>
          </div>
          <div v-else-if="!hasMore && mangaItems.length > 0" class="text-zinc-500 text-sm font-semibold py-8 text-center">
            ✦ Все доступные произведения в данной категории загружены ✦
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-24 text-zinc-500 space-y-3">
        <BookOpen class="w-14 h-14 mx-auto opacity-40 text-zinc-400" />
        <p class="text-base sm:text-lg font-medium">Тайтлы в данной категории не найдены</p>
      </div>
    </section>
  </div>
</template>
