<script setup lang="ts">
// Pallino rosso lampeggiante dello stato live. Sta in un componente perche lo
// mostrano la tab bar della console, l'intestazione della dashboard e la
// scheda dell'evento, e devono lampeggiare allo stesso modo.
const props = withDefaults(defineProps<{ size?: string }>(), {
  size: '0.5rem',
})

const style = computed(() => ({ '--vrsus-live-dot-size': props.size }))
</script>

<template>
  <span class="vrsus-live-dot" :style="style" aria-hidden="true" />
</template>
