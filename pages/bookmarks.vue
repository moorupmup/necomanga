<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
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
import { registerBackHandler } from '~/composables/useBackButton'
import AsyncImage from '~/components/AsyncImage.vue'

const route = useRoute()
const bookmarksStore = useBookmarksStore()
const historyStore = useHistoryStore()

const activeTab = ref<'bookmarks' | 'history'>((route.query.tab as any) === 'history' ? 'history' : 'bookmarks')
const activeStatusFilter = ref<string>('all')
const showClearHistoryConfirm = ref(false)

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

let unregisterBack: (() => void) | null = null

onMounted(() => {
  unregisterBack = registerBackHandler(() => {
    if (showClearHistoryConfirm.value) {
      showClearHistoryConfirm.value = false
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

const confirmClearHistory = () => {
  historyStore.clearHistory()
  showClearHistoryConfirm.value = false
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
        class="text-xs sm:text-sm text-zinc-400 hover:text-rose-400 active:text-rose-400 flex items-center gap-1.5 font-semibold transition-colors self-end sm:self-auto py-1 px-2 rounded-lg active:bg-zinc-900"
        @click="showClearHistoryConfirm = true"
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
              <NuxtLink :to="`/manga/${b.mangaId}`" class="text-xs sm:text-sm text-zinc-300 hover:text-white font-bold py-1">
                Открыть
              </NuxtLink>
              <button
                type="button"
                class="min-w-[40px] min-h-[40px] flex items-center justify-center -mr-2 -mb-1 rounded-xl text-zinc-400 hover:text-rose-400 active:text-rose-400 active:bg-rose-950/30 transition-colors"
                title="Удалить из закладок"
                @click="bookmarksStore.removeBookmark(b.mangaId)"
              >
                <Trash2 class="w-4 h-4" />
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
              class="w-full sm:w-auto min-h-[44px] px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-amber-400 active:bg-amber-300 text-zinc-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 transition-all active:scale-[0.98]"
            >
              <BookOpen class="w-4 h-4" />
              <span>Продолжить</span>
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

    <!-- Clear History Confirmation Modal -->
    <Teleport to="body">
      <div
        v-if="showClearHistoryConfirm"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none"
      >
        <!-- Backdrop -->
        <div
          class="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
          @click="showClearHistoryConfirm = false"
        ></div>

        <!-- Dialog -->
        <div class="relative w-full max-w-sm bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 pb-safe animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
              <Trash2 class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-white">Очистить историю?</h3>
              <p class="text-xs text-zinc-400 mt-0.5">Вся история прочитанных глав будет удалена.</p>
            </div>
          </div>

          <div class="flex gap-2.5 pt-2">
            <button
              type="button"
              class="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 active:scale-95 transition-all"
              @click="showClearHistoryConfirm = false"
            >
              Отмена
            </button>
            <button
              type="button"
              class="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 active:scale-95 transition-all"
              @click="confirmClearHistory"
            >
              Очистить
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
