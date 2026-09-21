<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search, X, Loader2 } from 'lucide-vue-next'
import { useReManga, type MangaTitle } from '~/composables/useReManga'

const router = useRouter()
const { searchManga } = useReManga()

const query = ref('')
const results = ref<MangaTitle[]>([])
const isLoading = ref(false)
const isOpen = ref(false)
const containerRef = ref<HTMLElement | null>(null)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const performSearch = async () => {
  if (!query.value.trim() || query.value.trim().length < 2) {
    results.value = []
    isLoading.value = false
    isOpen.value = false
    return
  }

  isLoading.value = true
  isOpen.value = true

  try {
    const res = await searchManga(query.value, 1, 8)
    results.value = res.items
  } catch (e) {
    console.error('Search error', e)
  } finally {
    isLoading.value = false
  }
}

watch(query, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  if (!val.trim()) {
    results.value = []
    isOpen.value = false
    return
  }
  debounceTimer = setTimeout(() => {
    performSearch()
  }, 300)
})

const emit = defineEmits<{
  (e: 'selected'): void
}>()

const submitSearch = () => {
  if (query.value.trim()) {
    isOpen.value = false
    emit('selected')
    router.push({ path: '/catalog', query: { q: query.value.trim() } })
  }
}

const clearSearch = () => {
  query.value = ''
  results.value = []
  isOpen.value = false
}

const onSelectManga = (id: string) => {
  isOpen.value = false
  query.value = ''
  emit('selected')
  router.push(`/manga/${id}`)
}

if (typeof window !== 'undefined') {
  window.addEventListener('click', (e) => {
    if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
      isOpen.value = false
    }
  })
}
</script>

<template>
  <div ref="containerRef" class="relative w-full">
    <!-- Input Field -->
    <div class="relative flex items-center">
      <Search class="absolute left-4 w-5 h-5 text-zinc-400 pointer-events-none" />
      <input
        v-model="query"
        type="text"
        placeholder="Поиск манги, манхвы, авторов..."
        class="w-full pl-12 pr-11 py-3 text-base rounded-2xl bg-zinc-900/80 hover:bg-zinc-900 focus:bg-zinc-950 text-zinc-100 placeholder-zinc-500 border border-zinc-800 focus:border-zinc-600 focus:outline-none transition-all shadow-inner"
        @focus="isOpen = query.length >= 2"
        @keydown.enter="submitSearch"
        @keydown.esc="isOpen = false"
      />
      <button
        v-if="query"
        type="button"
        class="absolute right-2.5 w-9 h-9 flex items-center justify-center rounded-xl text-zinc-400 hover:text-white active:bg-zinc-800 transition-colors"
        @click="clearSearch"
      >
        <X class="w-4 h-4" />
      </button>
      <Loader2
        v-if="isLoading"
        class="absolute right-12 w-4 h-4 text-zinc-400 animate-spin"
      />
    </div>

    <!-- Dropdown Results -->
    <div
      v-if="isOpen && (results.length > 0 || (!isLoading && query.length >= 2))"
      class="absolute left-0 right-0 top-full mt-2 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[480px] overflow-y-auto"
    >
      <div v-if="results.length > 0" class="divide-y divide-zinc-900 p-2">
        <div
          v-for="manga in results"
          :key="manga.id"
          class="flex items-center gap-4 p-2.5 rounded-xl hover:bg-zinc-900 active:bg-zinc-900 active:scale-[0.99] cursor-pointer transition-all"
          @click="onSelectManga(manga.id)"
        >
          <img
            :src="manga.coverUrlSmall || manga.coverUrl"
            :alt="manga.title"
            class="w-12 h-18 object-cover rounded-xl bg-zinc-900 flex-shrink-0 border border-zinc-800/80"
          />
          <div class="min-w-0 flex-1">
            <h4 class="text-base font-bold text-zinc-100 truncate hover:text-white leading-snug">
              {{ manga.title }}
            </h4>
            <p v-if="manga.altTitle" class="text-xs sm:text-sm text-zinc-400 truncate mt-0.5 font-medium">
              {{ manga.altTitle }}
            </p>
            <div class="flex items-center gap-2.5 mt-1.5 text-xs text-zinc-400">
              <span v-if="manga.lastChapter" class="text-zinc-100 font-bold bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800">
                Гл. {{ manga.lastChapter }}
              </span>
              <span v-if="manga.year" class="font-medium">{{ manga.year }}</span>
            </div>
          </div>
        </div>

        <!-- Full Results Link -->
        <div
          class="p-3.5 text-center bg-zinc-900/50 hover:bg-zinc-900 text-sm font-bold text-zinc-200 cursor-pointer rounded-xl mt-1.5 border-t border-zinc-800/50 transition-colors"
          @click="submitSearch"
        >
          Смотреть все результаты для «{{ query }}» →
        </div>
      </div>

      <div v-else-if="!isLoading" class="p-6 text-center text-sm text-zinc-400 font-medium">
        По запросу «{{ query }}» ничего не найдено
      </div>
    </div>
  </div>
</template>
