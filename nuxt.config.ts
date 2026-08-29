export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  modules: [
    '@nuxt/ui',
    '@nuxt/eslint',
    '@nuxt/image',
    '@nuxtjs/supabase',
    '@vite-pwa/nuxt',
  ],
  supabase: {
    redirect: false,
    // Authenticated pages need the Supabase session during SSR. Public pages
    // remain accessible because route protection is explicit per page.
    useSsrCookies: true,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
    },
  },
  css: ['~/assets/css/main.css'],
  typescript: {
    strict: true,
    // The dedicated `pnpm typecheck` gate runs vue-tsc without the Vite watcher.
    typeCheck: false,
  },
  runtimeConfig: {
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    public: {
      appEnv: process.env.APP_ENV || 'development',
      appBaseUrl: process.env.APP_BASE_URL || 'http://127.0.0.1:3000',
      supabase: {
        url: process.env.NUXT_PUBLIC_SUPABASE_URL || '',
        key: process.env.NUXT_PUBLIC_SUPABASE_KEY || '',
      },
    },
  },
  nitro: {
    prerender: {
      autoSubfolderIndex: false,
    },
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'VRSUS',
      short_name: 'VRSUS',
      description: 'Il centro digitale per gli eventi e le esperienze VRSUS.',
      theme_color: '#08090d',
      background_color: '#08090d',
      display: 'standalone',
      lang: 'it-IT',
      start_url: '/',
    },
    workbox: {
      navigateFallbackDenylist: [/^\/admin/],
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'it' },
      meta: [
        { name: 'theme-color', content: '#08090d' },
        { name: 'color-scheme', content: 'dark' },
      ],
      link: [{ rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
    },
    pageTransition: { name: 'page', mode: 'out-in' },
  },
})
