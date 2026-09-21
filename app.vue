<script setup lang="ts">
import { onMounted } from 'vue'
import { useReaderSettingsStore } from '~/stores/readerSettings'
import { useAppUpdate } from '~/composables/useAppUpdate'
import UpdateModal from '~/components/UpdateModal.vue'

const readerSettings = useReaderSettingsStore()
const { checkForUpdates } = useAppUpdate()

onMounted(() => {
  readerSettings.applyTheme(readerSettings.theme)
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
</template>
