<script setup lang="ts">
import Navbar from '~/components/Navbar.vue'
import BottomNav from '~/components/BottomNav.vue'
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[#09090b] text-zinc-100 selection:bg-zinc-700 selection:text-white">
    <!-- Navbar Top Header -->
    <Navbar />

    <!-- Main Content Container with Space for Mobile Bottom Bar -->
    <main class="flex-1 w-full pb-24 md:pb-0">
      <slot />
    </main>

    <!-- Bottom Navigation Bar for Mobile -->
    <BottomNav />
  </div>
</template>
