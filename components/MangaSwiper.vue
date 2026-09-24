<script setup lang="ts">
import { ref } from 'vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { FreeMode } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/free-mode'
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

const swiperModules = [FreeMode]
const swiperInstance = ref<any>(null)
const isBeginning = ref(true)
const isEnd = ref(false)

const onSwiper = (swiper: any) => {
  swiperInstance.value = swiper
  isBeginning.value = swiper.isBeginning
  isEnd.value = swiper.isEnd
}

const onSlideChange = (swiper: any) => {
  isBeginning.value = swiper.isBeginning
  isEnd.value = swiper.isEnd
}

const slidePrev = () => {
  swiperInstance.value?.slidePrev()
}

const slideNext = () => {
  swiperInstance.value?.slideNext()
}
</script>

<template>
  <div class="relative group/swiper -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
    <!-- Desktop Navigation Buttons (Hidden on mobile touch screens) -->
    <button
      v-if="!isLoading && items.length > 3"
      type="button"
      :class="[
        'hidden sm:flex absolute -left-3.5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-zinc-900/95 text-zinc-200 border border-zinc-700/80 items-center justify-center shadow-xl hover:bg-zinc-800 hover:text-white transition-all active:scale-90 opacity-0 group-hover/swiper:opacity-100 disabled:opacity-0 disabled:pointer-events-none cursor-pointer',
        isBeginning ? 'pointer-events-none opacity-0' : ''
      ]"
      :disabled="isBeginning"
      aria-label="Назад"
      @click="slidePrev"
    >
      <ChevronLeft class="w-5 h-5" />
    </button>

    <button
      v-if="!isLoading && items.length > 3"
      type="button"
      :class="[
        'hidden sm:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-zinc-900/95 text-zinc-200 border border-zinc-700/80 items-center justify-center shadow-xl hover:bg-zinc-800 hover:text-white transition-all active:scale-90 opacity-0 group-hover/swiper:opacity-100 disabled:opacity-0 disabled:pointer-events-none cursor-pointer',
        isEnd ? 'pointer-events-none opacity-0' : ''
      ]"
      :disabled="isEnd"
      aria-label="Вперед"
      @click="slideNext"
    >
      <ChevronRight class="w-5 h-5" />
    </button>

    <!-- Skeletons Swiper -->
    <Swiper
      v-if="isLoading"
      :modules="swiperModules"
      :free-mode="{ enabled: true, momentum: true, momentumRatio: 0.85 }"
      :grab-cursor="true"
      slides-per-view="auto"
      :space-between="10"
      :breakpoints="{
        640: { slidesPerView: 3.5, spaceBetween: 14 },
        768: { slidesPerView: 4.5, spaceBetween: 16 },
        1024: { slidesPerView: 6, spaceBetween: 16 },
        1280: { slidesPerView: 7.2, spaceBetween: 16 },
        1536: { slidesPerView: 8, spaceBetween: 16 }
      }"
      class="!overflow-visible sm:!overflow-hidden py-1"
    >
      <SwiperSlide
        v-for="i in skeletonCount"
        :key="i"
        class="!w-[140px] sm:!w-auto flex-shrink-0"
      >
        <div class="aspect-[2/3] rounded-lg bg-zinc-900/40 border border-zinc-800/60 animate-pulse"></div>
      </SwiperSlide>
    </Swiper>

    <!-- Content Items Swiper -->
    <Swiper
      v-else-if="items.length > 0"
      :modules="swiperModules"
      :free-mode="{ enabled: true, momentum: true, momentumRatio: 0.85, momentumBounce: true }"
      :grab-cursor="true"
      slides-per-view="auto"
      :space-between="10"
      :breakpoints="{
        640: { slidesPerView: 3.5, spaceBetween: 14 },
        768: { slidesPerView: 4.5, spaceBetween: 16 },
        1024: { slidesPerView: 6, spaceBetween: 16 },
        1280: { slidesPerView: 7.2, spaceBetween: 16 },
        1536: { slidesPerView: 8, spaceBetween: 16 }
      }"
      class="!overflow-visible sm:!overflow-hidden py-1"
      @swiper="onSwiper"
      @slide-change="onSlideChange"
    >
      <SwiperSlide
        v-for="item in items"
        :key="item.id"
        class="!w-[140px] sm:!w-auto flex-shrink-0"
      >
        <MangaCard :manga="item" />
      </SwiperSlide>
    </Swiper>
  </div>
</template>

<style>
/* Remove all scrollbars completely from swiper elements */
.swiper,
.swiper-wrapper {
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}
.swiper::-webkit-scrollbar,
.swiper-wrapper::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}
</style>
