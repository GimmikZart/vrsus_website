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

defineProps<{ items: VrsusTabItem[] }>()

const model = defineModel<string>({ required: true })
</script>

<template>
  <!--
    Selettore di sezione condiviso da scheda utente, scheda torneo e
    dashboard. Scorre in orizzontale su schermi stretti invece di andare a
    capo: le etichette restano leggibili e la riga non cambia altezza.
  -->
  <div class="-mx-1 overflow-x-auto px-1">
    <div
      role="tablist"
      class="inline-flex min-w-full gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1"
    >
      <button
        v-for="item in items"
        :key="item.value"
        type="button"
        role="tab"
        :aria-selected="model === item.value"
        class="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium whitespace-nowrap transition-colors"
        :class="
          model === item.value
            ? 'bg-white/10 text-white'
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
