<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Bookmark, Star } from 'lucide-vue-next'
import type { MangaTitle } from '~/composables/useReManga'
import { useBookmarksStore, BOOKMARK_LABELS } from '~/stores/bookmarks'
import { useContentSourceStore } from '~/stores/contentSource'
import AsyncImage from '~/components/AsyncImage.vue'

const props = defineProps<{
  manga: MangaTitle
}>()

const bookmarksStore = useBookmarksStore()
const contentSourceStore = useContentSourceStore()
const bookmark = computed(() => bookmarksStore.getBookmark(props.manga.id))

const originLabel = computed(() => {
  if (props.manga.type) return props.manga.type
  if (props.manga.originalLanguage === 'ja') return 'Манга'
  if (props.manga.originalLanguage === 'ko') return 'Манхва'
  if (props.manga.originalLanguage === 'zh') return 'Маньхуа'
  if (contentSourceStore.isRanobe || props.manga.contentType === 'novel') return 'Ранобэ'
  return null
})

const statusLabel = computed(() => {
  if (props.manga.status) {
    if (props.manga.status === 'ongoing' || props.manga.status === 'Продолжается') return 'Онгоинг'
    if (props.manga.status === 'completed' || props.manga.status === 'Закончен') return 'Завершён'
    return props.manga.status
  }
  return null
})

const displayGenres = computed(() => {
  const g = props.manga.genres || []
  const c = props.manga.categories || []
  const tags = (props.manga as any).tags || []
  const combined = [...g, ...c, ...tags]
  return Array.from(new Set(combined.filter(Boolean)))
})

const isOnePieceEasterEgg = computed(() => {
  const title = (props.manga.title || '').toLowerCase()
  const altTitle = (props.manga.altTitle || '').toLowerCase()
  const dir = (props.manga.dir || props.manga.id || '').toLowerCase()
  const text = `${title} ${altTitle} ${dir}`
  return (
    text.includes('ван пис') ||
    text.includes('ван-пис') ||
    text.includes('ванпис') ||
    text.includes('one piece') ||
    text.includes('one-piece') ||
    text.includes('one_piece')
  )
})
</script>

<template>
  <NuxtLink
    :to="`/manga/${manga.id}?type=${contentSourceStore.isRanobe || manga.contentType === 'novel' ? 'novel' : 'manga'}${contentSourceStore.isRanobe || manga.contentType === 'novel' ? `&title=${encodeURIComponent(manga.title || manga.altTitle || '')}` : ''}`"
    class="group relative block aspect-[2/3] w-full rounded-2xl overflow-hidden border border-zinc-800/80 hover:border-zinc-600/80 transition-all duration-300 bg-zinc-950 select-none active:scale-[0.98] shadow-md hover:shadow-xl shadow-black/40"
  >
    <!-- Full Bleed Poster Image -->
    <AsyncImage
      :src="manga.coverUrl || manga.coverUrlSmall"
      :alt="manga.title"
      aspect-class="absolute inset-0 w-full h-full"
      img-class="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
    />

    <!-- Ultra-smooth OKLCH Gradient for High Text Legibility -->
    <div class="absolute inset-0 pointer-events-none bg-gradient-card-oklch opacity-95 group-hover:opacity-90 transition-opacity duration-300"></div>

    <!-- Top Badges (Frosted Glass) -->
    <div class="absolute top-1.5 sm:top-2.5 left-1.5 sm:left-2.5 right-1.5 sm:right-2.5 flex items-center justify-between gap-1 pointer-events-none z-10">
      <span
        v-if="originLabel"
        :class="[
          'glass-badge inline-flex items-center px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-xs font-semibold rounded sm:rounded-lg text-zinc-100 shadow-sm shrink-0 whitespace-nowrap',
          isOnePieceEasterEgg && manga.avgRating && parseFloat(manga.avgRating) > 0 ? 'hidden min-[400px]:inline-flex' : ''
        ]"
      >
        {{ originLabel }}
      </span>

      <div class="flex items-center gap-1 sm:gap-1.5 ml-auto shrink-0">
        <!-- Rating badge -->
        <span
          v-if="manga.avgRating && parseFloat(manga.avgRating) > 0"
          :class="['glass-badge inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-xs font-bold rounded sm:rounded-lg shadow-sm shrink-0 whitespace-nowrap', contentSourceStore.isRanobe ? 'text-blue-400' : 'text-amber-400']"
        >
          <Star :class="['w-2.5 h-2.5 sm:w-3.5 sm:h-3.5', contentSourceStore.isRanobe ? 'fill-blue-400 text-blue-400' : 'fill-amber-400 text-amber-400']" />
          <span>{{ manga.avgRating }}</span>
        </span>

        <!-- Bookmark pill -->
        <span
          v-if="bookmark"
          class="glass-badge inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-xs font-bold rounded sm:rounded-lg text-zinc-200 shadow-sm shrink-0 whitespace-nowrap"
        >
          <Bookmark class="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 fill-zinc-200 text-zinc-200" />
          <span class="hidden sm:inline">{{ BOOKMARK_LABELS[bookmark.status] }}</span>
        </span>

        <!-- One Piece Easter Egg (Nikroder) -->
        <img
          v-if="isOnePieceEasterEgg"
          src="/nikroder.png"
          alt="Nikroder"
          class="w-5.5 h-5.5 sm:w-7 sm:h-7 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] filter group-hover:scale-125 group-hover:rotate-6 transition-transform duration-300 pointer-events-none select-none shrink-0"
        />
      </div>
    </div>

    <!-- Bottom Content Over Picture with proper inner padding -->
    <div class="absolute bottom-0 inset-x-0 p-1.5 sm:p-3 z-10 space-y-0.5 sm:space-y-1 pointer-events-none">
      <!-- Chapter and Status Pills (Frosted Glass) -->
      <div class="flex items-center gap-1 sm:gap-1.5 flex-wrap">
        <span
          v-if="manga.countChapters"
          class="glass-badge inline-flex items-center px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-xs font-bold rounded sm:rounded-lg text-white shadow-sm"
        >
          Гл. {{ manga.countChapters }}
        </span>
        <span
          v-if="statusLabel"
          class="glass-badge inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-xs font-semibold rounded sm:rounded-lg text-zinc-200 shadow-sm"
        >
          <span
            :class="[
              'w-1.5 h-1.5 rounded-full shrink-0',
              statusLabel === 'Онгоинг'
                ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                : 'bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.8)]'
            ]"
          ></span>
          <span>{{ statusLabel }}</span>
        </span>
      </div>

      <!-- Title (12px on mobile) -->
      <h3
        class="font-bold text-[12px] leading-tight text-white group-hover:text-zinc-200 transition-colors line-clamp-2 drop-shadow-md"
        :title="manga.title"
      >
        {{ manga.title }}
      </h3>

      <!-- Alt Title (desktop only) -->
      <p
        v-if="manga.altTitle"
        class="hidden sm:block text-[11px] text-zinc-300 line-clamp-1 font-medium drop-shadow-sm"
        :title="manga.altTitle"
      >
        {{ manga.altTitle }}
      </p>

      <!-- Genre Tags (desktop only) -->
      <div v-if="displayGenres.length" class="hidden sm:flex flex-wrap gap-1.5 pt-0.5">
        <span
          v-for="tag in displayGenres.slice(0, 2)"
          :key="tag"
          class="glass-badge inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-lg text-zinc-300 group-hover:text-zinc-100 transition-colors shadow-xs"
        >
          {{ tag }}
        </span>
      </div>
    </div>
  </NuxtLink>
</template>
