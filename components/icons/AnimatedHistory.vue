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
      <g
        :class="{ 'history-arrow-animating': isAnimating }"
        @animationend="onAnimationEnd"
      >
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </g>
      <line
        x1="12"
        y1="12"
        x2="12"
        y2="7"
        :class="{ 'history-hour-animating': isAnimating }"
      />
      <line
        x1="12"
        y1="12"
        x2="16"
        y2="14"
        :class="{ 'history-minute-animating': isAnimating }"
      />
    </svg>
  </div>
</template>

<style scoped>
.history-arrow-animating {
  animation: historyArrowPull 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  transform-origin: 12px 12px;
}

.history-hour-animating {
  animation: historyHourSpin 0.65s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  transform-origin: 12px 12px;
}

.history-minute-animating {
  animation: historyMinuteSpin 0.65s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  transform-origin: 12px 12px;
}

@keyframes historyArrowPull {
  0% {
    transform: rotate(0deg);
  }
  40% {
    transform: rotate(-50deg);
  }
  75% {
    transform: rotate(6deg);
  }
  100% {
    transform: rotate(0deg);
  }
}

@keyframes historyHourSpin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(-360deg);
  }
}

@keyframes historyMinuteSpin {
  0% {
    transform: rotate(0deg);
  }
  50% {
    transform: rotate(-45deg);
  }
  100% {
    transform: rotate(0deg);
  }
}
</style>
