<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  Bookmark,
  History,
  Trash2,
  BookOpen,
  Clock
} from 'lucide-vue-next'
import {
  useBookmarksStore,
  BOOKMARK_LABELS,
  type BookmarkStatus
} from '~/stores/bookmarks'
import { useHistoryStore } from '~/stores/history'
import AsyncImage from '~/components/AsyncImage.vue'

const route = useRoute()
const bookmarksStore = useBookmarksStore()
const historyStore = useHistoryStore()

const activeTab = ref<'bookmarks' | 'history'>((route.query.tab as any) === 'history' ? 'history' : 'bookmarks')
const activeStatusFilter = ref<string>('all')

const allBookmarks = computed(() => Object.values(bookmarksStore.bookmarks))

const filteredBookmarks = computed(() => {
  if (activeStatusFilter.value === 'all') return allBookmarks.value
  return allBookmarks.value.filter(b => b.status === activeStatusFilter.value)
})

const formatTimeAgo = (timestamp: number) => {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 1) return 'Только что'
  if (minutes < 60) return `${minutes} мин. назад`
  if (hours < 24) return `${hours} ч. назад`
  return `${days} дн. назад`
}
</script>

<template>
  <div class="w-full px-3.5 sm:px-8 xl:px-12 py-4 sm:py-10 space-y-6 sm:space-y-10">
    
    <!-- Header Tabs -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-900 pb-3 sm:pb-5 gap-3">
      <div class="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 sm:pb-0 scrollbar-none -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
        <button
          type="button"
          :class="[
            'flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-base font-bold transition-all border whitespace-nowrap shrink-0',
            activeTab === 'bookmarks'
              ? 'bg-zinc-100 text-zinc-950 border-white shadow-lg'
              : 'bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-900 border-zinc-800'
          ]"
          @click="activeTab = 'bookmarks'"
        >
          <Bookmark class="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Закладки ({{ allBookmarks.length }})</span>
        </button>

        <button
          type="button"
          :class="[
            'flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-base font-bold transition-all border whitespace-nowrap shrink-0',
            activeTab === 'history'
              ? 'bg-zinc-100 text-zinc-950 border-white shadow-lg'
              : 'bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-900 border-zinc-800'
          ]"
          @click="activeTab = 'history'"
        >
          <History class="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Вы читали ({{ historyStore.history.length }})</span>
        </button>
      </div>

      <button
        v-if="activeTab === 'history' && historyStore.history.length > 0"
        type="button"
        class="text-xs sm:text-sm text-zinc-400 hover:text-rose-400 flex items-center gap-1.5 font-semibold transition-colors self-end sm:self-auto"
        @click="historyStore.clearHistory"
      >
        <Trash2 class="w-3.5 h-3.5" />
        <span>Очистить историю</span>
      </button>
    </div>

    <!-- TAB 1: BOOKMARKS -->
    <div v-if="activeTab === 'bookmarks'" class="space-y-5 sm:space-y-8">
      <!-- Status Filter Tabs -->
      <div class="flex items-center gap-1.5 sm:gap-2.5 overflow-x-auto pb-1 scrollbar-none -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
        <button
          type="button"
          :class="[
            'px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors border shrink-0',
            activeStatusFilter === 'all'
              ? 'bg-zinc-100 text-zinc-950 border-white'
              : 'bg-zinc-900/60 text-zinc-400 hover:text-white border-zinc-800'
          ]"
          @click="activeStatusFilter === 'all'"
        >
          Все ({{ allBookmarks.length }})
        </button>

        <button
          v-for="(label, key) in BOOKMARK_LABELS"
          :key="key"
          type="button"
          :class="[
            'px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors border shrink-0',
            activeStatusFilter === key
              ? 'bg-zinc-100 text-zinc-950 border-white'
              : 'bg-zinc-900/60 text-zinc-400 hover:text-white border-zinc-800'
          ]"
          @click="activeStatusFilter = key"
        >
          {{ label }}
        </button>
      </div>

      <!-- Bookmarks Grid (2 cols on mobile, 8 on wide desktop) -->
      <div v-if="filteredBookmarks.length > 0" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 min-[1120px]:grid-cols-8 xl:grid-cols-8 gap-2.5 sm:gap-4">
        <div
          v-for="b in filteredBookmarks"
          :key="b.mangaId"
          class="group relative flex flex-col bg-zinc-900/40 hover:bg-zinc-900/80 rounded-2xl overflow-hidden border border-zinc-800/80 transition-all shadow-lg"
        >
          <NuxtLink :to="`/manga/${b.mangaId}`" class="relative aspect-[2/3] w-full overflow-hidden bg-zinc-950">
            <AsyncImage
              :src="b.coverUrl"
              :alt="b.title"
              aspect-class="aspect-[2/3]"
              img-class="group-hover:scale-105"
            />
            <div class="absolute top-2 sm:top-3 left-2 sm:left-3">
              <span class="glass-badge inline-flex items-center px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-semibold rounded-md sm:rounded-lg text-zinc-100 shadow-sm">
                {{ BOOKMARK_LABELS[b.status] }}
              </span>
            </div>
          </NuxtLink>

          <div class="p-2.5 sm:p-4 flex flex-col justify-between flex-1 gap-2 sm:gap-3 bg-zinc-900/20">
            <NuxtLink :to="`/manga/${b.mangaId}`" class="font-bold text-xs sm:text-base text-zinc-100 hover:text-white line-clamp-2 leading-snug">
              {{ b.title }}
            </NuxtLink>

            <div class="flex items-center justify-between pt-1.5 sm:pt-2.5 border-t border-zinc-800/60">
              <NuxtLink :to="`/manga/${b.mangaId}`" class="text-xs sm:text-sm text-zinc-400 hover:text-white font-semibold">
                Открыть
              </NuxtLink>
              <button
                type="button"
                class="text-zinc-500 hover:text-rose-400 p-1 transition-colors"
                title="Удалить из закладок"
                @click="bookmarksStore.removeBookmark(b.mangaId)"
              >
                <Trash2 class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-16 sm:py-24 text-zinc-500 space-y-3 bg-zinc-900/20 rounded-2xl sm:rounded-3xl border border-zinc-800/60 p-6">
        <Bookmark class="w-12 h-12 sm:w-14 sm:h-14 mx-auto opacity-40 text-zinc-400" />
        <p class="font-bold text-base sm:text-lg text-zinc-300">В этой категории пока нет закладок</p>
        <NuxtLink to="/catalog" class="inline-block text-xs sm:text-base font-bold text-zinc-200 hover:underline pt-2">
          Перейти в каталог манги →
        </NuxtLink>
      </div>
    </div>

    <!-- TAB 2: HISTORY (ВЫ ЧИТАЛИ) -->
    <div v-else class="space-y-4 sm:space-y-6">
      <div v-if="historyStore.history.length > 0" class="divide-y divide-zinc-900 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl sm:rounded-3xl overflow-hidden">
        <div
          v-for="item in historyStore.history"
          :key="item.mangaId"
          class="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-6 hover:bg-zinc-900/60 gap-3 sm:gap-4 transition-colors"
        >
          <div class="flex items-center gap-3 sm:gap-5 min-w-0">
            <img
              :src="item.coverUrl"
              :alt="item.mangaTitle"
              class="w-14 h-20 sm:w-20 sm:h-28 object-cover rounded-xl bg-zinc-900 flex-shrink-0 border border-zinc-800"
            />
            <div class="space-y-1 min-w-0">
              <NuxtLink :to="`/manga/${item.mangaId}`" class="font-bold text-sm sm:text-xl text-zinc-100 hover:text-white leading-snug truncate block">
                {{ item.mangaTitle }}
              </NuxtLink>
              <div class="text-xs sm:text-base text-zinc-300 flex items-center gap-1.5 sm:gap-2 font-medium">
                <span class="text-white font-bold">Глава {{ item.chapterNumber }}</span>
                <span v-if="item.chapterTitle" class="text-zinc-400 truncate text-xs sm:text-sm">— {{ item.chapterTitle }}</span>
              </div>
              <div class="text-[11px] sm:text-sm text-zinc-400 flex items-center gap-1 mt-0.5">
                <Clock class="w-3.5 h-3.5 text-zinc-500" />
                <span>{{ formatTimeAgo(item.timestamp) }}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end sm:self-center pt-1 sm:pt-0">
            <NuxtLink
              :to="`/read/${item.chapterId}`"
              class="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs sm:text-base flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
            >
              <BookOpen class="w-4 h-4" />
              <span>Продолжить чтение</span>
            </NuxtLink>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-16 sm:py-24 text-zinc-500 space-y-3 bg-zinc-900/20 rounded-2xl sm:rounded-3xl border border-zinc-800/60 p-6">
        <History class="w-12 h-12 sm:w-14 sm:h-14 mx-auto opacity-40 text-zinc-400" />
        <p class="font-bold text-base sm:text-lg text-zinc-300">История чтения пуста</p>
        <NuxtLink to="/" class="inline-block text-xs sm:text-base font-bold text-zinc-200 hover:underline pt-2">
          Выбрать мангу на главной →
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
