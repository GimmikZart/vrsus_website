<script setup lang="ts">
import type { TabItem } from '~/components/ui/VrsusTabBar.vue'

// Shell dell'utente autenticato: toolbar, contenuto, azioni contestuali e
// navigazione sono quattro sezioni indipendenti.
//
// La prima voce non e una home generica: e la bacheca, cioe quello che
// succede al circolo. Quando una serata e in corso davanti a tutto compare
// `Live` con il pallino rosso: durante l'evento e l'unica pagina che serve
// davvero (DEC-042).
const { data: liveEvent } = usePublicLiveEvent()
const actions = providePageActions()
const pageTitle = useShellPageTitle('app')

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
  <div
    class="h-dvh overflow-hidden lg:pl-64"
    :style="{ '--float-menu-height': actions.length ? '3.5rem' : '0rem' }"
  >
    <UiVrsusAppToolbar :title="pageTitle" home="/app" />

    <UiVrsusPullToRefresh
      class="app-scroll-area mx-auto h-full max-w-3xl overflow-y-auto px-4 lg:max-w-5xl lg:px-8"
    >
      <slot />
    </UiVrsusPullToRefresh>

    <UiVrsusFloatMenu :actions="actions" />

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
