// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },

  // SPA mode for pure static hosting
  ssr: false,

  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    '@vueuse/nuxt',
  ],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      appVersion: process.env.VITE_APP_VERSION || '1.1.0',
      buildCommit: process.env.VITE_APP_COMMIT || '',
      buildTime: process.env.VITE_APP_BUILD_TIME || new Date().toISOString()
    }
  },

  app: {
    head: {
      title: 'N.ECOMANGA — Чтение манги, манхвы и маньхуа онлайн',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no' },
        { name: 'description', content: 'Огромный каталог популярной манги, корейской манхвы и китайской маньхуа онлайн.' },
        { name: 'theme-color', content: '#09090b' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }
      ]
    }
  },

  nitro: {
    preset: 'static',
    prerender: {
      crawlLinks: false,
      routes: ['/'],
    },
  }
})
