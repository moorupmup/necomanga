import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { App } from '@capacitor/app'
import { isNativePlatform } from '~/composables/useReManga'
import { useAppUpdate } from '~/composables/useAppUpdate'

// Handlers stack for modals / sheets / dialogs
// If a handler returns true, the back event is considered consumed.
const backHandlers: Array<() => boolean> = []

export const registerBackHandler = (handler: () => boolean) => {
  backHandlers.push(handler)
  return () => {
    const index = backHandlers.indexOf(handler)
    if (index !== -1) {
      backHandlers.splice(index, 1)
    }
  }
}

// Toast message state for "Press again to exit"
export const backExitToast = ref<string | null>(null)

let lastBackPressTime = 0
let toastTimer: any = null

export const setupBackButton = (router: ReturnType<typeof useRouter>, route: ReturnType<typeof useRoute>) => {
  if (!isNativePlatform()) {
    return
  }

  const { isModalOpen, isDownloading, closeModal } = useAppUpdate()

  App.addListener('backButton', () => {
    // 1. If Update Modal is open and not actively downloading, close it
    if (isModalOpen.value) {
      if (!isDownloading.value) {
        closeModal()
      }
      return
    }

    // 2. Execute custom handlers in LIFO order (last registered first, e.g. modal dialogs, menus)
    for (let i = backHandlers.length - 1; i >= 0; i--) {
      try {
        const handled = backHandlers[i]()
        if (handled) {
          return
        }
      } catch (err) {
        console.warn('Error in custom back handler:', err)
      }
    }

    // 3. Navigation: If not on home page '/', go back
    const isAtHome = route.path === '/'

    if (!isAtHome) {
      // Check if browser/router has history to go back to
      if (window.history.state && window.history.state.back) {
        router.back()
      } else if (window.history.length > 1) {
        router.back()
      } else if (route.path.startsWith('/read/') && route.query.dir) {
        router.push(`/manga/${route.query.dir}`)
      } else {
        // Fallback to home if no previous history entry
        router.push('/')
      }
      return
    }

    // 4. On Home page ('/'): Double-tap back within 2 seconds to minimize / exit app
    const now = Date.now()
    if (now - lastBackPressTime < 2000) {
      if (toastTimer) clearTimeout(toastTimer)
      backExitToast.value = null
      App.minimizeApp()
    } else {
      lastBackPressTime = now
      backExitToast.value = 'Нажмите ещё раз, чтобы выйти'
      if (toastTimer) clearTimeout(toastTimer)
      toastTimer = setTimeout(() => {
        backExitToast.value = null
      }, 2000)
    }
  })
}
