<script setup lang="ts">
import type { TabItem } from '~/components/ui/VrsusTabBar.vue'

// Shell della console. Su telefono la sesta voce raccoglie le console
// assorbite dalla riorganizzazione V2 (DEC-025); su schermo largo quelle voci
// stanno direttamente nella colonna di sinistra, insieme all uscita (DEC-040).
//
// La prima voce non e una home: e la plancia della serata. Si chiama Live e,
// quando un evento e in corso, l icona diventa il pallino rosso lampeggiante,
// cosi si distingue a colpo d occhio da una console ferma.
const { data: liveState } = useAdminLiveEvent()
const { groups } = useAdminMenu()

const tabs = computed<TabItem[]>(() => [
  {
    to: '/admin',
    label: 'Live',
    icon: 'i-lucide-radio',
    exact: true,
    live: liveState.value?.live ?? false,
  },
  { to: '/admin/eventi', label: 'Eventi', icon: 'i-lucide-calendar-days' },
  { to: '/admin/tornei', label: 'Tornei', icon: 'i-lucide-swords' },
  { to: '/admin/piattaforme', label: 'Postazioni', icon: 'i-lucide-monitor' },
  { to: '/admin/giochi', label: 'Giochi', icon: 'i-lucide-gamepad-2' },
  {
    to: '/admin/altro',
    label: 'Altro',
    icon: 'i-lucide-ellipsis',
    mobileOnly: true,
  },
])
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
      <!--
        Il passaggio all'area cliente non sta qui ma nella pagina Altro,
        accanto all'uscita: chi amministra e anche un cliente del circolo, e i
        due gesti di uscita dalla console vivono nello stesso posto (DEC-045).
      -->
      <div class="flex h-14 items-center px-5">
        <span
          class="font-display text-base font-bold tracking-[0.16em] text-white"
          >Console</span
        >
      </div>
    </header>

    <main
      class="app-scroll-area mx-auto max-w-5xl px-4 py-5 lg:max-w-7xl lg:px-8 lg:py-10"
    >
      <slot />
    </main>

    <UiVrsusTabBar :items="tabs" :groups="groups">
      <template #footer>
        <UiVrsusSessionCard compact />
      </template>
    </UiVrsusTabBar>
  </div>
</template>
