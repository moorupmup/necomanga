<script setup lang="ts">
import Navbar from '~/components/Navbar.vue'
import BottomNav from '~/components/BottomNav.vue'
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[#09090b] text-zinc-100 selection:bg-zinc-700 selection:text-white">
    <!-- Navbar Top Header -->
    <Navbar />

    <!-- Main Content Container with Space for Mobile Bottom Bar -->
    <main class="flex-1 w-full pb-28 md:pb-0">
      <slot />
    </main>

    <!-- Bottom Navigation Bar for Mobile -->
    <BottomNav />

    <!-- Footer -->
    <footer class="mt-12 md:mt-28 mb-20 md:mb-0 border-t border-zinc-900 bg-black/40 py-6 md:py-10 text-zinc-400 text-xs sm:text-sm select-none">
      <div class="w-full px-4 sm:px-8 xl:px-12 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-center sm:text-left">
        <div class="flex items-center gap-2.5 text-xs sm:text-sm">
          <span class="font-black text-zinc-100 tracking-wider text-sm sm:text-base">N.ECO<span class="text-amber-400 font-light">MANGA</span></span>
          <span class="text-zinc-600">•</span>
          <span class="text-zinc-400">Онлайн чтение манги, манхвы и маньхуа</span>
        </div>
        <div class="flex items-center gap-4 text-zinc-500 text-xs sm:text-sm">
          <span>&copy; {{ new Date().getFullYear() }}</span>
        </div>
      </div>
    </footer>
  </div>
</template>
