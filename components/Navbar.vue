<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  Bookmark,
  History,
  Search,
  X,
  Settings
} from 'lucide-vue-next'
import { useBookmarksStore } from '~/stores/bookmarks'
import { useHistoryStore } from '~/stores/history'
import { useAppUpdate } from '~/composables/useAppUpdate'
import { registerBackHandler } from '~/composables/useBackButton'
import SearchBar from '~/components/SearchBar.vue'

const bookmarksStore = useBookmarksStore()
const historyStore = useHistoryStore()
const { hasUpdate } = useAppUpdate()

const isMobileSearchOpen = ref(false)

const bookmarksCount = computed(() => Object.keys(bookmarksStore.bookmarks).length)
const historyCount = computed(() => historyStore.history.length)

const toggleMobileSearch = () => {
  isMobileSearchOpen.value = !isMobileSearchOpen.value
}

let unregisterBack: (() => void) | null = null

onMounted(() => {
  unregisterBack = registerBackHandler(() => {
    if (isMobileSearchOpen.value) {
      isMobileSearchOpen.value = false
      return true
    }
    return false
  })
})

onUnmounted(() => {
  if (unregisterBack) {
    unregisterBack()
  }
})
</script>

<template>
  <header class="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-xl pt-safe select-none transition-all">
    <div class="w-full px-3.5 sm:px-8 xl:px-12 h-14 sm:h-20 flex items-center justify-between gap-3 sm:gap-6">
      
      <!-- Brand Logo -->
      <div class="flex items-center gap-4 sm:gap-8">
        <NuxtLink to="/" class="flex items-center group transition-colors py-1 select-none">
          <span class="tracking-wider font-black text-xl sm:text-3xl text-white group-hover:text-zinc-200 transition-colors">
            N.ECO<span class="text-amber-400 font-light">MANGA</span>
          </span>
        </NuxtLink>

        <!-- Desktop Navigation Links -->
        <nav class="hidden md:flex items-center gap-2 text-base font-semibold text-zinc-300">
          <NuxtLink
            to="/catalog"
            class="px-4 py-2.5 rounded-xl hover:text-white hover:bg-zinc-900 transition-colors"
            active-class="text-white bg-zinc-900 font-bold"
          >
            Каталог
          </NuxtLink>
          <NuxtLink
            to="/catalog?type=2"
            class="px-4 py-2.5 rounded-xl hover:text-white hover:bg-zinc-900 transition-colors"
            active-class="text-white bg-zinc-900 font-bold"
          >
            Манхва
          </NuxtLink>
          <NuxtLink
            to="/catalog?type=3"
            class="px-4 py-2.5 rounded-xl hover:text-white hover:bg-zinc-900 transition-colors"
            active-class="text-white bg-zinc-900 font-bold"
          >
            Маньхуа
          </NuxtLink>
          <NuxtLink
            to="/catalog?type=1"
            class="px-4 py-2.5 rounded-xl hover:text-white hover:bg-zinc-900 transition-colors"
            active-class="text-white bg-zinc-900 font-bold"
          >
            Манга
          </NuxtLink>
        </nav>
      </div>

      <!-- Search Bar Center (Desktop) -->
      <div class="hidden sm:block flex-1 max-w-xl mx-4">
        <SearchBar />
      </div>

      <!-- Right Action Controls -->
      <div class="flex items-center gap-2 sm:gap-3">
        <!-- Mobile Search Button -->
        <button
          type="button"
          class="sm:hidden p-2.5 rounded-xl bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800 transition-colors"
          :title="isMobileSearchOpen ? 'Закрыть поиск' : 'Открыть поиск'"
          @click="toggleMobileSearch"
        >
          <X v-if="isMobileSearchOpen" class="w-5 h-5 text-amber-400" />
          <Search v-else class="w-5 h-5" />
        </button>

        <!-- Settings Button -->
        <NuxtLink
          to="/settings"
          class="relative p-2.5 rounded-xl bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800 transition-colors flex items-center justify-center shrink-0 group"
          title="Настройки"
        >
          <Settings class="w-5 h-5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
          <span v-if="hasUpdate" class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
          <span v-if="hasUpdate" class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400"></span>
        </NuxtLink>

        <!-- Bookmarks Link (Desktop only, mobile has bottom bar) -->
        <NuxtLink
          to="/bookmarks"
          class="hidden md:flex relative p-2.5 px-3.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 text-zinc-200 hover:text-white border border-zinc-800/80 hover:border-zinc-700 transition-colors items-center gap-2.5 text-sm font-bold"
          title="Мои закладки"
        >
          <Bookmark class="w-4 h-4 text-zinc-400" />
          <span class="hidden lg:inline">Закладки</span>
          <span
            v-if="bookmarksCount > 0"
            class="min-w-[20px] h-[20px] px-1.5 text-xs font-black rounded-full bg-zinc-100 text-zinc-950 flex items-center justify-center shadow"
          >
            {{ bookmarksCount }}
          </span>
        </NuxtLink>

        <!-- History Link (Desktop only) -->
        <NuxtLink
          to="/bookmarks?tab=history"
          class="hidden md:flex relative p-2.5 px-3.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 text-zinc-200 hover:text-white border border-zinc-800/80 hover:border-zinc-700 transition-colors items-center gap-2.5 text-sm font-bold"
          title="История «Вы читали»"
        >
          <History class="w-4 h-4 text-zinc-400" />
          <span class="hidden lg:inline">История</span>
          <span
            v-if="historyCount > 0"
            class="min-w-[20px] h-[20px] px-1.5 text-xs font-black rounded-full bg-zinc-800 text-zinc-200 flex items-center justify-center border border-zinc-700"
          >
            {{ historyCount }}
          </span>
        </NuxtLink>
      </div>
    </div>

    <!-- Mobile Search Expandable Drawer -->
    <div
      v-if="isMobileSearchOpen"
      class="sm:hidden border-t border-zinc-800/80 bg-zinc-950 px-3.5 py-3 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <SearchBar @selected="isMobileSearchOpen = false" />
    </div>
  </header>
</template>
