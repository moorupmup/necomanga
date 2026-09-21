<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { ImageOff } from 'lucide-vue-next'
import SpinnerArrow from '~/components/SpinnerArrow.vue'

const props = withDefaults(
  defineProps<{
    src?: string
    alt?: string
    aspectClass?: string
    imgClass?: string
    fallbackSrc?: string
  }>(),
  {
    src: '',
    alt: '',
    aspectClass: 'aspect-[2/3]',
    imgClass: '',
    fallbackSrc: ''
  }
)

const isLoaded = ref(false)
const showSkeleton = ref(true)
const hasError = ref(false)
const imgRef = ref<HTMLImageElement | null>(null)

const onLoaded = () => {
  isLoaded.value = true
  hasError.value = false
  // Clean up skeleton after transition completes to free memory/CPU
  setTimeout(() => {
    if (isLoaded.value) {
      showSkeleton.value = false
    }
  }, 250)
}

const checkComplete = () => {
  if (imgRef.value?.complete) {
    if (imgRef.value.naturalWidth > 0) {
      onLoaded()
    } else if (props.src) {
      isLoaded.value = false
      showSkeleton.value = false
      hasError.value = true
    }
  }
}

const onError = () => {
  isLoaded.value = false
  showSkeleton.value = false
  hasError.value = true
}

watch(
  () => props.src,
  (newSrc) => {
    if (!newSrc) {
      isLoaded.value = false
      showSkeleton.value = false
      hasError.value = true
      return
    }
    isLoaded.value = false
    showSkeleton.value = true
    hasError.value = false
    setTimeout(checkComplete, 50)
  }
)

onMounted(() => {
  checkComplete()
})
</script>

<template>
  <div :class="['relative overflow-hidden bg-zinc-950', aspectClass || 'aspect-[2/3] w-full']">
    <!-- Real Image with clean, instant fade-in -->
    <img
      v-if="!hasError && src"
      ref="imgRef"
      :src="src"
      :alt="alt"
      loading="lazy"
      decoding="async"
      :class="[
        'w-full h-full object-cover object-center transition-opacity duration-200 ease-out',
        isLoaded ? 'opacity-100' : 'opacity-0',
        imgClass
      ]"
      @load="onLoaded"
      @error="onError"
    />

    <!-- Skeleton loader that fades out smoothly when loaded -->
    <div
      v-if="showSkeleton && !hasError && src"
      :class="[
        'absolute inset-0 z-10 flex items-center justify-center bg-zinc-950 overflow-hidden select-none pointer-events-none transition-opacity duration-200 ease-out',
        isLoaded ? 'opacity-0' : 'opacity-100'
      ]"
    >
      <!-- Pure spinning icon without square container -->
      <SpinnerArrow class="w-7 h-7 text-zinc-500" />
    </div>

    <!-- Error fallback placeholder -->
    <div
      v-if="hasError || !src"
      class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-900/80 p-3 text-center select-none border border-zinc-800/40"
    >
      <ImageOff class="w-6 h-6 text-zinc-600 mb-1 opacity-60" />
      <span class="text-xs font-semibold text-zinc-500 tracking-tight">Нет обложки</span>
    </div>
  </div>
</template>
