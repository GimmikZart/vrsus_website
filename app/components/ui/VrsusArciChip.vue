<script setup lang="ts">
// "Serve la tessera ARCI": la stessa etichetta ovunque si veda una giornata o
// un torneo, cosi chi prenota non lo scopre alla porta. Non compare quando la
// tessera non serve: un compleanno non deve spiegare cosa non chiede.
defineProps<{ required?: boolean | null; size?: 'sm' | 'md' }>()
</script>

<template>
  <span
    v-if="required"
    class="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/[0.08] text-amber-200"
    :class="size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'"
  >
    <UIcon name="i-lucide-id-card" class="size-3.5 shrink-0" />
    Tessera ARCI richiesta
  </span>
</template>
