<script setup lang="ts">
export type TabItem = {
  to: string
  label: string
  icon: string
  /** Se true la voce e attiva solo sulla rotta esatta, non sui figli. */
  exact?: boolean
  /**
   * Se true l icona lascia il posto al pallino rosso lampeggiante: si usa per
   * la voce Live della console quando una serata e in corso.
   */
  live?: boolean
  /**
   * Se true la voce sparisce da lg in su: si usa per la pagina "Altro", che su
   * schermo largo viene sostituita dalle sue stesse voci in colonna.
   */
  mobileOnly?: boolean
}

/** Gruppo di voci mostrato solo nella colonna di sinistra. */
export type TabGroup = {
  title: string
  items: { to: string; label: string; icon: string }[]
}

const props = defineProps<{ items: TabItem[]; groups?: TabGroup[] }>()

const route = useRoute()

function isActive(item: { to: string; exact?: boolean }) {
  if (item.exact) return route.path === item.to
  return route.path === item.to || route.path.startsWith(item.to + '/')
}

const items = computed(() => props.items)
const groups = computed(() => props.groups ?? [])

const linkClass =
  'flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[11px] transition-colors lg:min-h-12 lg:flex-row lg:justify-start lg:gap-3 lg:rounded-xl lg:px-4 lg:text-sm'
</script>

<template>
  <!--
    Mobile: barra fissa in basso, con il padding della safe area richiesto in
    modalita PWA standalone su iOS. Da lg diventa una colonna a sinistra
    (DEC-025), che scorre quando le voci non ci stanno.
  -->
  <nav
    aria-label="Navigazione applicazione"
    class="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#08090d]/95 backdrop-blur-xl lg:inset-y-0 lg:right-auto lg:left-0 lg:flex lg:w-64 lg:flex-col lg:overflow-y-auto lg:border-t-0 lg:border-r lg:pb-0"
  >
    <div class="hidden h-16 shrink-0 items-center gap-3 px-6 lg:flex">
      <span
        class="bg-brand-red-500 font-display grid size-9 place-items-center rounded-xl text-sm font-bold text-white"
        >V</span
      >
      <span class="font-display text-lg font-bold tracking-[0.18em] text-white"
        >VRSUS</span
      >
    </div>

    <ul
      class="mx-auto flex max-w-lg items-stretch justify-around lg:mx-0 lg:max-w-none lg:flex-col lg:gap-1 lg:px-3"
    >
      <li
        v-for="item in items"
        :key="item.to"
        class="flex-1 lg:flex-none"
        :class="item.mobileOnly ? 'lg:hidden' : ''"
      >
        <NuxtLink
          :to="item.to"
          :aria-current="isActive(item) ? 'page' : undefined"
          :class="[
            linkClass,
            isActive(item)
              ? 'text-white lg:bg-white/10'
              : 'text-white/50 hover:text-white/80',
          ]"
        >
          <span
            v-if="item.live"
            class="grid size-5 shrink-0 place-items-center"
          >
            <UiVrsusLiveDot size="0.6rem" />
          </span>
          <UIcon v-else :name="item.icon" class="size-5 shrink-0" />
          <span class="leading-none">{{ item.label }}</span>
        </NuxtLink>
      </li>
    </ul>

    <!--
      Le voci di secondo piano: su telefono stanno nella pagina Altro, qui
      hanno spazio per stare a vista.
    -->
    <div v-if="groups.length" class="hidden lg:mt-6 lg:block lg:px-3">
      <div v-for="group in groups" :key="group.title" class="mt-5 first:mt-0">
        <p
          class="px-4 text-[11px] font-semibold tracking-[0.18em] text-white/30 uppercase"
        >
          {{ group.title }}
        </p>
        <ul class="mt-1.5 flex flex-col gap-1">
          <li v-for="item in group.items" :key="item.to">
            <NuxtLink
              :to="item.to"
              :aria-current="isActive(item) ? 'page' : undefined"
              :class="[
                linkClass,
                isActive(item)
                  ? 'text-white lg:bg-white/10'
                  : 'text-white/50 hover:text-white/80',
              ]"
            >
              <UIcon :name="item.icon" class="size-5 shrink-0" />
              <span class="leading-none">{{ item.label }}</span>
            </NuxtLink>
          </li>
        </ul>
      </div>
    </div>

    <!-- Sessione e uscita: in fondo alla colonna, mai nella barra del telefono. -->
    <div
      v-if="$slots.footer"
      class="hidden lg:mt-auto lg:block lg:border-t lg:border-white/10 lg:px-3 lg:py-3"
    >
      <slot name="footer" />
    </div>
  </nav>
</template>
