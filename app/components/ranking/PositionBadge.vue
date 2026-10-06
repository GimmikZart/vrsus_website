<script setup lang="ts">
defineProps<{ position: number }>()
</script>

<template>
  <span
    class="relative flex size-9 shrink-0 items-center justify-center"
    :aria-label="`${position}° posto`"
  >
    <svg
      v-if="position === 1"
      viewBox="0 0 40 40"
      class="absolute inset-0 size-full text-amber-300"
      aria-hidden="true"
    >
      <path
        d="M7 15.5 12 20l8-11 8 11 5-4.5-2.2 13h-21.6L7 15.5Z"
        fill="currentColor"
        fill-opacity=".18"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linejoin="round"
      />
      <path
        d="M10 32h20"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      />
    </svg>
    <svg
      v-else-if="position <= 3"
      viewBox="0 0 40 40"
      class="absolute inset-0 size-full"
      :class="position === 2 ? 'text-slate-300' : 'text-amber-600'"
      aria-hidden="true"
    >
      <path
        d="M12 7h16v7.5c0 6-3.3 10-8 10s-8-4-8-10V7Z"
        fill="currentColor"
        fill-opacity=".18"
        stroke="currentColor"
        stroke-width="1.8"
      />
      <path
        d="M12 10H7v3c0 4 2.3 6 6.2 6M28 10h5v3c0 4-2.3 6-6.2 6M20 25v5M14.5 33h11"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
      />
    </svg>
    <span
      class="relative z-10 text-sm font-black"
      :class="
        position === 1
          ? 'mt-1 text-amber-100'
          : position === 2
            ? '-mt-1 text-slate-100'
            : position === 3
              ? '-mt-1 text-amber-200'
              : 'bg-default text-highlighted flex size-8 items-center justify-center rounded-full'
      "
    >
      {{ position }}
    </span>
  </span>
</template>
