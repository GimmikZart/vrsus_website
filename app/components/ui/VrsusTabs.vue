<script setup lang="ts">
export type VrsusTabItem = {
  value: string
  label: string
  /**
   * Valore mostrato accanto all etichetta: il totale dei prenotati, oppure
   * una frazione quando servono due numeri, per esempio `12/36`.
   */
  count?: number | string | null
  icon?: string
}

const props = defineProps<{ items: VrsusTabItem[] }>()

const model = defineModel<string>({ required: true })
const tabList = ref<HTMLElement | null>(null)
const marker = ref<{ width: string; transform: string } | null>(null)
let resizeObserver: ResizeObserver | undefined

function updateMarker() {
  const active = tabList.value?.querySelector<HTMLElement>(
    '[aria-selected="true"]',
  )
  marker.value = active
    ? {
        width: `${active.offsetWidth}px`,
        transform: `translateX(${active.offsetLeft}px)`,
      }
    : null
}

watch(
  [model, () => props.items],
  async () => {
    await nextTick()
    updateMarker()
  },
  { deep: true, flush: 'post' },
)

onMounted(() => {
  updateMarker()
  resizeObserver = new ResizeObserver(updateMarker)
  if (tabList.value) resizeObserver.observe(tabList.value)
})
onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<template>
  <!--
    Selettore di sezione condiviso da scheda utente, scheda torneo e
    dashboard. Scorre in orizzontale su schermi stretti invece di andare a
    capo: le etichette restano leggibili e la riga non cambia altezza.
  -->
  <div class="-mx-1 overflow-x-auto px-1">
    <div
      ref="tabList"
      role="tablist"
      class="relative isolate inline-flex min-w-full gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1"
    >
      <span
        v-if="marker"
        aria-hidden="true"
        class="vrsus-tab-marker pointer-events-none absolute inset-y-1 left-0 -z-10 rounded-xl bg-white/10"
        :style="marker"
      />
      <button
        v-for="item in items"
        :key="item.value"
        type="button"
        role="tab"
        :aria-selected="model === item.value"
        class="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium whitespace-nowrap transition-colors"
        :class="
          model === item.value
            ? marker
              ? 'text-white'
              : 'bg-white/10 text-white'
            : 'text-white/50 hover:text-white/80'
        "
        @click="model = item.value"
      >
        <UIcon v-if="item.icon" :name="item.icon" class="size-4 shrink-0" />
        <span>{{ item.label }}</span>
        <span
          v-if="item.count !== null && item.count !== undefined"
          class="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/70 tabular-nums"
          >{{ item.count }}</span
        >
      </button>
    </div>
  </div>
</template>

<style scoped>
.vrsus-tab-marker {
  transition:
    transform 420ms var(--ease-vrsus),
    width 420ms var(--ease-vrsus);
}
</style>
