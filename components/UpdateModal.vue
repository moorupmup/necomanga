<script setup lang="ts">
import {
  Sparkles,
  Download,
  X,
  AlertCircle,
  CheckCircle2,
  Settings,
  RefreshCw,
  ArrowUpCircle
} from 'lucide-vue-next'
import { useAppUpdate } from '~/composables/useAppUpdate'

const {
  isModalOpen,
  latestRelease,
  isDownloading,
  isInstalling,
  downloadPercent,
  downloadLoadedMB,
  downloadTotalMB,
  error,
  needsPermission,
  currentVersion,
  startUpdate,
  openPermissionSettings,
  closeModal
} = useAppUpdate()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isModalOpen && latestRelease"
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
    >
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-black/80 backdrop-blur-sm"
        @click="closeModal"
      ></div>

      <!-- Modal Card -->
      <div
        class="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 text-zinc-100"
      >
        <!-- Close button -->
        <button
          v-if="!isDownloading"
          type="button"
          class="absolute top-5 right-5 p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          @click="closeModal"
        >
          <X class="w-4 h-4" />
        </button>

        <!-- Header -->
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
            <ArrowUpCircle class="w-6 h-6" />
          </div>

          <div class="min-w-0 pr-6">
            <div class="flex items-center gap-2">
              <h3 class="text-lg font-black text-white truncate">Доступно обновление</h3>
              <span class="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-xs font-black border border-amber-500/30">
                v{{ latestRelease.version }}
              </span>
            </div>
            <p class="text-xs text-zinc-400 mt-0.5">
              Текущая версия: v{{ currentVersion }}
            </p>
          </div>
        </div>

        <!-- Release Notes Preview -->
        <div class="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-4 text-xs space-y-2 max-h-48 overflow-y-auto">
          <div class="font-bold text-zinc-300 flex items-center gap-1.5">
            <Sparkles class="w-3.5 h-3.5 text-amber-400" />
            <span>Что нового:</span>
          </div>
          <div class="text-zinc-400 leading-relaxed whitespace-pre-line">
            {{ latestRelease.body || 'Свежее обновление с исправлениями ошибок и улучшениями стабильности.' }}
          </div>
        </div>

        <!-- Permission Notice if needed -->
        <div
          v-if="needsPermission"
          class="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-2"
        >
          <div class="flex items-center gap-2 font-bold">
            <Settings class="w-4 h-4 shrink-0" />
            <span>Требуется разрешение</span>
          </div>
          <p class="text-zinc-400 text-[11px] leading-normal">
            Android требует разрешить установку из этого приложения. Нажмите кнопку ниже и включите тумблер.
          </p>
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg bg-amber-500 text-zinc-950 font-bold text-xs hover:bg-amber-400 transition-colors"
            @click="openPermissionSettings"
          >
            Разрешить в настройках
          </button>
        </div>

        <!-- Error State -->
        <div
          v-if="error"
          class="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2"
        >
          <AlertCircle class="w-4 h-4 shrink-0" />
          <span class="truncate">{{ error }}</span>
        </div>

        <!-- Downloading Progress Bar -->
        <div v-if="isDownloading || isInstalling" class="space-y-2.5">
          <div class="flex items-center justify-between text-xs font-semibold">
            <span class="text-zinc-300">
              {{ isInstalling ? 'Подготовка к установке...' : 'Скачивание обновления...' }}
            </span>
            <span class="text-amber-400 font-black">
              {{ downloadPercent }}%
            </span>
          </div>

          <!-- Bar -->
          <div class="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
            <div
              class="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-150"
              :style="{ width: `${downloadPercent}%` }"
            ></div>
          </div>

          <div v-if="downloadTotalMB !== '0'" class="text-[11px] text-zinc-500 text-right font-medium">
            {{ downloadLoadedMB }} МБ / {{ downloadTotalMB }} МБ
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-3 pt-1">
          <button
            v-if="!isDownloading && !isInstalling"
            type="button"
            class="flex-1 py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]"
            @click="startUpdate"
          >
            <Download class="w-4 h-4" />
            <span>Обновить сейчас</span>
          </button>

          <button
            v-if="!isDownloading && !isInstalling"
            type="button"
            class="py-3.5 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold text-sm border border-zinc-800 transition-colors"
            @click="closeModal"
          >
            Позже
          </button>

          <div
            v-if="isDownloading || isInstalling"
            class="w-full py-3.5 text-center text-xs text-zinc-400 font-medium"
          >
            Пожалуйста, не закрывайте приложение...
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
