<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Bookmark, Star } from 'lucide-vue-next'
import type { MangaTitle } from '~/composables/useReManga'
import { useBookmarksStore, BOOKMARK_LABELS } from '~/stores/bookmarks'
import AsyncImage from '~/components/AsyncImage.vue'

const props = defineProps<{
  manga: MangaTitle
}>()

const bookmarksStore = useBookmarksStore()
const bookmark = computed(() => bookmarksStore.getBookmark(props.manga.id))

const originLabel = computed(() => {
  if (props.manga.type) return props.manga.type
  if (props.manga.originalLanguage === 'ja') return 'Манга'
  if (props.manga.originalLanguage === 'ko') return 'Манхва'
  if (props.manga.originalLanguage === 'zh') return 'Маньхуа'
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

// 3D Steam-like interactive card tilt (desktop mouse only)
const isHovered = ref(false)
const rotateX = ref(0)
const rotateY = ref(0)
const glareX = ref(50)
const glareY = ref(50)
const glareOpacity = ref(0)
const canHover = ref(false)

const MAX_TILT = 8.5 // Subtle, gentle tilt angle in degrees
let rafId: number | null = null

onMounted(() => {
  if (typeof window !== 'undefined') {
    canHover.value = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  }
})

const getCardElement = (e: MouseEvent): HTMLElement | null => {
  if (e.currentTarget && typeof (e.currentTarget as HTMLElement).getBoundingClientRect === 'function') {
    return e.currentTarget as HTMLElement
  }
  if (e.target && typeof (e.target as HTMLElement).closest === 'function') {
    return (e.target as HTMLElement).closest('a')
  }
  return null
}

const updateTilt = (clientX: number, clientY: number, el: HTMLElement) => {
  if (!canHover.value) return
  const rect = el.getBoundingClientRect()
  if (!rect.width || !rect.height) return

  const normX = (clientX - rect.left) / rect.width - 0.5
  const normY = (clientY - rect.top) / rect.height - 0.5

  rotateX.value = Number((normY * MAX_TILT * 2).toFixed(2))
  rotateY.value = Number((-normX * MAX_TILT * 2).toFixed(2))

  glareX.value = Math.round((normX + 0.5) * 100)
  glareY.value = Math.round((normY + 0.5) * 100)
  glareOpacity.value = 0.24
  isHovered.value = true
}

const handleMouseMove = (e: MouseEvent) => {
  if (!canHover.value) return
  const el = getCardElement(e)
  if (!el) return

  if (rafId) cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(() => {
    updateTilt(e.clientX, e.clientY, el)
  })
}

const handleMouseEnter = (e: MouseEvent) => {
  if (!canHover.value) return
  const el = getCardElement(e)
  if (!el) return
  isHovered.value = true
  updateTilt(e.clientX, e.clientY, el)
}

const handleMouseLeave = () => {
  if (!canHover.value) return
  if (rafId) cancelAnimationFrame(rafId)
  isHovered.value = false
  rotateX.value = 0
  rotateY.value = 0
  glareOpacity.value = 0
}

const cardTransformStyle = computed(() => {
  if (!canHover.value) return {}
  if (!isHovered.value) {
    return {
      transform: 'perspective(950px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      transition: 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.5s cubic-bezier(0.23, 1, 0.32, 1)'
    }
  }

  const shadowX = (-rotateY.value * 1.2).toFixed(1)
  const shadowY = (rotateX.value * 1.2 + 14).toFixed(1)

  return {
    transform: `perspective(950px) rotateX(${rotateX.value}deg) rotateY(${rotateY.value}deg) scale3d(1.03, 1.03, 1.03)`,
    boxShadow: `${shadowX}px ${shadowY}px 28px rgba(0, 0, 0, 0.7)`,
    transition: 'transform 0.08s ease-out, box-shadow 0.08s ease-out'
  }
})

const glareStyle = computed(() => {
  if (!canHover.value) return {}
  return {
    background: `radial-gradient(circle 260px at ${glareX.value}% ${glareY.value}%, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.05) 35%, transparent 65%)`,
    opacity: glareOpacity.value,
    transition: isHovered.value ? 'opacity 0.15s ease-out' : 'opacity 0.4s ease-out'
  }
})

const displayGenres = computed(() => {
  const g = props.manga.genres || []
  const c = props.manga.categories || []
  const tags = (props.manga as any).tags || []
  const combined = [...g, ...c, ...tags]
  return Array.from(new Set(combined.filter(Boolean)))
})
</script>

<template>
  <NuxtLink
    :to="`/manga/${manga.id}`"
    :style="cardTransformStyle"
    :class="[
      'group relative block aspect-[2/3] w-full rounded-2xl overflow-hidden border transition-all duration-300 bg-zinc-950 will-change-transform transform-gpu select-none active:scale-[0.98]',
      isHovered ? 'z-20 border-zinc-500/80 shadow-2xl' : 'z-0 border-zinc-800/80 shadow-lg shadow-black/60'
    ]"
    @mousemove="handleMouseMove"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- Full Bleed Poster Image -->
    <AsyncImage
      :src="manga.coverUrl || manga.coverUrlSmall"
      :alt="manga.title"
      aspect-class="absolute inset-0 w-full h-full"
      img-class="w-full h-full object-cover object-center"
    />

    <!-- Ultra-smooth OKLCH Gradient for High Text Legibility -->
    <div class="absolute inset-0 pointer-events-none bg-gradient-card-oklch opacity-95 group-hover:opacity-90 transition-opacity duration-300"></div>

    <!-- Steam-like Dynamic Specular Glare Sheen Reflection (Hover only) -->
    <div
      v-if="canHover"
      class="absolute inset-0 pointer-events-none z-20 rounded-2xl"
      :style="glareStyle"
    ></div>

    <!-- Top Badges (Frosted Glass) -->
    <div class="absolute top-2 sm:top-2.5 left-2 sm:left-2.5 right-2 sm:right-2.5 flex items-center justify-between gap-1 pointer-events-none z-10">
      <span
        v-if="originLabel"
        class="glass-badge inline-flex items-center px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-md sm:rounded-lg text-zinc-100 shadow-sm"
      >
        {{ originLabel }}
      </span>

      <div class="flex items-center gap-1 sm:gap-1.5 ml-auto">
        <!-- Rating badge -->
        <span
          v-if="manga.avgRating && parseFloat(manga.avgRating) > 0"
          class="glass-badge inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-md sm:rounded-lg text-amber-400 shadow-sm"
        >
          <Star class="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-amber-400 text-amber-400" />
          <span>{{ manga.avgRating }}</span>
        </span>

        <!-- Bookmark pill -->
        <span
          v-if="bookmark"
          class="glass-badge inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-md sm:rounded-lg text-zinc-200 shadow-sm"
        >
          <Bookmark class="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-zinc-200 text-zinc-200" />
          <span class="hidden sm:inline">{{ BOOKMARK_LABELS[bookmark.status] }}</span>
        </span>
      </div>
    </div>

    <!-- Bottom Content Over Picture with proper inner padding -->
    <div class="absolute bottom-0 inset-x-0 p-2 sm:p-3.5 z-10 space-y-1 sm:space-y-1.5 pointer-events-none">
      <!-- Chapter and Status Pills (Frosted Glass) -->
      <div class="flex items-center gap-1 sm:gap-1.5 flex-wrap">
        <span
          v-if="manga.countChapters"
          class="glass-badge inline-flex items-center px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-md sm:rounded-lg text-white shadow-sm"
        >
          Гл. {{ manga.countChapters }}
        </span>
        <span
          v-if="statusLabel"
          class="glass-badge inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-md sm:rounded-lg text-zinc-200 shadow-sm"
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

      <!-- Title -->
      <h3
        class="font-black text-xs sm:text-base leading-snug text-white group-hover:text-zinc-200 transition-colors line-clamp-2 drop-shadow-md"
        :title="manga.title"
      >
        {{ manga.title }}
      </h3>

      <!-- Alt Title (desktop only) -->
      <p
        v-if="manga.altTitle"
        class="hidden sm:block text-xs text-zinc-300 line-clamp-1 font-medium drop-shadow-sm"
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
