<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Filter,
  Search,
  RotateCcw,
  BookOpen,
  X,
  Check,
  SlidersHorizontal
} from 'lucide-vue-next'
import { useReManga, type MangaTitle, type ReMangaGenre } from '~/composables/useReManga'
import { useContentSourceStore } from '~/stores/contentSource'
import { registerBackHandler } from '~/composables/useBackButton'
import MangaCard from '~/components/MangaCard.vue'
import SpinnerArrow from '~/components/SpinnerArrow.vue'

const route = useRoute()
const router = useRouter()
const { getMangaList, searchManga, getFilters } = useReManga()
const contentSourceStore = useContentSourceStore()

// Route query params handling
const getInitialType = (): string => {
  if (route.query.type) return String(route.query.type)
  if (route.query.origin === 'manhwa') return '2'
  if (route.query.origin === 'manhua') return '3'
  if (route.query.origin === 'manga') return '1'
  return 'all'
}

const query = ref((route.query.q as string) || '')
const selectedType = ref<string>(getInitialType())
const selectedSort = ref<string>((route.query.sort as string) || '-votes')
const selectedStatus = ref<string>((route.query.status as string) || 'all')
const selectedGenres = ref<number[]>([])
const availableGenres = ref<ReMangaGenre[]>([])

const items = ref<MangaTitle[]>([])
const isLoading = ref(true)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)
const page = ref(1)
const hasMore = ref(true)
const totalCount = ref(0)
const isFilterSheetOpen = ref(false)

const types = computed(() => {
  if (contentSourceStore.isRanobe) {
    return [
      { id: 'all', label: 'Все' },
      { id: '10', label: 'Корея' },
      { id: '11', label: 'Китай' },
      { id: '9', label: 'Япония' },
      { id: '8', label: 'Авторское' },
      { id: '12', label: 'Запад' },
      { id: '13', label: 'Фанфики' }
    ]
  }
  return [
    { id: 'all', label: 'Все' },
    { id: '2', label: 'Манхва' },
    { id: '3', label: 'Маньхуа' },
    { id: '1', label: 'Манга' },
    { id: '5', label: 'Рукомикс' }
  ]
})

const sortOptions = [
  { id: '-votes', label: 'По популярности' },
  { id: '-rating', label: 'По рейтингу' },
  { id: '-chapter_date', label: 'По обновлениям' },
  { id: '-views', label: 'По просмотрам' },
  { id: '-id', label: 'По новизне' }
]

const statusOptions = [
  { id: 'all', label: 'Любой статус' },
  { id: '2', label: 'Онгоинг' },
  { id: '1', label: 'Завершён' }
]

const activeFilterCount = computed(() => {
  let count = 0
  if (selectedType.value !== 'all') count++
  if (selectedSort.value !== '-votes') count++
  if (selectedStatus.value !== 'all') count++
  if (selectedGenres.value.length > 0) count += selectedGenres.value.length
  return count
})

const loadManga = async (reset = false) => {
  if (reset) {
    page.value = 1
    items.value = []
    hasMore.value = true
    isLoading.value = true
  } else {
    isLoadingMore.value = true
  }
  error.value = null

  try {
    if (query.value.trim()) {
      const res = await searchManga(query.value, page.value, 24)
      totalCount.value = res.total
      if (reset) {
        items.value = res.items
      } else {
        const existingIds = new Set(items.value.map(m => m.id))
        items.value.push(...res.items.filter(m => !existingIds.has(m.id)))
      }
      hasMore.value = res.hasMore && res.items.length > 0
    } else {
      const res = await getMangaList({
        page: page.value,
        count: 24,
        ordering: selectedSort.value,
        types: selectedType.value !== 'all' ? selectedType.value : undefined,
        status: selectedStatus.value !== 'all' ? selectedStatus.value : undefined,
        genres: selectedGenres.value.length > 0 ? selectedGenres.value : undefined
      })
      totalCount.value = res.total
      if (reset) {
        items.value = res.items
      } else {
        const existingIds = new Set(items.value.map(m => m.id))
        items.value.push(...res.items.filter(m => !existingIds.has(m.id)))
      }
      hasMore.value = res.hasMore && res.items.length > 0
    }
  } catch (err: any) {
    error.value = err.message || 'Ошибка загрузки каталога'
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

const toggleGenre = (genreId: number) => {
  if (selectedGenres.value.includes(genreId)) {
    selectedGenres.value = selectedGenres.value.filter(id => id !== genreId)
  } else {
    selectedGenres.value.push(genreId)
  }
  loadManga(true)
}

const resetFilters = () => {
  query.value = ''
  selectedType.value = 'all'
  selectedSort.value = '-votes'
  selectedStatus.value = 'all'
  selectedGenres.value = []
  router.replace({ path: '/catalog' })
  loadManga(true)
}

const loadMore = () => {
  if (!isLoadingMore.value && hasMore.value) {
    page.value++
    loadManga(false)
  }
}

watch([selectedType, selectedSort, selectedStatus], () => {
  loadManga(true)
})

watch(() => route.query, (newQ) => {
  let changed = false
  if (newQ.type && newQ.type !== selectedType.value) {
    selectedType.value = String(newQ.type)
    changed = true
  } else if (newQ.origin) {
    const t = newQ.origin === 'manhwa' ? '2' : newQ.origin === 'manhua' ? '3' : '1'
    if (t !== selectedType.value) {
      selectedType.value = t
      changed = true
    }
  }
  if (newQ.q !== undefined && newQ.q !== query.value) {
    query.value = newQ.q as string
    changed = true
  }
  if (changed) {
    loadManga(true)
  }
})

const fetchFilterOptions = async () => {
  try {
    const filters = await getFilters()
    availableGenres.value = filters.genres.slice(0, 24)
  } catch (e) {
    console.error('Failed to load filters', e)
  }
}

watch(() => contentSourceStore.mode, async () => {
  selectedType.value = 'all'
  selectedGenres.value = []
  await fetchFilterOptions()
  loadManga(true)
})

let unregisterBack: (() => void) | null = null

onMounted(async () => {
  unregisterBack = registerBackHandler(() => {
    if (isFilterSheetOpen.value) {
      isFilterSheetOpen.value = false
      return true
    }
    return false
  })

  await fetchFilterOptions()
  loadManga(true)
})

onUnmounted(() => {
  if (unregisterBack) {
    unregisterBack()
  }
})
</script>

<template>
  <div class="w-full px-3.5 sm:px-8 xl:px-12 py-4 sm:py-10 space-y-5 sm:space-y-10">
    <!-- Header Title & Action Buttons -->
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-xl sm:text-4xl font-black text-white tracking-tight">Каталог</h1>
        <p class="text-xs sm:text-base text-zinc-400 mt-0.5 sm:mt-1.5 font-medium">
          {{ totalCount ? totalCount.toLocaleString('ru-RU') : '...' }} тайтлов
        </p>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2">
        <button
          v-if="activeFilterCount > 0 || query"
          type="button"
          class="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs sm:text-sm font-bold text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors shadow-sm"
          @click="resetFilters"
        >
          <RotateCcw class="w-3.5 h-3.5 text-zinc-400" />
          <span class="hidden sm:inline">Сбросить</span>
        </button>

        <!-- Mobile Filter Sheet Trigger -->
        <button
          type="button"
          class="sm:hidden relative px-3.5 py-2 rounded-xl bg-zinc-100 text-zinc-950 text-xs font-bold flex items-center gap-1.5 shadow"
          @click="isFilterSheetOpen = true"
        >
          <SlidersHorizontal class="w-4 h-4" />
          <span>Фильтры</span>
          <span
            v-if="activeFilterCount > 0"
            :class="['min-w-[18px] h-[18px] px-1 text-[10px] font-black rounded-full flex items-center justify-center leading-none ml-0.5', contentSourceStore.isRanobe ? 'bg-blue-400 text-zinc-950' : 'bg-amber-400 text-zinc-950']"
          >
            {{ activeFilterCount }}
          </span>
        </button>
      </div>
    </div>

    <!-- Quick Search & Type Chips (Always visible on mobile & desktop) -->
    <div class="space-y-3">
      <!-- Search Bar -->
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <Search class="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
          <input
            v-model="query"
            type="text"
            placeholder="Поиск по названию..."
            class="w-full pl-10 pr-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-xl bg-zinc-950 border border-zinc-800 focus:border-zinc-600 text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all"
            @keydown.enter="loadManga(true)"
          />
          <button
            v-if="query"
            type="button"
            class="absolute right-3 top-3 text-zinc-500 hover:text-white"
            @click="query = ''; loadManga(true)"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
        <button
          type="button"
          class="px-4 sm:px-7 py-2.5 sm:py-3 bg-zinc-100 hover:bg-white text-zinc-950 text-xs sm:text-sm font-bold rounded-xl transition-colors shadow shrink-0"
          @click="loadManga(true)"
        >
          Найти
        </button>
      </div>

      <!-- Quick Type Chips (Horizontal scroll on mobile) -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
        <button
          v-for="t in types"
          :key="t.id"
          type="button"
          :class="[
            'px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border shrink-0',
            selectedType === t.id
              ? 'bg-zinc-100 text-zinc-950 border-white shadow'
              : 'bg-zinc-900/70 text-zinc-300 hover:bg-zinc-800 border-zinc-800'
          ]"
          @click="selectedType = t.id"
        >
          {{ t.label }}
        </button>
      </div>
    </div>

    <!-- Desktop Filter Card (Hidden on mobile) -->
    <div class="hidden sm:block bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 space-y-6">
      <div class="grid grid-cols-2 md:grid-cols-3 gap-6">
        <!-- Sort Selector -->
        <div>
          <label class="block text-sm text-zinc-300 font-bold mb-2.5">Сортировка</label>
          <select
            v-model="selectedSort"
            class="w-full py-2.5 px-3.5 rounded-xl bg-zinc-950 text-zinc-200 border border-zinc-800 focus:border-zinc-600 focus:outline-none text-sm font-medium"
          >
            <option v-for="sort in sortOptions" :key="sort.id" :value="sort.id">
              {{ sort.label }}
            </option>
          </select>
        </div>

        <!-- Status Selector -->
        <div>
          <label class="block text-sm text-zinc-300 font-bold mb-2.5">Статус перевода</label>
          <div class="flex gap-2">
            <button
              v-for="st in statusOptions"
              :key="st.id"
              type="button"
              :class="[
                'px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors border',
                selectedStatus === st.id
                  ? 'bg-zinc-100 text-zinc-950 border-white font-bold'
                  : 'bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 border-zinc-800'
              ]"
              @click="selectedStatus = st.id"
            >
              {{ st.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- Genres Tags -->
      <div v-if="availableGenres.length > 0" class="pt-4 border-t border-zinc-800/60">
        <label class="block text-sm text-zinc-300 font-bold mb-2.5">Популярные жанры</label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="g in availableGenres"
            :key="g.id"
            type="button"
            :class="[
              'px-3.5 py-1.5 text-xs sm:text-sm rounded-xl font-semibold transition-colors border',
              selectedGenres.includes(g.id)
                ? 'bg-zinc-100 text-zinc-950 border-white font-bold'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border-zinc-800/80 hover:border-zinc-700'
            ]"
            @click="toggleGenre(g.id)"
          >
            {{ g.name }}
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Filter Bottom Sheet Modal -->
    <Teleport to="body">
      <div
        v-if="isFilterSheetOpen"
        class="fixed inset-0 z-50 flex flex-col justify-end sm:hidden select-none"
      >
        <!-- Backdrop -->
        <div
          class="fixed inset-0 bg-black/80 transition-opacity"
          @click="isFilterSheetOpen = false"
        ></div>

        <!-- Sheet Panel -->
        <div class="relative bg-zinc-950 border-t border-zinc-800 rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto pb-safe shadow-2xl space-y-5 animate-in slide-in-from-bottom duration-200">
          <!-- Drag Handle Indicator -->
          <div class="w-10 h-1 bg-zinc-700 rounded-full mx-auto -mt-2 mb-2"></div>

          <!-- Sheet Header -->
          <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div class="flex items-center gap-2">
              <SlidersHorizontal class="w-5 h-5 text-amber-400" />
              <h3 class="text-lg font-black text-white">Фильтры</h3>
            </div>
            <div class="flex items-center gap-2">
              <button
                v-if="activeFilterCount > 0"
                type="button"
                class="text-xs font-bold text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-lg active:bg-zinc-900"
                @click="resetFilters"
              >
                Сбросить
              </button>
              <button
                type="button"
                class="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-900 text-zinc-400 hover:text-white active:bg-zinc-800"
                @click="isFilterSheetOpen = false"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Sort Select -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Сортировка</label>
            <div class="grid grid-cols-1 gap-1.5">
              <button
                v-for="sort in sortOptions"
                :key="sort.id"
                type="button"
                :class="[
                  'w-full min-h-[44px] px-4 py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between transition-colors border active:scale-[0.99]',
                  selectedSort === sort.id
                    ? 'bg-zinc-100 text-zinc-950 border-white'
                    : 'bg-zinc-900 text-zinc-300 border-zinc-800'
                ]"
                @click="selectedSort = sort.id"
              >
                <span>{{ sort.label }}</span>
                <Check v-if="selectedSort === sort.id" class="w-4 h-4 text-zinc-950" />
              </button>
            </div>
          </div>

          <!-- Status -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Статус</label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="st in statusOptions"
                :key="st.id"
                type="button"
                :class="[
                  'min-h-[42px] py-2.5 px-2 rounded-xl text-xs font-bold text-center transition-colors border active:scale-[0.98]',
                  selectedStatus === st.id
                    ? 'bg-zinc-100 text-zinc-950 border-white'
                    : 'bg-zinc-900 text-zinc-300 border-zinc-800'
                ]"
                @click="selectedStatus = st.id"
              >
                {{ st.label }}
              </button>
            </div>
          </div>

          <!-- Genres -->
          <div v-if="availableGenres.length > 0">
            <label class="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Жанры</label>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="g in availableGenres"
                :key="g.id"
                type="button"
                :class="[
                  'min-h-[38px] px-3.5 py-2 text-xs rounded-xl font-semibold flex items-center justify-center transition-colors border active:scale-95',
                  selectedGenres.includes(g.id)
                    ? 'bg-zinc-100 text-zinc-950 border-white font-bold'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                ]"
                @click="toggleGenre(g.id)"
              >
                {{ g.name }}
              </button>
            </div>
          </div>

          <!-- Apply Button (Sticky bottom in sheet) -->
          <div class="pt-3 sticky bottom-0 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent pb-1 -mx-5 px-5">
            <button
              type="button"
              :class="['w-full min-h-[48px] py-3.5 rounded-2xl font-black text-sm active:scale-[0.98] transition-all', contentSourceStore.accentButton]"
              @click="isFilterSheetOpen = false"
            >
              Применить ({{ totalCount.toLocaleString('ru-RU') }} {{ contentSourceStore.isRanobe ? 'ранобэ' : 'тайтлов' }})
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Manga Grid (2 cols on mobile, 8 on wide desktop) -->
    <div>
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

      <div v-else-if="items.length > 0" class="space-y-8 sm:space-y-12">
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 min-[1120px]:grid-cols-8 xl:grid-cols-8 gap-2.5 sm:gap-4">
          <MangaCard
            v-for="manga in items"
            :key="manga.id"
            :manga="manga"
          />
        </div>

        <div v-if="hasMore" class="flex justify-center pt-4 sm:pt-8">
          <button
            type="button"
            :disabled="isLoadingMore"
            class="px-8 sm:px-10 py-3 sm:py-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-100 hover:text-white text-xs sm:text-base font-bold border border-zinc-800 transition-all flex items-center gap-2.5 shadow-xl disabled:opacity-50 active:scale-[0.98]"
            @click="loadMore"
          >
            <SpinnerArrow v-if="isLoadingMore" class="w-4 h-4 sm:w-5 sm:h-5 text-zinc-300" />
            <span>{{ isLoadingMore ? 'Загрузка...' : 'Загрузить ещё' }}</span>
          </button>
        </div>
      </div>

      <div v-else class="text-center py-16 sm:py-24 text-zinc-500 space-y-3 bg-zinc-900/20 rounded-2xl border border-zinc-800/60 p-6">
        <BookOpen class="w-12 h-12 sm:w-14 sm:h-14 mx-auto opacity-40 text-zinc-400" />
        <p class="font-bold text-base sm:text-lg text-zinc-200">Ничего не найдено</p>
        <p class="text-xs sm:text-sm text-zinc-400 font-medium">Попробуйте изменить поисковый запрос или сбросить фильтры</p>
      </div>
    </div>
  </div>
</template>
