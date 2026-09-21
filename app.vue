<script setup lang="ts">
import { onMounted } from 'vue'
import { useReaderSettingsStore } from '~/stores/readerSettings'

const readerSettings = useReaderSettingsStore()

onMounted(() => {
  readerSettings.applyTheme(readerSettings.theme)
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
