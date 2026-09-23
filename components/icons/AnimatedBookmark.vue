<script setup lang="ts">
import { ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    size?: number
    active?: boolean
    animate?: boolean
  }>(),
  {
    size: 20,
    active: false,
    animate: false
  }
)

const emit = defineEmits<{
  (e: 'animationend'): void
}>()

const isAnimating = ref(false)

const trigger = () => {
  isAnimating.value = false
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      isAnimating.value = true
    })
  })
}

watch(
  () => props.animate,
  (val) => {
    if (val) trigger()
  }
)

const onAnimationEnd = () => {
  isAnimating.value = false
  emit('animationend')
}

defineExpose({ trigger })
</script>

<template>
  <div
    class="inline-flex items-center justify-center transition-transform"
    :class="[active ? 'scale-110' : 'scale-100']"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      :width="size"
      :height="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="overflow-visible"
    >
      <path
        d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"
        :fill="active ? 'currentColor' : 'none'"
        :fill-opacity="active ? '0.25' : '0'"
        :class="{ 'bookmark-animating': isAnimating }"
        @animationend="onAnimationEnd"
      />
    </svg>
  </div>
</template>

<style scoped>
.bookmark-animating {
  animation: bookmarkSquash 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards;
  transform-origin: 12px 12px;
}

@keyframes bookmarkSquash {
  0% {
    transform: scale(1, 1);
  }
  25% {
    transform: scale(0.85, 1.3);
  }
  50% {
    transform: scale(1.15, 0.9);
  }
  75% {
    transform: scale(0.95, 1.05);
  }
  100% {
    transform: scale(1, 1);
  }
}
</style>
