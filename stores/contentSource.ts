import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type ContentMode = 'manga' | 'ranobe'

export const useContentSourceStore = defineStore('contentSource', () => {
  const mode = ref<ContentMode>('manga')

  const isRanobe = computed(() => mode.value === 'ranobe')
  const isManga = computed(() => mode.value === 'manga')

  // Theme accents
  const accentText = computed(() => (mode.value === 'ranobe' ? 'text-blue-400' : 'text-amber-400'))
  const accentBg = computed(() => (mode.value === 'ranobe' ? 'bg-blue-500' : 'bg-amber-400'))
  const accentBgHover = computed(() => (mode.value === 'ranobe' ? 'hover:bg-blue-400' : 'hover:bg-amber-300'))
  const accentBorder = computed(() => (mode.value === 'ranobe' ? 'border-blue-500/30' : 'border-amber-500/30'))
  const accentShadow = computed(() => (mode.value === 'ranobe' ? 'shadow-blue-500/20' : 'shadow-amber-500/20'))
  const accentFill = computed(() => (mode.value === 'ranobe' ? 'fill-blue-400 text-blue-400' : 'fill-amber-400 text-amber-400'))
  const accentBadge = computed(() => (mode.value === 'ranobe' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'))
  const accentButton = computed(() => (mode.value === 'ranobe' ? 'bg-blue-500 hover:bg-blue-400 active:bg-blue-400 text-white shadow-blue-500/20' : 'bg-amber-400 hover:bg-amber-300 active:bg-amber-300 text-zinc-950 shadow-amber-500/20'))

  const init = () => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('necomanga_content_mode') as ContentMode | null
        if (stored === 'manga' || stored === 'ranobe') {
          mode.value = stored
        }
      } catch (e) {
        console.error('Failed to load content mode', e)
      }
    }
  }

  const setMode = (newMode: ContentMode) => {
    mode.value = newMode
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('necomanga_content_mode', newMode)
      } catch (e) {
        console.error('Failed to save content mode', e)
      }
    }
  }

  const toggleMode = () => {
    setMode(mode.value === 'manga' ? 'ranobe' : 'manga')
  }

  // Initialize immediately
  init()

  return {
    mode,
    isRanobe,
    isManga,
    accentText,
    accentBg,
    accentBgHover,
    accentBorder,
    accentShadow,
    accentFill,
    accentBadge,
    accentButton,
    setMode,
    toggleMode
  }
})
