<script setup lang="ts">
import type { TabItem } from '~/components/ui/VrsusTabBar.vue'

// Shell dell'utente autenticato: header contestuale sottile e tab bar
// inferiore (DEC-025).
//
// La prima voce non e una home generica: e la bacheca, cioe quello che
// succede al circolo. Quando una serata e in corso davanti a tutto compare
// `Live` con il pallino rosso: durante l'evento e l'unica pagina che serve
// davvero (DEC-042).
const { data: liveEvent } = usePublicLiveEvent()

const tabs = computed<TabItem[]>(() => [
  ...(liveEvent.value
    ? [
        {
          to: '/app/live',
          label: 'Live',
          icon: 'i-lucide-radio',
          live: true,
        },
      ]
    : []),
  { to: '/app', label: 'Bacheca', icon: 'i-lucide-newspaper', exact: true },
  { to: '/app/eventi', label: 'Eventi', icon: 'i-lucide-calendar-days' },
  { to: '/app/ranking', label: 'Ranking', icon: 'i-lucide-trophy' },
  { to: '/app/tornei', label: 'Tornei', icon: 'i-lucide-swords' },
  { to: '/app/impostazioni', label: 'Impostazioni', icon: 'i-lucide-settings' },
])

const { loadRoles } = useVrsusAuth()

// I ruoli servono solo a decidere se mostrare il passaggio all'area operativa,
// quindi non devono bloccare il rendering della shell: un `await` qui dentro
// mette l'intero layout dietro a Suspense e, subito dopo il login, lascia la
// pagina in caricamento finche la chiamata non torna. Il passaggio compare
// appena i ruoli arrivano.
onMounted(() => {
  loadRoles().catch(() => undefined)
})
</script>

<template>
  <div class="min-h-screen lg:pl-64">
    <!--
      Niente overflow-x qui: un antenato con overflow diverso da visible annulla
      position: sticky sui discendenti, e sia l'header sia le barre di schede si
      reggono su quello. Il contenuto largo (tabelle, tabelloni) scorre gia
      dentro il proprio contenitore.
    -->

    <header
      class="pt-safe sticky top-0 z-30 border-b border-white/10 bg-[#08090d]/90 backdrop-blur-xl lg:hidden"
    >
      <div class="flex h-14 items-center justify-between px-5">
        <NuxtLink to="/app" class="inline-flex items-center gap-2">
          <span
            class="bg-brand-red-500 font-display grid size-7 place-items-center rounded-lg text-xs font-bold text-white"
            >V</span
          >
          <span
            class="font-display text-base font-bold tracking-[0.16em] text-white"
            >VRSUS</span
          >
        </NuxtLink>
      </div>
    </header>

    <main
      class="app-scroll-area mx-auto max-w-3xl px-4 py-5 lg:max-w-5xl lg:px-8 lg:py-10"
    >
      <slot />
    </main>

    <!--
      L'invito a installare l'app vive nella shell del cliente: e il primo
      posto dove si arriva dopo l'accesso, e installarla ha senso per chi usa
      l'app, non per chi apre la console da un computer del circolo.
    -->
    <UiVrsusInstallPrompt />

    <UiVrsusTabBar :items="tabs">
      <template #footer>
        <UiVrsusSessionCard compact />
      </template>
    </UiVrsusTabBar>
  </div>
</template>
