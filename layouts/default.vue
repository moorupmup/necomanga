<script setup lang="ts">
import Navbar from '~/components/Navbar.vue'
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[#09090b] text-zinc-100 selection:bg-zinc-700 selection:text-white">
    <!-- Navbar Header -->
    <Navbar />

    <!-- Main Content Container with Expanded Width -->
    <main class="flex-1 w-full">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="mt-28 border-t border-zinc-900 bg-black/40 py-10 text-zinc-400 text-sm">
      <div class="w-full px-4 sm:px-8 xl:px-12 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-3 text-sm">
          <span class="font-black text-zinc-100 tracking-wider text-base">N.ECO<span class="text-amber-400 font-light">MANGA</span></span>
          <span class="text-zinc-600">•</span>
          <span class="text-zinc-400">Онлайн чтение манги, манхвы и маньхуа</span>
        </div>
        <div class="flex items-center gap-4 text-zinc-400 text-sm">
          <span>&copy; {{ new Date().getFullYear() }}</span>
        </div>
      </div>
    </footer>
  </div>
</template>
