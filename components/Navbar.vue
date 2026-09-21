<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Bookmark,
  History,
  Compass,
  Menu,
  X
} from 'lucide-vue-next'
import { useBookmarksStore } from '~/stores/bookmarks'
import { useHistoryStore } from '~/stores/history'
import SearchBar from '~/components/SearchBar.vue'

const bookmarksStore = useBookmarksStore()
const historyStore = useHistoryStore()

const isMobileMenuOpen = ref(false)

const bookmarksCount = computed(() => Object.keys(bookmarksStore.bookmarks).length)
const historyCount = computed(() => historyStore.history.length)
</script>

<template>
  <header class="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl">
    <div class="w-full px-4 sm:px-8 xl:px-12 h-20 py-3.5 flex items-center justify-between gap-6">
      
      <!-- Brand Logo -->
      <div class="flex items-center gap-8">
        <NuxtLink to="/" class="flex items-center group transition-colors py-1 select-none">
          <span class="tracking-wider font-black text-2xl sm:text-3xl text-white group-hover:text-zinc-200 transition-colors">
            N.ECO<span class="text-amber-400 font-light">MANGA</span>
          </span>
        </NuxtLink>

        <!-- Desktop Navigation Links (Large & bold) -->
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

      <!-- Search Bar Center -->
      <div class="hidden sm:block flex-1 max-w-xl mx-4">
        <SearchBar />
      </div>

      <!-- Right Action Controls -->
      <div class="flex items-center gap-3">
        <!-- Bookmarks Link -->
        <NuxtLink
          to="/bookmarks"
          class="relative p-2.5 px-3.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 text-zinc-200 hover:text-white border border-zinc-800/80 hover:border-zinc-700 transition-colors flex items-center gap-2.5 text-sm font-bold"
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

        <!-- History Link -->
        <NuxtLink
          to="/bookmarks?tab=history"
          class="relative p-2.5 px-3.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 text-zinc-200 hover:text-white border border-zinc-800/80 hover:border-zinc-700 transition-colors flex items-center gap-2.5 text-sm font-bold"
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

        <!-- Mobile Menu Toggle -->
        <button
          type="button"
          class="md:hidden p-2.5 rounded-xl bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800"
          @click="isMobileMenuOpen = !isMobileMenuOpen"
        >
          <Menu v-if="!isMobileMenuOpen" class="w-5 h-5" />
          <X v-else class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Mobile Drawer -->
    <div
      v-if="isMobileMenuOpen"
      class="md:hidden border-t border-zinc-800 bg-zinc-950 px-4 py-4 space-y-3"
    >
      <div class="sm:hidden pb-1">
        <SearchBar />
      </div>

      <nav class="flex flex-col space-y-1.5 text-base font-semibold">
        <NuxtLink
          to="/catalog"
          class="px-4 py-3 rounded-xl text-zinc-200 hover:bg-zinc-900"
          @click="isMobileMenuOpen = false"
        >
          Каталог
        </NuxtLink>
        <NuxtLink
          to="/catalog?type=2"
          class="px-4 py-3 rounded-xl text-zinc-200 hover:bg-zinc-900"
          @click="isMobileMenuOpen = false"
        >
          Корейская манхва
        </NuxtLink>
        <NuxtLink
          to="/catalog?type=3"
          class="px-4 py-3 rounded-xl text-zinc-200 hover:bg-zinc-900"
          @click="isMobileMenuOpen = false"
        >
          Китайская маньхуа
        </NuxtLink>
        <NuxtLink
          to="/catalog?type=1"
          class="px-4 py-3 rounded-xl text-zinc-200 hover:bg-zinc-900"
          @click="isMobileMenuOpen = false"
        >
          Японская манга
        </NuxtLink>
        <NuxtLink
          to="/bookmarks"
          class="px-4 py-3 rounded-xl text-zinc-200 hover:bg-zinc-900 flex items-center justify-between"
          @click="isMobileMenuOpen = false"
        >
          <span>Закладки</span>
          <span v-if="bookmarksCount" class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-200">{{ bookmarksCount }}</span>
        </NuxtLink>
        <NuxtLink
          to="/bookmarks?tab=history"
          class="px-4 py-3 rounded-xl text-zinc-200 hover:bg-zinc-900 flex items-center justify-between"
          @click="isMobileMenuOpen = false"
        >
          <span>История «Вы читали»</span>
          <span v-if="historyCount" class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-200">{{ historyCount }}</span>
        </NuxtLink>
      </nav>
    </div>
  </header>
</template>
