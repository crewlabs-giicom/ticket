export default defineNuxtConfig({
  devtools: { enabled: false },
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', '@vueuse/nuxt'],
  css: ['~/assets/css/main.css'],
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
