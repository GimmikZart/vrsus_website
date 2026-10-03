<script setup lang="ts">
withDefaults(
  defineProps<{
    src?: string | null
    alt: string
    kind?: 'platform' | 'game'
  }>(),
  { src: null, kind: 'game' },
)
</script>

<template>
  <div class="relative overflow-hidden bg-white/[0.04]">
    <NuxtImg
      v-if="src"
      :src="src"
      :alt="alt"
      class="size-full object-cover"
      loading="lazy"
    />
    <div
      v-else
      class="grid size-full place-items-center gap-2 bg-[radial-gradient(circle_at_70%_15%,rgba(239,68,68,0.12),rgba(255,255,255,0.02)_60%)] p-3 text-center"
    >
      <UIcon
        :name="kind === 'platform' ? 'i-lucide-monitor' : 'i-lucide-gamepad-2'"
        class="size-7 text-white/25"
      />
      <span
        class="font-display line-clamp-2 text-xs font-semibold text-white/45"
        >{{ alt }}</span
      >
    </div>
  </div>
</template>
