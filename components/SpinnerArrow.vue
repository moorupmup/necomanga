<script setup lang="ts">
defineProps<{
  class?: string
}>()
</script>

<template>
  <svg
    :class="['animate-spin text-zinc-400', $props.class || 'w-5 h-5']"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    <polyline points="21 3 21 8 16 8" />
  </svg>
</template>
