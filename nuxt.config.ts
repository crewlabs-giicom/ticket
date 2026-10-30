export default defineNuxtConfig({
  devtools: { enabled: false },
  app: {
    head: {
      title: 'Shadow Care',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
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
    // Private (server only). Override lewat NUXT_ROUTEROS_*; password tidak pernah dikirim ke client.
    routeros: {
      host: '',
      port: 8729,
      user: '',
      password: '',
      tls: true,
      rejectUnauthorized: false,
      cacheMs: 3000,
      mock: false,
      // Kualitas koneksi WAN (ping dari router). Override lewat NUXT_ROUTEROS_PING_*.
      pingTargets: '1.1.1.1,8.8.8.8',
      pingIntervalSec: 30,
      pingLatencyWarn: 100,
      pingLatencyBad: 200,
      pingJitterWarn: 30,
      pingJitterBad: 60,
      pingLossWarn: 2,
      pingLossBad: 5
    },
    public: {
      appName: process.env.APP_NAME || 'Shadow Care'
    }
  },
  nitro: {
    experimental: { wasm: false }
  },
  ssr: true
})
