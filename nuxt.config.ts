export default defineNuxtConfig({
  devtools: { enabled: false },
  app: {
    head: {
      title: 'Shadow Care',
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }]
    }
  },
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', '@vueuse/nuxt', '@nuxtjs/i18n'],
  css: ['~/assets/css/main.css', 'driver.js/dist/driver.css'],
  tailwindcss: { exposeConfig: true },
  i18n: {
    restructureDir: false,
    langDir: 'locales',
    strategy: 'no_prefix',
    defaultLocale: 'id',
    locales: [
      { code: 'id', name: 'Indonesia', file: 'id.json' },
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'zh', name: '中文', file: 'zh.json' }
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_locale',
      redirectOn: 'no prefix'
    }
  },
  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET || 'ticketing-secret-key-2024',
    public: {
      appName: process.env.APP_NAME || 'Shadow Care'
    }
  },
  nitro: {
    experimental: { wasm: false }
  },
  ssr: true
})
