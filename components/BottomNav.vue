<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useBookmarksStore } from '~/stores/bookmarks'
import { useHistoryStore } from '~/stores/history'
import { useContentSourceStore } from '~/stores/contentSource'
import AnimatedFlame from '~/components/icons/AnimatedFlame.vue'
import AnimatedCompass from '~/components/icons/AnimatedCompass.vue'
import AnimatedBookmark from '~/components/icons/AnimatedBookmark.vue'
import AnimatedHistory from '~/components/icons/AnimatedHistory.vue'

const route = useRoute()
const bookmarksStore = useBookmarksStore()
const historyStore = useHistoryStore()
const contentSourceStore = useContentSourceStore()

const flameRef = ref<InstanceType<typeof AnimatedFlame> | null>(null)
const compassRef = ref<InstanceType<typeof AnimatedCompass> | null>(null)
const bookmarkRef = ref<InstanceType<typeof AnimatedBookmark> | null>(null)
const historyRef = ref<InstanceType<typeof AnimatedHistory> | null>(null)

const triggerIcon = (tab: 'home' | 'catalog' | 'bookmarks' | 'history') => {
  if (tab === 'home') flameRef.value?.trigger()
  else if (tab === 'catalog') compassRef.value?.trigger()
  else if (tab === 'bookmarks') bookmarkRef.value?.trigger()
  else if (tab === 'history') historyRef.value?.trigger()
}

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
        :class="isHomeActive ? [contentSourceStore.accentText, 'font-bold'] : 'text-zinc-400 hover:text-zinc-200 font-medium'"
        @click="triggerIcon('home')"
      >
        <AnimatedFlame
          ref="flameRef"
          :size="20"
          :active="isHomeActive"
          :class="isHomeActive ? contentSourceStore.accentText : 'text-zinc-400'"
        />
        <span class="text-[11px] leading-tight">Главная</span>
        <span
          v-if="isHomeActive"
          class="absolute -bottom-1 w-5 h-0.5 rounded-full"
          :class="contentSourceStore.accentBg"
        ></span>
      </NuxtLink>

      <!-- 2. Catalog -->
      <NuxtLink
        to="/catalog"
        class="flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all active:scale-90 relative"
        :class="isCatalogActive ? [contentSourceStore.accentText, 'font-bold'] : 'text-zinc-400 hover:text-zinc-200 font-medium'"
        @click="triggerIcon('catalog')"
      >
        <AnimatedCompass
          ref="compassRef"
          :size="20"
          :active="isCatalogActive"
          :class="isCatalogActive ? contentSourceStore.accentText : 'text-zinc-400'"
        />
        <span class="text-[11px] leading-tight">Каталог</span>
        <span
          v-if="isCatalogActive"
          class="absolute -bottom-1 w-5 h-0.5 rounded-full"
          :class="contentSourceStore.accentBg"
        ></span>
      </NuxtLink>

      <!-- 3. Bookmarks -->
      <NuxtLink
        to="/bookmarks"
        class="flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all active:scale-90 relative"
        :class="isBookmarksActive ? [contentSourceStore.accentText, 'font-bold'] : 'text-zinc-400 hover:text-zinc-200 font-medium'"
        @click="triggerIcon('bookmarks')"
      >
        <div class="relative">
          <AnimatedBookmark
            ref="bookmarkRef"
            :size="20"
            :active="isBookmarksActive"
            :class="isBookmarksActive ? contentSourceStore.accentText : 'text-zinc-400'"
          />
          <span
            v-if="bookmarksCount > 0"
            class="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-1 text-[9px] font-black rounded-full text-zinc-950 flex items-center justify-center leading-none"
            :class="contentSourceStore.accentBg"
          >
            {{ bookmarksCount > 99 ? '99+' : bookmarksCount }}
          </span>
        </div>
        <span class="text-[11px] leading-tight">Закладки</span>
        <span
          v-if="isBookmarksActive"
          class="absolute -bottom-1 w-5 h-0.5 rounded-full"
          :class="contentSourceStore.accentBg"
        ></span>
      </NuxtLink>

      <!-- 4. History -->
      <NuxtLink
        to="/bookmarks?tab=history"
        class="flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all active:scale-90 relative"
        :class="isHistoryActive ? [contentSourceStore.accentText, 'font-bold'] : 'text-zinc-400 hover:text-zinc-200 font-medium'"
        @click="triggerIcon('history')"
      >
        <div class="relative">
          <AnimatedHistory
            ref="historyRef"
            :size="20"
            :active="isHistoryActive"
            :class="isHistoryActive ? contentSourceStore.accentText : 'text-zinc-400'"
          />
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
          class="absolute -bottom-1 w-5 h-0.5 rounded-full"
          :class="contentSourceStore.accentBg"
        ></span>
      </NuxtLink>
    </div>
  </nav>
</template>
