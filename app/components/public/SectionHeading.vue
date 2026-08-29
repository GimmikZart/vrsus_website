<script setup lang="ts">
defineProps<{
  eyebrow: string
  title: string
  description?: string
}>()
</script>

<template>
  <div class="max-w-2xl">
    <p
      class="text-brand-blue-400 mb-4 text-xs font-semibold tracking-[0.24em] uppercase"
    >
      {{ eyebrow }}
    </p>
    <h2
      class="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl"
    >
      {{ title }}
    </h2>
    <p v-if="description" class="mt-4 text-base leading-7 text-white/60">
      {{ description }}
    </p>
  </div>
</template>
