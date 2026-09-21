<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useReaderSettingsStore } from '~/stores/readerSettings'
import { useAppUpdate } from '~/composables/useAppUpdate'
import { setupBackButton, backExitToast } from '~/composables/useBackButton'
import UpdateModal from '~/components/UpdateModal.vue'

const router = useRouter()
const route = useRoute()
const readerSettings = useReaderSettingsStore()
const { checkForUpdates } = useAppUpdate()

onMounted(() => {
  readerSettings.applyTheme(readerSettings.theme)

  // Initialize Android hardware/gesture back button handling
  setupBackButton(router, route)

  // Check for app updates in background 3 seconds after app launch
  setTimeout(() => {
    checkForUpdates(true)
  }, 3000)
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <UpdateModal />

  <!-- Toast when pressing back on root screen -->
  <Teleport to="body">
    <div
      v-if="backExitToast"
      class="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-zinc-900/95 border border-zinc-700 text-xs font-bold text-zinc-100 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-none select-none"
    >
      {{ backExitToast }}
    </div>
  </Teleport>
</template>
