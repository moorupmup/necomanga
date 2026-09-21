<script setup lang="ts">
import { useRouter } from 'vue-router'
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  ArrowUpCircle,
  Smartphone,
  Sparkles,
  Info
} from 'lucide-vue-next'
import { useAppUpdate } from '~/composables/useAppUpdate'

const router = useRouter()
const {
  isChecking,
  hasUpdate,
  latestRelease,
  manualCheckFeedback,
  currentVersion,
  currentCommit,
  checkForUpdates,
  openModal
} = useAppUpdate()

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}

const handleCheck = () => {
  if (hasUpdate.value) {
    openModal()
  } else {
    checkForUpdates(false)
  }
}
</script>

<template>
  <div class="w-full max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-12 space-y-6 sm:space-y-8">
    
    <!-- Top Navigation / Title -->
    <div class="flex items-center gap-3">
      <button
        type="button"
        class="p-2 sm:p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors flex items-center justify-center"
        title="Назад"
        @click="goBack"
      >
        <ArrowLeft class="w-5 h-5" />
      </button>
      <div>
        <h1 class="text-xl sm:text-2xl font-black text-white tracking-tight">Настройки</h1>
        <p class="text-xs sm:text-sm text-zinc-400">Параметры и информация о приложении</p>
      </div>
    </div>

    <!-- Main Settings Container -->
    <div class="space-y-4">
      
      <!-- Section: Сведения о версии -->
      <div class="rounded-2xl sm:rounded-3xl bg-zinc-900/70 border border-zinc-800/80 p-5 sm:p-8 backdrop-blur-sm shadow-xl space-y-6">
        
        <!-- Section Header -->
        <div class="flex items-center gap-3 pb-4 border-b border-zinc-800/80">
          <div class="p-2 sm:p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400">
            <Info class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-bold text-white">Сведения о версии</h2>
            <p class="text-xs text-zinc-400">Информация о текущей сборке и обновлениях</p>
          </div>
        </div>

        <!-- App Profile / Mascot Card -->
        <div class="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 bg-zinc-950/60 rounded-2xl p-5 border border-zinc-850">
          <div class="relative shrink-0">
            <img
              src="/icon-192.png"
              alt="NecoManga Mascot"
              class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover shadow-lg border border-zinc-800 bg-zinc-900"
            />
            <div class="absolute -bottom-1 -right-1 p-1 rounded-full bg-zinc-900 border border-zinc-700">
              <Sparkles class="w-3.5 h-3.5 text-amber-400" />
            </div>
          </div>

          <div class="flex-1 text-center sm:text-left space-y-2">
            <div class="flex flex-col sm:flex-row sm:items-center gap-2">
              <span class="text-xl font-black text-white tracking-wide">
                N.ECO<span class="text-amber-400 font-light">MANGA</span>
              </span>
              <span class="inline-flex items-center self-center sm:self-auto px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400/10 text-amber-400 border border-amber-400/20">
                v{{ currentVersion }}
              </span>
            </div>

            <p class="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Удобное приложение для чтения манги, манхвы и маньхуа онлайн с автоматическим обновлением.
            </p>

            <div class="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1 text-xs text-zinc-400">
              <span v-if="currentCommit" class="inline-flex items-center gap-1">
                <span class="text-zinc-400 font-medium">Сборка:</span>
                <code class="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 font-mono text-[11px] border border-zinc-800">
                  {{ currentCommit.substring(0, 7) }}
                </code>
              </span>
              <span class="inline-flex items-center gap-1">
                <Smartphone class="w-3.5 h-3.5 text-zinc-400" />
                <span>Android & Web</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Status Card -->
        <div class="p-4 rounded-xl border transition-all"
          :class="[
            hasUpdate
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              : 'bg-zinc-950/40 border-zinc-800/80 text-zinc-300'
          ]"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div v-if="isChecking" class="p-2 rounded-lg bg-zinc-900 text-amber-400 shrink-0">
                <RefreshCw class="w-5 h-5 animate-spin" />
              </div>
              <div v-else-if="hasUpdate" class="p-2 rounded-lg bg-amber-400/20 text-amber-400 shrink-0">
                <ArrowUpCircle class="w-5 h-5" />
              </div>
              <div v-else class="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                <CheckCircle2 class="w-5 h-5" />
              </div>

              <div>
                <p class="text-sm font-bold text-white">
                  <span v-if="isChecking">Идёт проверка обновлений...</span>
                  <span v-else-if="hasUpdate">Доступна новая версия: v{{ latestRelease?.version || '' }}</span>
                  <span v-else>У вас установлена последняя версия</span>
                </p>
                <p class="text-xs text-zinc-400 mt-0.5">
                  <span v-if="isChecking">Опрашиваем GitHub Releases...</span>
                  <span v-else-if="hasUpdate">
                    {{ latestRelease?.name || 'Свежее обновление готово к установке' }}
                  </span>
                  <span v-else-if="manualCheckFeedback">
                    {{ manualCheckFeedback }}
                  </span>
                  <span v-else>
                    Приложение обновлено до самого актуального релиза
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          
          <!-- If update available: Download/Install button -->
          <button
            v-if="hasUpdate"
            type="button"
            class="flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-zinc-950 font-bold text-sm shadow-lg shadow-amber-400/20 transition-all cursor-pointer"
            @click="openModal"
          >
            <ArrowUpCircle class="w-5 h-5" />
            <span>Установить обновление v{{ latestRelease?.version }}</span>
          </button>

          <!-- Check for updates button -->
          <button
            type="button"
            :disabled="isChecking"
            :class="[
              'flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold transition-all border cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed',
              hasUpdate
                ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                : 'flex-1 bg-zinc-100 hover:bg-white text-zinc-950 border-white shadow-md active:scale-[0.98]'
            ]"
            @click="handleCheck"
          >
            <RefreshCw :class="['w-4 h-4', isChecking ? 'animate-spin text-amber-400' : '']" />
            <span>{{ isChecking ? 'Проверка...' : 'Проверить обновления' }}</span>
          </button>
        </div>

      </div>

    </div>

  </div>
</template>
