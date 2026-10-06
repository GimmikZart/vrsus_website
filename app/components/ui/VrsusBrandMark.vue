<script setup lang="ts">
import logo from '~/assets/css/img/logo/logo-vrsus.png'

withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })
</script>

<template>
  <span class="inline-flex shrink-0 items-center gap-3">
    <img
      :src="logo"
      alt="VRSUS"
      width="384"
      height="384"
      class="block shrink-0 object-contain"
      :class="compact ? 'size-11' : 'size-12'"
    />
    <span
      v-if="!compact"
      aria-hidden="true"
      class="font-display text-lg font-bold tracking-[0.16em] text-white"
      >VRSUS</span
    >
  </span>
</template>
