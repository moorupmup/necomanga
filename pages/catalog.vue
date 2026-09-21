<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Filter,
  Search,
  RotateCcw,
  BookOpen
} from 'lucide-vue-next'
import { useReManga, type MangaTitle, type ReMangaGenre } from '~/composables/useReManga'
import MangaCard from '~/components/MangaCard.vue'
import SpinnerArrow from '~/components/SpinnerArrow.vue'

const route = useRoute()
const router = useRouter()
const { getMangaList, searchManga, getFilters } = useReManga()

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
const isFilterOpen = ref(false)

const types = [
  { id: 'all', label: 'Все типы' },
  { id: '2', label: 'Корейская манхва' },
  { id: '3', label: 'Китайская маньхуа' },
  { id: '1', label: 'Японская манга' },
  { id: '5', label: 'Рукомикс' }
]

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

onMounted(async () => {
  try {
    const filters = await getFilters()
    availableGenres.value = filters.genres.slice(0, 20)
  } catch (e) {
    console.error('Failed to load filters', e)
  }
  loadManga(true)
})
</script>

<template>
  <div class="w-full px-4 sm:px-8 xl:px-12 py-10 space-y-10">
    <!-- Header Title -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl sm:text-4xl font-black text-white tracking-tight">Каталог манги</h1>
        <p class="text-sm sm:text-base text-zinc-400 mt-1.5 font-medium">
          Найдено {{ totalCount ? totalCount.toLocaleString('ru-RU') : '...' }} тайтлов
        </p>
      </div>

      <!-- Reset & Mobile Filter Toggle -->
      <div class="flex items-center gap-2.5">
        <button
          type="button"
          class="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-bold text-zinc-300 hover:text-white hover:border-zinc-700 flex items-center gap-2 transition-colors shadow-sm"
          @click="resetFilters"
        >
          <RotateCcw class="w-4 h-4 text-zinc-400" />
          <span>Сбросить</span>
        </button>
        <button
          type="button"
          class="sm:hidden px-4 py-2.5 rounded-xl bg-zinc-100 text-zinc-950 text-sm font-bold flex items-center gap-2"
          @click="isFilterOpen = !isFilterOpen"
        >
          <Filter class="w-4 h-4" />
          <span>Фильтры</span>
        </button>
      </div>
    </div>

    <!-- Filter Bar Card in Deep Dark Zinc -->
    <div :class="['bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 space-y-6', !isFilterOpen ? 'hidden sm:block' : 'block']">
      <!-- Search Input within Catalog -->
      <div class="flex items-center gap-3">
        <div class="relative flex-1">
          <Search class="absolute left-4 top-3.5 w-5 h-5 text-zinc-500" />
          <input
            v-model="query"
            type="text"
            placeholder="Поиск по названию..."
            class="w-full pl-12 pr-4 py-3 text-base rounded-xl bg-zinc-950 border border-zinc-800 focus:border-zinc-600 text-zinc-100 placeholder-zinc-500 focus:outline-none"
            @keydown.enter="loadManga(true)"
          />
        </div>
        <button
          type="button"
          class="px-7 py-3 bg-zinc-100 hover:bg-white text-zinc-950 text-sm font-bold rounded-xl transition-colors shadow"
          @click="loadManga(true)"
        >
          Найти
        </button>
      </div>

      <!-- Controls Row -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-zinc-800/60">
        <!-- Type Selector -->
        <div>
          <label class="block text-sm text-zinc-300 font-bold mb-2.5">Тип издания</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="t in types"
              :key="t.id"
              type="button"
              :class="[
                'px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors border',
                selectedType === t.id
                  ? 'bg-zinc-100 text-zinc-950 border-white font-bold'
                  : 'bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 border-zinc-800'
              ]"
              @click="selectedType = t.id"
            >
              {{ t.label }}
            </button>
          </div>
        </div>

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

    <!-- Large Manga Grid (8 per row) -->
    <div>
      <div v-if="isLoading" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 min-[1120px]:grid-cols-8 xl:grid-cols-8 gap-3.5 sm:gap-4">
        <div
          v-for="i in 16"
          :key="i"
          class="relative aspect-[2/3] rounded-2xl overflow-hidden border border-zinc-800/60 bg-zinc-900/40 flex flex-col justify-end p-5"
        >
          <div class="space-y-2.5 relative z-10">
            <div class="h-4 bg-zinc-800/80 rounded w-1/3"></div>
            <div class="h-5 bg-zinc-800 rounded w-4/5"></div>
            <div class="h-3.5 bg-zinc-800/50 rounded w-1/2"></div>
          </div>
        </div>
      </div>

      <div v-else-if="items.length > 0" class="space-y-12">
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 min-[1120px]:grid-cols-8 xl:grid-cols-8 gap-3.5 sm:gap-4">
          <MangaCard
            v-for="manga in items"
            :key="manga.id"
            :manga="manga"
          />
        </div>

        <div v-if="hasMore" class="flex justify-center pt-8">
          <button
            type="button"
            :disabled="isLoadingMore"
            class="px-10 py-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-100 hover:text-white text-sm sm:text-base font-bold border border-zinc-800 hover:border-zinc-700 transition-all flex items-center gap-3 shadow-xl disabled:opacity-50"
            @click="loadMore"
          >
            <SpinnerArrow v-if="isLoadingMore" class="w-5 h-5 text-zinc-300" />
            <span>{{ isLoadingMore ? 'Загрузка...' : 'Загрузить ещё' }}</span>
          </button>
        </div>
      </div>

      <div v-else class="text-center py-24 text-zinc-500 space-y-3 bg-zinc-900/20 rounded-2xl border border-zinc-800/60">
        <BookOpen class="w-14 h-14 mx-auto opacity-40 text-zinc-400" />
        <p class="font-bold text-lg text-zinc-200">Ничего не найдено</p>
        <p class="text-sm text-zinc-400 font-medium">Попробуйте изменить поисковый запрос или сбросить фильтры</p>
      </div>
    </div>
  </div>
</template>
