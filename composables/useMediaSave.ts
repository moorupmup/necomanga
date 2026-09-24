import { registerPlugin, Capacitor } from '@capacitor/core'
import { isNativePlatform } from '~/composables/useReManga'

export interface SaveImageOptions {
  src: string
  filename: string
  albumName?: string
}

export interface SaveImageResult {
  success: boolean
  message: string
  uri?: string
}

export interface MediaSavePlugin {
  saveImageToGallery(options: {
    base64?: string
    url?: string
    filename: string
    mimeType?: string
    albumName?: string
  }): Promise<{ success: boolean; uri?: string; album?: string; filename?: string }>
}

const MediaSave = registerPlugin<MediaSavePlugin>('MediaSave')

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const res = reader.result as string
      const base64 = res.includes(',') ? res.split(',')[1] : res
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export const useMediaSave = () => {
  const isNative = () => {
    if (typeof window === 'undefined') return false
    return Capacitor.isNativePlatform() || isNativePlatform()
  }

  const saveImage = async (options: SaveImageOptions): Promise<SaveImageResult> => {
    const { src, filename, albumName = 'NecoManga' } = options

    if (isNative()) {
      let base64: string | undefined
      let mimeType = 'image/jpeg'

      if (filename.toLowerCase().endsWith('.png')) mimeType = 'image/png'
      else if (filename.toLowerCase().endsWith('.webp')) mimeType = 'image/webp'

      // Attempt 1: Fetch as blob from webview context
      try {
        const res = await fetch(src)
        if (res.ok) {
          const blob = await res.blob()
          if (blob.type) mimeType = blob.type
          base64 = await blobToBase64(blob)
        }
      } catch (e) {
        // Fetch failed in webview, native plugin will download directly with ReManga headers
      }

      try {
        const res = await MediaSave.saveImageToGallery({
          base64,
          url: src,
          filename,
          mimeType,
          albumName
        })

        return {
          success: true,
          message: `Сохранено в Галерею (${albumName})`,
          uri: res.uri
        }
      } catch (err: any) {
        throw new Error(err?.message || 'Не удалось сохранить в галерею')
      }
    } else {
      // Browser environment (Desktop / Mobile web): Download file
      try {
        const res = await fetch(src)
        if (!res.ok) throw new Error('Fetch failed')
        const blob = await res.blob()
        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1500)
        return {
          success: true,
          message: 'Страница успешно сохранена'
        }
      } catch {
        // Fallback: direct anchor download
        const a = document.createElement('a')
        a.href = src
        a.download = filename
        a.target = '_blank'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        return {
          success: true,
          message: 'Изображение открыто для сохранения'
        }
      }
    }
  }

  return {
    isNative,
    saveImage
  }
}
