// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },

  // Страницы рисует клиент. API живёт в server/ и на Vercel становится
  // serverless-функцией. `nuxt generate` по-прежнему отдаёт статику для Open Server.
  ssr: false,

  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    '@vueuse/nuxt',
  ],

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'N.ECOMANGA — Чтение манги, манхвы и маньхуа онлайн',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Огромный каталог популярной манги, корейской манхвы и китайской маньхуа онлайн.' },
        { name: 'theme-color', content: '#0f172a' }
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }
      ]
    }
  },

  nitro: {
    vercel: {
      functions: {
        maxDuration: 15,
        supportsResponseStreaming: true,
      },
    },
    prerender: {
      crawlLinks: false,
      routes: ['/'],
    },
  }
})
