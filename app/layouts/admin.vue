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
const { operationalMode } = useRoleMode()
const actions = providePageActions()
const pageTitle = useShellPageTitle('admin')
const staffMode = computed(() => operationalMode.value === 'staff')
const homeRoute = computed(() => (staffMode.value ? '/admin/live' : '/admin'))

const tabs = computed<TabItem[]>(() =>
  staffMode.value
    ? [
        { to: '/admin/ranking', label: 'Ranking', icon: 'i-lucide-trophy' },
        { to: '/admin/tornei', label: 'Tornei', icon: 'i-lucide-swords' },
        {
          to: '/admin/live',
          label: 'Live',
          icon: 'i-lucide-radio',
          live: liveState.value?.live ?? false,
          featured: true,
        },
        { to: '/admin/utenti', label: 'Utenti', icon: 'i-lucide-users' },
        {
          to: '/admin/profilo',
          label: 'Impostazioni',
          icon: 'i-lucide-settings',
        },
      ]
    : [
        {
          to: '/admin',
          label: 'Live',
          icon: 'i-lucide-radio',
          exact: true,
          live: liveState.value?.live ?? false,
        },
        {
          to: '/admin/eventi',
          label: 'Eventi',
          icon: 'i-lucide-calendar-days',
        },
        { to: '/admin/tornei', label: 'Tornei', icon: 'i-lucide-swords' },
        {
          to: '/admin/piattaforme',
          label: 'Postazioni',
          icon: 'i-lucide-monitor',
        },
        { to: '/admin/giochi', label: 'Giochi', icon: 'i-lucide-gamepad-2' },
        {
          to: '/admin/altro',
          label: 'Altro',
          icon: 'i-lucide-ellipsis',
          mobileOnly: true,
        },
      ],
)
</script>

<template>
  <div
    class="h-dvh overflow-hidden lg:pl-64"
    :style="{ '--float-menu-height': actions.length ? '3.5rem' : '0rem' }"
  >
    <UiVrsusAppToolbar :title="pageTitle" :home="homeRoute" />

    <main
      class="app-scroll-area mx-auto h-full max-w-5xl overflow-y-auto px-4 lg:max-w-7xl lg:px-8"
    >
      <slot />
    </main>

    <UiVrsusFloatMenu :actions="actions" />

    <UiVrsusTabBar :items="tabs" :groups="staffMode ? [] : groups">
      <template #footer>
        <UiVrsusSessionCard compact />
      </template>
    </UiVrsusTabBar>
  </div>
</template>
