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
  // VRSUS esiste solo in versione scura. Senza questa preferenza la classe
  // `dark` non finisce su <html> e i componenti Nuxt UI ripiegano sul tema
  // chiaro: campi bianchi su pagina nera e tendine illeggibili.
  colorMode: {
    preference: 'dark',
    fallback: 'dark',
    classSuffix: '',
    // Su cookie invece che su localStorage: la classe arriva gia corretta
    // dal server e non c'e il lampo chiaro al primo render.
    storage: 'cookie',
  },
  typescript: {
    strict: true,
    // The dedicated `pnpm typecheck` gate runs vue-tsc without the Vite watcher.
    typeCheck: false,
  },
  runtimeConfig: {
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    oneSignalRestApiKey: process.env.ONESIGNAL_REST_API_KEY,
    notificationWebhookSecret: process.env.NOTIFICATION_WEBHOOK_SECRET,
    public: {
      appEnv: process.env.APP_ENV || 'development',
      appBaseUrl: process.env.APP_BASE_URL || 'http://127.0.0.1:3000',
      oneSignalAppId:
        process.env.NUXT_PUBLIC_ONESIGNAL_APP_ID ||
        process.env.ONESIGNAL_APP_ID ||
        '',
      supabase: {
        url: process.env.NUXT_PUBLIC_SUPABASE_URL || '',
        key: process.env.NUXT_PUBLIC_SUPABASE_KEY || '',
      },
    },
  },
  // Le rotte pubbliche ritirate dalla V2 non spariscono: reindirizzano, cosi i
  // link gia condivisi e gli eventuali risultati di ricerca continuano a
  // funzionare. Tornei, ranking e news ora vivono dietro autenticazione, quindi
  // il redirect e temporaneo (302) e passa dal middleware di login.
  routeRules: {
    '/esperienze': { redirect: { to: '/postazioni', statusCode: 301 } },
    '/esperienze/**': { redirect: { to: '/postazioni', statusCode: 301 } },
    '/evento': { redirect: { to: '/', statusCode: 301 } },
    '/news': { redirect: { to: '/app/bacheca', statusCode: 302 } },
    '/news/**': { redirect: { to: '/app/bacheca', statusCode: 302 } },
    '/tornei': { redirect: { to: '/app/tornei', statusCode: 302 } },
    '/tornei/**': { redirect: { to: '/app/tornei', statusCode: 302 } },
    '/ranking': { redirect: { to: '/app/ranking', statusCode: 302 } },
  },
  nitro: {
    prerender: {
      autoSubfolderIndex: false,
      // `/offline` e l'unica pagina che deve esistere come file statico: il
      // service worker la puo servire solo se e finita nel precache, e nel
      // precache ci finiscono i file, non le rotte renderizzate dal server.
      routes: ['/offline'],
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
      // Chrome dichiara installabile un sito solo se trova icone raster da
      // 192 e 512: le SVG le ignora per questo scopo, quindi con la sola
      // favicon l'invito a installare non compariva mai.
      //
      // `maskable` e un'immagine a parte perche il sistema la ritaglia: il
      // segno sta dentro l'80% centrale, il resto e fondo.
      icons: [
        {
          src: '/icons/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/icons/icon-maskable-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
        {
          src: '/favicon.png',
          sizes: '48x48',
          type: 'image/png',
          purpose: 'any',
        },
      ],
    },
    workbox: {
      // Senza gli html il precache non contiene nessuna pagina, e la pagina
      // offline non e servibile.
      globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff2}'],
      // La chiave deve esserci anche se vale `undefined`: il modulo controlla
      // `'navigateFallback' in workbox` e, se manca, ci mette `/`, che non e
      // in precache e fa fallire l'avvio del service worker.
      navigateFallback: undefined,
      // Niente `navigateFallback`: quella e la configurazione di una SPA, dove
      // esiste un solo documento da restituire per qualunque rotta. Qui il
      // documento lo genera il server a ogni richiesta, quindi la navigazione
      // deve andare in rete e ripiegare sulla pagina offline solo quando la
      // rete non c'e.
      runtimeCaching: [
        {
          urlPattern: ({ request }: { request: Request }) =>
            request.mode === 'navigate',
          handler: 'NetworkOnly',
          options: {
            precacheFallback: { fallbackURL: '/offline' },
          },
        },
        {
          urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'vrsus-fonts',
            expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 30 },
          },
        },
        {
          // La regex precedente era ancorata a `^/`: Workbox confronta l'URL
          // completo, quindi non ha mai corrisposto a niente.
          urlPattern: ({ url }: { url: URL }) =>
            url.pathname.startsWith('/_nuxt/') ||
            /\.(?:png|jpg|jpeg|webp|svg|ico|woff2)$/i.test(url.pathname),
          handler: 'CacheFirst',
          options: {
            cacheName: 'vrsus-assets',
            expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
          },
        },
      ],
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'it' },
      meta: [
        { name: 'theme-color', content: '#08090d' },
        { name: 'color-scheme', content: 'dark' },
      ],
      link: [
        { rel: 'icon', href: '/favicon.png', type: 'image/png' },
        { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
      ],
    },
    // La transizione di pagina resta disattivata: con Nuxt 4.5 e Vue 3.5 il
    // <Transition> attorno a <NuxtPage> non scambia il componente quando la
    // pagina di destinazione usa `await` di primo livello in `<script setup>`
    // (Suspense). La rotta e il titolo cambiavano, il contenuto no. Vedi
    // DEC-029; le transizioni interne alle pagine continuano a funzionare.
  },
})
