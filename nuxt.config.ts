export default defineNuxtConfig({
  devtools: { enabled: false },
  app: {
    head: {
      title: 'Shadow Care',
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }]
    }
  },
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', '@vueuse/nuxt'],
  css: ['~/assets/css/main.css', 'driver.js/dist/driver.css'],
  tailwindcss: { exposeConfig: true },
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
