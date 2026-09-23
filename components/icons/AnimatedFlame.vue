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
        d="M8.9 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
        :class="{ 'flame-animating': isAnimating }"
        @animationend="onAnimationEnd"
      />
    </svg>
  </div>
</template>

<style scoped>
.flame-animating {
  animation: flameFlare 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards;
  transform-origin: 12px 19px;
}

@keyframes flameFlare {
  0% {
    transform: scale(1) translateY(0);
    stroke-dasharray: 60;
    stroke-dashoffset: 60;
    opacity: 0.3;
  }
  35% {
    stroke-dashoffset: 0;
    opacity: 1;
    transform: scale(1.22, 1.25) translateY(-2px);
  }
  65% {
    transform: scale(0.92, 0.95) translateY(1px);
  }
  85% {
    transform: scale(1.05, 1.03) translateY(-0.5px);
  }
  100% {
    transform: scale(1) translateY(0);
    stroke-dasharray: none;
    stroke-dashoffset: 0;
    opacity: 1;
  }
}
</style>
