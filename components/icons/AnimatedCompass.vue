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
      <circle cx="12" cy="12" r="10" />
      <polygon
        points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"
        :class="{ 'needle-animating': isAnimating }"
        @animationend="onAnimationEnd"
      />
    </svg>
  </div>
</template>

<style scoped>
.needle-animating {
  animation: compassNeedleSpin 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  transform-origin: 12px 12px;
}

@keyframes compassNeedleSpin {
  0% {
    transform: rotate(0deg);
  }
  75% {
    transform: rotate(385deg);
  }
  90% {
    transform: rotate(355deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
