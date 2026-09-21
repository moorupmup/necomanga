import { ref, computed } from 'vue'
import { registerPlugin } from '@capacitor/core'
import { isNativePlatform } from '~/composables/useReManga'

export interface DownloadProgress {
  percent: number
  downloaded: number
  total: number
}

export interface AppUpdatePlugin {
  canRequestInstall(): Promise<{ granted: boolean }>
  openInstallPermissionSettings(): Promise<void>
  downloadAndInstall(options: { url: string }): Promise<{ success: boolean }>
  addListener(
    eventName: 'downloadProgress',
    listenerFunc: (progress: DownloadProgress) => void
  ): Promise<any>
  removeAllListeners(): Promise<void>
}

// Register native Capacitor plugin
const AppUpdate = registerPlugin<AppUpdatePlugin>('AppUpdate')

// Global shared state for updater
const isChecking = ref(false)
const hasUpdate = ref(false)
const isModalOpen = ref(false)
const latestRelease = ref<{
  name: string
  version: string
  body: string
  publishedAt: string
  commit: string
  apkUrl: string
  apkSize?: number
} | null>(null)

const isDownloading = ref(false)
const isInstalling = ref(false)
const downloadPercent = ref(0)
const downloadLoadedMB = ref('0')
const downloadTotalMB = ref('0')
const error = ref<string | null>(null)
const needsPermission = ref(false)
const manualCheckFeedback = ref<string | null>(null)

export const useAppUpdate = () => {
  const config = useRuntimeConfig()
  const currentVersion = computed(() => (config.public.appVersion as string) || '1.0.0')
  const currentCommit = computed(() => (config.public.buildCommit as string) || '')

  /**
   * Check GitHub Releases for newer version
   */
  const checkForUpdates = async (silent: boolean = false) => {
    if (isChecking.value) return
    isChecking.value = true
    manualCheckFeedback.value = null
    error.value = null

    try {
      const res = await fetch('https://api.github.com/repos/moorupmup/necomanga/releases/latest', {
        headers: { 'User-Agent': 'NecoMangaApp' }
      })

      if (!res.ok) {
        throw new Error(`GitHub API error: ${res.status}`)
      }

      const data = await res.json()
      const apkAsset = data.assets?.find((a: any) => a.name?.endsWith('.apk'))

      if (!apkAsset) {
        if (!silent) manualCheckFeedback.value = 'В релизе не найден установочный APK файл'
        return
      }

      const releaseCommit = (data.target_commitish || '').trim()
      const myCommit = (currentCommit.value || '').trim()

      // Extract version name or tag
      const releaseName = data.name || data.tag_name || 'Свежая сборка'
      const versionMatch = releaseName.match(/v?(\d+\.\d+\.\d+)/i)
      const releaseVersion = versionMatch ? versionMatch[1] : (data.tag_name || '1.1.0')

      // Compare:
      // 1. By commit SHA if both are known and non-empty
      // 2. Or fallback by published date / version difference
      let isNewer = false

      if (myCommit && releaseCommit) {
        isNewer = !myCommit.startsWith(releaseCommit) && !releaseCommit.startsWith(myCommit)
      } else {
        // If running in dev without commit SHA, compare version
        isNewer = releaseVersion !== currentVersion.value
      }

      latestRelease.value = {
        name: releaseName,
        version: releaseVersion,
        body: data.body || '',
        publishedAt: data.published_at || '',
        commit: releaseCommit.substring(0, 7),
        apkUrl: apkAsset.browser_download_url,
        apkSize: apkAsset.size
      }

      if (isNewer) {
        hasUpdate.value = true
        isModalOpen.value = true
      } else {
        hasUpdate.value = false
        if (!silent) {
          manualCheckFeedback.value = 'У вас установлена последняя актуальная версия'
          setTimeout(() => { manualCheckFeedback.value = null }, 3500)
        }
      }
    } catch (err: any) {
      console.warn('Update check failed:', err)
      if (!silent) {
        manualCheckFeedback.value = 'Не удалось проверить обновления. Проверьте интернет.'
        setTimeout(() => { manualCheckFeedback.value = null }, 3500)
      }
    } finally {
      isChecking.value = false
    }
  }

  /**
   * Start APK download and system installation
   */
  const startUpdate = async () => {
    if (!latestRelease.value?.apkUrl) return

    error.value = null
    isDownloading.value = true
    downloadPercent.value = 0
    downloadLoadedMB.value = '0'
    downloadTotalMB.value = '0'

    // On standard browser / web, simply open the download URL
    if (!isNativePlatform()) {
      window.open(latestRelease.value.apkUrl, '_blank')
      isDownloading.value = false
      isModalOpen.value = false
      return
    }

    try {
      // Check unknown sources installation permission on Android
      try {
        const perm = await AppUpdate.canRequestInstall()
        if (!perm.granted) {
          needsPermission.value = true
        }
      } catch (e) {
        console.warn('Permission check skipped', e)
      }

      // Listen for download progress
      let progressListener: any = null
      try {
        progressListener = await AppUpdate.addListener('downloadProgress', (progress: DownloadProgress) => {
          if (progress.percent >= 0) {
            downloadPercent.value = Math.min(progress.percent, 100)
          }
          if (progress.downloaded > 0) {
            downloadLoadedMB.value = (progress.downloaded / (1024 * 1024)).toFixed(1)
          }
          if (progress.total > 0) {
            downloadTotalMB.value = (progress.total / (1024 * 1024)).toFixed(1)
          }
        })
      } catch (e) {
        console.warn('Could not attach progress listener', e)
      }

      // Trigger native download & installer
      await AppUpdate.downloadAndInstall({ url: latestRelease.value.apkUrl })
      isInstalling.value = true
    } catch (err: any) {
      console.error('Update failed:', err)
      error.value = err?.message || 'Ошибка скачивания обновления'
    } finally {
      isDownloading.value = false
    }
  }

  /**
   * Open system permission settings for unknown apps
   */
  const openPermissionSettings = async () => {
    try {
      await AppUpdate.openInstallPermissionSettings()
      needsPermission.value = false
    } catch (e: any) {
      console.error('Failed to open settings', e)
    }
  }

  const openModal = () => {
    isModalOpen.value = true
  }

  const closeModal = () => {
    if (!isDownloading.value) {
      isModalOpen.value = false
    }
  }

  return {
    isChecking,
    hasUpdate,
    isModalOpen,
    latestRelease,
    isDownloading,
    isInstalling,
    downloadPercent,
    downloadLoadedMB,
    downloadTotalMB,
    error,
    needsPermission,
    manualCheckFeedback,
    currentVersion,
    currentCommit,
    checkForUpdates,
    startUpdate,
    openPermissionSettings,
    openModal,
    closeModal
  }
}
