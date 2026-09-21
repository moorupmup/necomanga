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
  <div class="w-full px-4 sm:px-8 xl:px-12 py-10 space-y-10">
    
    <!-- Header Tabs -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-900 pb-5 gap-4">
      <div class="flex items-center gap-3 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        <button
          type="button"
          :class="[
            'flex items-center gap-2.5 px-6 py-3 rounded-2xl text-base font-bold transition-all border whitespace-nowrap',
            activeTab === 'bookmarks'
              ? 'bg-zinc-100 text-zinc-950 border-white shadow-lg'
              : 'bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-900 border-zinc-800'
          ]"
          @click="activeTab = 'bookmarks'"
        >
          <Bookmark class="w-5 h-5" />
          <span>Закладки ({{ allBookmarks.length }})</span>
        </button>

        <button
          type="button"
          :class="[
            'flex items-center gap-2.5 px-6 py-3 rounded-2xl text-base font-bold transition-all border whitespace-nowrap',
            activeTab === 'history'
              ? 'bg-zinc-100 text-zinc-950 border-white shadow-lg'
              : 'bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-900 border-zinc-800'
          ]"
          @click="activeTab = 'history'"
        >
          <History class="w-5 h-5" />
          <span>Вы читали ({{ historyStore.history.length }})</span>
        </button>
      </div>

      <button
        v-if="activeTab === 'history' && historyStore.history.length > 0"
        type="button"
        class="text-sm text-zinc-400 hover:text-rose-400 flex items-center gap-2 font-semibold transition-colors self-end sm:self-auto"
        @click="historyStore.clearHistory"
      >
        <Trash2 class="w-4 h-4" />
        <span>Очистить историю</span>
      </button>
    </div>

    <!-- TAB 1: BOOKMARKS -->
    <div v-if="activeTab === 'bookmarks'" class="space-y-8">
      <!-- Status Filter Tabs -->
      <div class="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          :class="[
            'px-4 py-2 rounded-xl text-sm font-semibold transition-colors border',
            activeStatusFilter === 'all'
              ? 'bg-zinc-100 text-zinc-950 border-white font-bold'
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
            'px-4 py-2 rounded-xl text-sm font-semibold transition-colors border',
            activeStatusFilter === key
              ? 'bg-zinc-100 text-zinc-950 border-white font-bold'
              : 'bg-zinc-900/60 text-zinc-400 hover:text-white border-zinc-800'
          ]"
          @click="activeStatusFilter = key"
        >
          {{ label }}
        </button>
      </div>

      <!-- Bookmarks Large Cards Grid (8 per row) -->
      <div v-if="filteredBookmarks.length > 0" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 min-[1120px]:grid-cols-8 xl:grid-cols-8 gap-3.5 sm:gap-4">
        <div
          v-for="b in filteredBookmarks"
          :key="b.mangaId"
          class="group relative flex flex-col bg-zinc-900/40 hover:bg-zinc-900/80 rounded-2xl overflow-hidden border border-zinc-800/80 hover:border-zinc-700 transition-all shadow-lg"
        >
          <NuxtLink :to="`/manga/${b.mangaId}`" class="relative aspect-[2/3] w-full overflow-hidden bg-zinc-950">
            <AsyncImage
              :src="b.coverUrl"
              :alt="b.title"
              aspect-class="aspect-[2/3]"
              img-class="group-hover:scale-105"
            />
            <div class="absolute top-3 left-3">
              <span class="glass-badge inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-lg text-zinc-100 shadow-sm">
                {{ BOOKMARK_LABELS[b.status] }}
              </span>
            </div>
          </NuxtLink>

          <div class="p-4 flex flex-col justify-between flex-1 gap-3 bg-zinc-900/20">
            <NuxtLink :to="`/manga/${b.mangaId}`" class="font-bold text-base text-zinc-100 hover:text-white line-clamp-2 leading-snug">
              {{ b.title }}
            </NuxtLink>

            <div class="flex items-center justify-between pt-2.5 border-t border-zinc-800/60">
              <NuxtLink :to="`/manga/${b.mangaId}`" class="text-sm text-zinc-400 hover:text-white font-semibold">
                Открыть тайтл
              </NuxtLink>
              <button
                type="button"
                class="text-zinc-500 hover:text-rose-400 p-1.5 transition-colors"
                title="Удалить из закладок"
                @click="bookmarksStore.removeBookmark(b.mangaId)"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-24 text-zinc-500 space-y-3 bg-zinc-900/20 rounded-3xl border border-zinc-800/60">
        <Bookmark class="w-14 h-14 mx-auto opacity-40 text-zinc-400" />
        <p class="font-bold text-lg text-zinc-300">В этой категории пока нет закладок</p>
        <NuxtLink to="/catalog" class="inline-block text-sm sm:text-base font-bold text-zinc-200 hover:underline pt-2">
          Перейти в каталог манги →
        </NuxtLink>
      </div>
    </div>

    <!-- TAB 2: HISTORY (ВЫ ЧИТАЛИ) -->
    <div v-else class="space-y-6">
      <div v-if="historyStore.history.length > 0" class="divide-y divide-zinc-900 bg-zinc-900/40 border border-zinc-800/80 rounded-3xl overflow-hidden">
        <div
          v-for="item in historyStore.history"
          :key="item.mangaId"
          class="flex flex-col sm:flex-row sm:items-center justify-between p-6 hover:bg-zinc-900/60 gap-4 transition-colors"
        >
          <div class="flex items-center gap-5">
            <img
              :src="item.coverUrl"
              :alt="item.mangaTitle"
              class="w-16 h-24 sm:w-20 sm:h-28 object-cover rounded-xl bg-zinc-900 flex-shrink-0 border border-zinc-800"
            />
            <div class="space-y-1.5">
              <NuxtLink :to="`/manga/${item.mangaId}`" class="font-bold text-lg sm:text-xl text-zinc-100 hover:text-white leading-snug">
                {{ item.mangaTitle }}
              </NuxtLink>
              <div class="text-sm sm:text-base text-zinc-300 flex items-center gap-2 font-medium">
                <span class="text-white font-bold">Глава {{ item.chapterNumber }}</span>
                <span v-if="item.chapterTitle" class="text-zinc-400">— {{ item.chapterTitle }}</span>
              </div>
              <div class="text-xs sm:text-sm text-zinc-400 flex items-center gap-1.5 mt-1">
                <Clock class="w-4 h-4 text-zinc-500" />
                <span>{{ formatTimeAgo(item.timestamp) }}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3 self-end sm:self-center">
            <NuxtLink
              :to="`/read/${item.chapterId}`"
              class="px-6 py-3 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-sm sm:text-base flex items-center gap-2.5 shadow-lg transition-all"
            >
              <BookOpen class="w-4 h-4" />
              <span>Продолжить чтение</span>
            </NuxtLink>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-24 text-zinc-500 space-y-3 bg-zinc-900/20 rounded-3xl border border-zinc-800/60">
        <History class="w-14 h-14 mx-auto opacity-40 text-zinc-400" />
        <p class="font-bold text-lg text-zinc-300">История чтения пуста</p>
        <NuxtLink to="/" class="inline-block text-sm sm:text-base font-bold text-zinc-200 hover:underline pt-2">
          Выбрать мангу на главной →
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
