<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import type { MangaTitle } from '~/composables/useReManga'
import MangaCard from '~/components/MangaCard.vue'

const props = withDefaults(defineProps<{
  items?: MangaTitle[]
  isLoading?: boolean
  skeletonCount?: number
}>(), {
  items: () => [],
  isLoading: false,
  skeletonCount: 8
})

const scrollContainer = ref<HTMLElement | null>(null)
const canScrollPrev = ref(false)
const canScrollNext = ref(false)

const updateScrollState = () => {
  const el = scrollContainer.value
  if (!el) return
  const maxScroll = el.scrollWidth - el.clientWidth
  canScrollPrev.value = el.scrollLeft > 10
  canScrollNext.value = el.scrollLeft < maxScroll - 10
}

const scrollPrev = () => {
  const el = scrollContainer.value
  if (!el) return
  const scrollAmount = Math.max(el.clientWidth * 0.75, 280)
  el.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
}

const scrollNext = () => {
  const el = scrollContainer.value
  if (!el) return
  const scrollAmount = Math.max(el.clientWidth * 0.75, 280)
  el.scrollBy({ left: scrollAmount, behavior: 'smooth' })
}

// Mouse dragging on desktop
let isMouseDown = false
let startX = 0
let scrollLeftStart = 0
let hasMoved = false

const onMouseDown = (e: MouseEvent) => {
  if (e.button !== 0) return // Only primary click
  const el = scrollContainer.value
  if (!el) return
  isMouseDown = true
  hasMoved = false
  startX = e.pageX - el.offsetLeft
  scrollLeftStart = el.scrollLeft
}

const onMouseMove = (e: MouseEvent) => {
  if (!isMouseDown) return
  const el = scrollContainer.value
  if (!el) return
  const x = e.pageX - el.offsetLeft
  const distance = x - startX
  if (Math.abs(distance) > 4) {
    hasMoved = true
  }
  el.scrollLeft = scrollLeftStart - distance
}

const onMouseUp = () => {
  isMouseDown = false
  setTimeout(() => {
    hasMoved = false
  }, 50)
}

const onMouseLeave = () => {
  isMouseDown = false
  hasMoved = false
}

const onClickCapture = (e: MouseEvent) => {
  // If user was dragging on desktop, prevent card navigation click
  if (hasMoved) {
    e.preventDefault()
    e.stopPropagation()
  }
}

watch(() => props.items, () => {
  nextTick(() => {
    updateScrollState()
  })
}, { deep: true })

watch(() => props.isLoading, () => {
  nextTick(() => {
    updateScrollState()
  })
})

onMounted(() => {
  updateScrollState()
  window.addEventListener('resize', updateScrollState, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('resize', updateScrollState)
})
</script>

<template>
  <div class="relative group/slider -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
    <!-- Desktop Navigation: Prev Button -->
    <button
      v-if="!isLoading && canScrollPrev"
      type="button"
      class="hidden sm:flex absolute -left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-zinc-900/95 text-zinc-200 border border-zinc-700/80 items-center justify-center shadow-2xl hover:bg-zinc-800 hover:text-white transition-all active:scale-90 opacity-0 group-hover/slider:opacity-100 cursor-pointer"
      aria-label="Назад"
      @click="scrollPrev"
    >
      <ChevronLeft class="w-5 h-5" />
    </button>

    <!-- Desktop Navigation: Next Button -->
    <button
      v-if="!isLoading && canScrollNext"
      type="button"
      class="hidden sm:flex absolute -right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-zinc-900/95 text-zinc-200 border border-zinc-700/80 items-center justify-center shadow-2xl hover:bg-zinc-800 hover:text-white transition-all active:scale-90 opacity-0 group-hover/slider:opacity-100 cursor-pointer"
      aria-label="Вперед"
      @click="scrollNext"
    >
      <ChevronRight class="w-5 h-5" />
    </button>

    <!-- Native Hardware Accelerated Scroll Track -->
    <div
      ref="scrollContainer"
      class="flex overflow-x-auto overflow-y-hidden gap-2.5 sm:gap-4 pb-2 sm:pb-1 scrollbar-none py-1 will-change-scroll cursor-grab active:cursor-grabbing"
      style="-webkit-overflow-scrolling: touch; overscroll-behavior-x: contain; touch-action: pan-y pinch-zoom;"
      @scroll.passive="updateScrollState"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseLeave"
      @click.capture="onClickCapture"
    >
      <!-- Loading Skeletons -->
      <template v-if="isLoading">
        <div
          v-for="i in skeletonCount"
          :key="i"
          class="w-[140px] sm:w-[155px] md:w-[165px] lg:w-[175px] xl:w-[185px] shrink-0"
        >
          <div class="aspect-[2/3] rounded-lg bg-zinc-900/40 border border-zinc-800/60 animate-pulse"></div>
        </div>
      </template>

      <!-- Content Items -->
      <template v-else-if="items.length > 0">
        <div
          v-for="item in items"
          :key="item.id"
          class="w-[140px] sm:w-[155px] md:w-[165px] lg:w-[175px] xl:w-[185px] shrink-0"
        >
          <MangaCard :manga="item" />
        </div>
      </template>
    </div>
  </div>
</template>
