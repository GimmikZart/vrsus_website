<script setup lang="ts">
// Nelle card riassuntive della giornata il requisito resta riconoscibile ma
// compatto: i dettagli vivono nella sola scheda informativa dell'evento.
defineProps<{ required?: boolean | null; size?: 'sm' | 'md' }>()
</script>

<template>
  <span
    v-if="required"
    class="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/[0.08] text-amber-200"
    :class="size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'"
  >
    <UIcon name="i-lucide-id-card" class="size-3.5 shrink-0" />
    Arci
  </span>
</template>
