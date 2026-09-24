<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  src: string
  alt?: string
  index?: number
  isSinglePage?: boolean
  aspectRatioClass?: string
}>(), {
  alt: 'Страница манги',
  isSinglePage: false,
  aspectRatioClass: ''
})

const emit = defineEmits<{
  (e: 'error', index?: number): void
  (e: 'load', index?: number): void
  (e: 'tap-left'): void
  (e: 'tap-center'): void
  (e: 'tap-right'): void
  (e: 'long-press', payload: { index: number; src: string }): void
}>()

const containerRef = ref<HTMLElement | null>(null)
const imageRef = ref<HTMLImageElement | null>(null)

// Zoom & Pan state
const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)
const isAnimating = ref(false)
const isPinching = ref(false)
const isPanning = ref(false)

const isZoomed = computed(() => scale.value > 1.05)

// Touch tracking
let initialPinchDist = 0
let initialScale = 1
let initialPinchCenter = { x: 0, y: 0 }
let initialPan = { x: 0, y: 0 }
let touchStartPos = { x: 0, y: 0 }
let lastTapTime = 0
let lastTapPos = { x: 0, y: 0 }
let singleTapTimeout: any = null
let longPressTimer: any = null
let isLongPressTriggered = false

// Desktop mouse dragging state
let isMouseDown = false
let mouseStartPos = { x: 0, y: 0 }
let mouseInitialPan = { x: 0, y: 0 }

const resetZoom = (animated = true) => {
  if (animated) {
    isAnimating.value = true
    setTimeout(() => {
      isAnimating.value = false
    }, 280)
  }
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
}

// Reset if image src changes
watch(() => props.src, () => {
  resetZoom(false)
})

const getDistance = (t1: Touch, t2: Touch) => {
  const dx = t1.clientX - t2.clientX
  const dy = t1.clientY - t2.clientY
  return Math.hypot(dx, dy)
}

const getCenter = (t1: Touch, t2: Touch) => {
  return {
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2
  }
}

const clampPan = (targetScale: number, tx: number, ty: number) => {
  if (!containerRef.value) return { x: tx, y: ty }
  const rect = containerRef.value.getBoundingClientRect()
  const maxTx = Math.max(0, (rect.width * (targetScale - 1)) / 2)
  const maxTy = Math.max(0, (rect.height * (targetScale - 1)) / 2)

  return {
    x: Math.max(-maxTx, Math.min(maxTx, tx)),
    y: Math.max(-maxTy, Math.min(maxTy, ty))
  }
}

const zoomToPoint = (targetScale: number, clientX: number, clientY: number) => {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  
  isAnimating.value = true
  setTimeout(() => {
    isAnimating.value = false
  }, 280)

  if (targetScale <= 1.05) {
    resetZoom(true)
    return
  }

  // Calculate offset relative to center of image
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  const offsetX = clientX - centerX
  const offsetY = clientY - centerY

  const newTx = -offsetX * (targetScale - 1)
  const newTy = -offsetY * (targetScale - 1)

  const clamped = clampPan(targetScale, newTx, newTy)
  scale.value = targetScale
  translateX.value = clamped.x
  translateY.value = clamped.y
}

const onTouchStart = (e: TouchEvent) => {
  if (e.touches.length === 2) {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
    // Start 2-finger pinch
    isPinching.value = true
    isPanning.value = false
    isAnimating.value = false
    if (singleTapTimeout) clearTimeout(singleTapTimeout)

    initialPinchDist = getDistance(e.touches[0], e.touches[1])
    initialScale = scale.value
    initialPinchCenter = getCenter(e.touches[0], e.touches[1])
    initialPan = { x: translateX.value, y: translateY.value }
  } else if (e.touches.length === 1) {
    const touch = e.touches[0]
    touchStartPos = { x: touch.clientX, y: touch.clientY }
    isLongPressTriggered = false

    // Start 500ms long press timer
    if (longPressTimer) clearTimeout(longPressTimer)
    longPressTimer = setTimeout(() => {
      isLongPressTriggered = true
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(40) } catch {}
      }
      emit('long-press', {
        index: props.index ?? 0,
        src: props.src
      })
    }, 500)

    if (isZoomed.value) {
      // 1 finger panning when already zoomed
      isPanning.value = true
      isAnimating.value = false
      initialPan = { x: translateX.value, y: translateY.value }
    }
  }
}

const onTouchMove = (e: TouchEvent) => {
  // Cancel long-press if finger moved or multiple fingers touch
  if (longPressTimer) {
    if (e.touches.length > 1) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    } else if (e.touches.length === 1) {
      const touch = e.touches[0]
      const dist = Math.hypot(touch.clientX - touchStartPos.x, touch.clientY - touchStartPos.y)
      if (dist > 10) {
        clearTimeout(longPressTimer)
        longPressTimer = null
      }
    }
  }

  if (e.touches.length === 2 && isPinching.value) {
    // Actively pinching
    e.preventDefault() // prevent browser scroll/zoom
    const dist = getDistance(e.touches[0], e.touches[1])
    if (initialPinchDist > 0) {
      const factor = dist / initialPinchDist
      const rawScale = initialScale * factor
      const newScale = Math.min(Math.max(rawScale, 0.8), 4.5)

      const center = getCenter(e.touches[0], e.touches[1])
      const dCenterX = center.x - initialPinchCenter.x
      const dCenterY = center.y - initialPinchCenter.y

      scale.value = newScale
      const clamped = clampPan(newScale, initialPan.x + dCenterX, initialPan.y + dCenterY)
      translateX.value = clamped.x
      translateY.value = clamped.y
    }
  } else if (e.touches.length === 1 && isPanning.value && isZoomed.value) {
    // Actively panning while zoomed
    e.preventDefault() // prevent page scrolling while inspecting zoomed manga
    const touch = e.touches[0]
    const dx = touch.clientX - touchStartPos.x
    const dy = touch.clientY - touchStartPos.y

    const clamped = clampPan(scale.value, initialPan.x + dx, initialPan.y + dy)
    translateX.value = clamped.x
    translateY.value = clamped.y
  }
}

const onTouchEnd = (e: TouchEvent) => {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }

  if (isLongPressTriggered) {
    isLongPressTriggered = false
    return
  }

  if (isPinching.value && e.touches.length < 2) {
    isPinching.value = false
    if (scale.value < 1.05) {
      resetZoom(true)
    } else {
      isAnimating.value = true
      setTimeout(() => { isAnimating.value = false }, 250)
      const clamped = clampPan(scale.value, translateX.value, translateY.value)
      translateX.value = clamped.x
      translateY.value = clamped.y
    }
    return
  }

  if (isPanning.value && e.touches.length === 0) {
    isPanning.value = false
    isAnimating.value = true
    setTimeout(() => { isAnimating.value = false }, 250)
    const clamped = clampPan(scale.value, translateX.value, translateY.value)
    translateX.value = clamped.x
    translateY.value = clamped.y
  }

  // Handle Double-tap vs Single-tap if touched with 1 finger and barely moved
  if (e.changedTouches.length === 1 && !isPinching.value) {
    const touch = e.changedTouches[0]
    const moveDist = Math.hypot(touch.clientX - touchStartPos.x, touch.clientY - touchStartPos.y)

    if (moveDist < 12) {
      const now = Date.now()
      const timeSinceLastTap = now - lastTapTime
      const tapDistFromLast = Math.hypot(touch.clientX - lastTapPos.x, touch.clientY - lastTapPos.y)

      if (timeSinceLastTap < 320 && tapDistFromLast < 40) {
        // Double tap confirmed!
        if (singleTapTimeout) {
          clearTimeout(singleTapTimeout)
          singleTapTimeout = null
        }
        lastTapTime = 0

        if (isZoomed.value) {
          resetZoom(true)
        } else {
          zoomToPoint(2.5, touch.clientX, touch.clientY)
        }
      } else {
        // First tap candidate: wait to see if second tap follows
        lastTapTime = now
        lastTapPos = { x: touch.clientX, y: touch.clientY }

        if (!isZoomed.value) {
          singleTapTimeout = setTimeout(() => {
            handleSingleTap(touch.clientX, touch.clientY)
            singleTapTimeout = null
          }, 300)
        }
      }
    }
  }
}

const handleSingleTap = (clientX: number, clientY: number) => {
  if (isZoomed.value) return

  if (props.isSinglePage && containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()
    const relativeX = (clientX - rect.left) / rect.width

    if (relativeX < 0.3) {
      emit('tap-left')
    } else if (relativeX > 0.7) {
      emit('tap-right')
    } else {
      emit('tap-center')
    }
  } else {
    emit('tap-center')
  }
}

// Desktop double click support
const onDoubleClick = (e: MouseEvent) => {
  if (isZoomed.value) {
    resetZoom(true)
  } else {
    zoomToPoint(2.5, e.clientX, e.clientY)
  }
}

// Desktop mouse drag when zoomed
const onMouseDown = (e: MouseEvent) => {
  if (!isZoomed.value) return
  isMouseDown = true
  mouseStartPos = { x: e.clientX, y: e.clientY }
  mouseInitialPan = { x: translateX.value, y: translateY.value }
  isAnimating.value = false
}

const onMouseMove = (e: MouseEvent) => {
  if (!isMouseDown || !isZoomed.value) return
  e.preventDefault()
  const dx = e.clientX - mouseStartPos.x
  const dy = e.clientY - mouseStartPos.y
  const clamped = clampPan(scale.value, mouseInitialPan.x + dx, mouseInitialPan.y + dy)
  translateX.value = clamped.x
  translateY.value = clamped.y
}

const onMouseUp = () => {
  if (isMouseDown) {
    isMouseDown = false
    const clamped = clampPan(scale.value, translateX.value, translateY.value)
    translateX.value = clamped.x
    translateY.value = clamped.y
  }
}

const onContextMenu = (e: MouseEvent) => {
  e.preventDefault()
  emit('long-press', {
    index: props.index ?? 0,
    src: props.src
  })
}

onMounted(() => {
  window.addEventListener('mouseup', onMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('mouseup', onMouseUp)
  if (singleTapTimeout) clearTimeout(singleTapTimeout)
  if (longPressTimer) clearTimeout(longPressTimer)
})

const transformStyle = computed(() => {
  return {
    transform: `translate3d(${translateX.value}px, ${translateY.value}px, 0) scale(${scale.value})`,
    transformOrigin: 'center center',
    transition: isAnimating.value ? 'transform 0.26s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
    touchAction: isZoomed.value ? 'none' : 'pan-y'
  }
})
</script>

<template>
  <div
    ref="containerRef"
    :class="[
      'relative w-full overflow-visible select-none flex items-center justify-center',
      isZoomed ? 'z-30 cursor-grab active:cursor-grabbing' : 'z-10'
    ]"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
    @touchcancel="onTouchEnd"
    @dblclick="onDoubleClick"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @contextmenu="onContextMenu"
  >
    <!-- The Zoomable Image Surface -->
    <div
      class="w-full flex items-center justify-center will-change-transform"
      :style="transformStyle"
    >
      <img
        ref="imageRef"
        :src="src"
        :alt="alt"
        class="w-full h-auto block select-none pointer-events-none"
        loading="lazy"
        decoding="async"
        @error="emit('error', index)"
        @load="emit('load', index)"
      />
    </div>

    <!-- Active Zoom Status Badge & Quick Reset Button (Visible only when zoomed) -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-90 translate-y-2"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100 translate-y-0"
      leave-to-class="opacity-0 scale-90 translate-y-2"
    >
      <div
        v-if="isZoomed"
        class="fixed bottom-6 right-4 sm:right-8 z-50 flex items-center gap-2 bg-zinc-950/90 text-white backdrop-blur-md px-3.5 py-2 rounded-2xl border border-zinc-700/80 shadow-2xl"
      >
        <span class="text-xs font-bold text-amber-400">
          {{ scale.toFixed(1) }}x
        </span>
        <button
          type="button"
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-[11px] font-bold text-zinc-200 transition-all cursor-pointer"
          title="Сбросить масштаб"
          @click.stop="resetZoom(true)"
        >
          <RotateCcw class="w-3 h-3 text-zinc-400" />
          <span>Сброс</span>
        </button>
      </div>
    </transition>
  </div>
</template>
