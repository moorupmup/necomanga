<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  Flame,
  Compass,
  Bookmark,
  History
} from 'lucide-vue-next'
import { useBookmarksStore } from '~/stores/bookmarks'
import { useHistoryStore } from '~/stores/history'

const route = useRoute()
const bookmarksStore = useBookmarksStore()
const historyStore = useHistoryStore()

const bookmarksCount = computed(() => Object.keys(bookmarksStore.bookmarks).length)
const historyCount = computed(() => historyStore.history.length)

const isHomeActive = computed(() => route.path === '/')
const isCatalogActive = computed(() => route.path.startsWith('/catalog'))
const isBookmarksActive = computed(() => route.path === '/bookmarks' && route.query.tab !== 'history')
const isHistoryActive = computed(() => route.path === '/bookmarks' && route.query.tab === 'history')
</script>

<template>
  <nav
    v-if="!route.path.startsWith('/read/')"
    class="md:hidden fixed bottom-0 inset-x-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/80 pb-safe select-none transition-transform duration-300"
  >
    <div class="grid grid-cols-4 h-16 items-center px-1">
      <!-- 1. Home -->
      <NuxtLink
        to="/"
        class="flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all active:scale-90 relative"
        :class="isHomeActive ? 'text-amber-400 font-bold' : 'text-zinc-400 hover:text-zinc-200 font-medium'"
      >
        <Flame :class="['w-5 h-5 transition-transform', isHomeActive ? 'scale-110 text-amber-400' : '']" />
        <span class="text-[11px] leading-tight">Главная</span>
        <span
          v-if="isHomeActive"
          class="absolute -bottom-1 w-5 h-0.5 rounded-full bg-amber-400"
        ></span>
      </NuxtLink>

      <!-- 2. Catalog -->
      <NuxtLink
        to="/catalog"
        class="flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all active:scale-90 relative"
        :class="isCatalogActive ? 'text-amber-400 font-bold' : 'text-zinc-400 hover:text-zinc-200 font-medium'"
      >
        <Compass :class="['w-5 h-5 transition-transform', isCatalogActive ? 'scale-110 text-amber-400' : '']" />
        <span class="text-[11px] leading-tight">Каталог</span>
        <span
          v-if="isCatalogActive"
          class="absolute -bottom-1 w-5 h-0.5 rounded-full bg-amber-400"
        ></span>
      </NuxtLink>

      <!-- 3. Bookmarks -->
      <NuxtLink
        to="/bookmarks"
        class="flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all active:scale-90 relative"
        :class="isBookmarksActive ? 'text-amber-400 font-bold' : 'text-zinc-400 hover:text-zinc-200 font-medium'"
      >
        <div class="relative">
          <Bookmark :class="['w-5 h-5 transition-transform', isBookmarksActive ? 'scale-110 text-amber-400 fill-amber-400/20' : '']" />
          <span
            v-if="bookmarksCount > 0"
            class="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-1 text-[9px] font-black rounded-full bg-amber-400 text-zinc-950 flex items-center justify-center leading-none"
          >
            {{ bookmarksCount > 99 ? '99+' : bookmarksCount }}
          </span>
        </div>
        <span class="text-[11px] leading-tight">Закладки</span>
        <span
          v-if="isBookmarksActive"
          class="absolute -bottom-1 w-5 h-0.5 rounded-full bg-amber-400"
        ></span>
      </NuxtLink>

      <!-- 4. History -->
      <NuxtLink
        to="/bookmarks?tab=history"
        class="flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all active:scale-90 relative"
        :class="isHistoryActive ? 'text-amber-400 font-bold' : 'text-zinc-400 hover:text-zinc-200 font-medium'"
      >
        <div class="relative">
          <History :class="['w-5 h-5 transition-transform', isHistoryActive ? 'scale-110 text-amber-400' : '']" />
          <span
            v-if="historyCount > 0"
            class="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-1 text-[9px] font-black rounded-full bg-zinc-700 text-zinc-200 flex items-center justify-center leading-none"
          >
            {{ historyCount > 99 ? '99+' : historyCount }}
          </span>
        </div>
        <span class="text-[11px] leading-tight">История</span>
        <span
          v-if="isHistoryActive"
          class="absolute -bottom-1 w-5 h-0.5 rounded-full bg-amber-400"
        ></span>
      </NuxtLink>
    </div>
  </nav>
</template>
