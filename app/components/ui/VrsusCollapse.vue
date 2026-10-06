<script setup lang="ts">
defineProps<{ open: boolean }>()
</script>

<template>
  <div
    class="vrsus-collapse"
    :class="{ 'is-open': open }"
    :inert="!open"
    :aria-hidden="!open"
  >
    <div class="min-h-0 overflow-hidden">
      <div class="vrsus-collapse-content">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.vrsus-collapse {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 420ms var(--ease-vrsus);
}
.vrsus-collapse.is-open {
  grid-template-rows: 1fr;
}
.vrsus-collapse-content {
  opacity: 0;
  transform: translateY(-5px);
  visibility: hidden;
  transition:
    opacity 300ms ease,
    transform 420ms var(--ease-vrsus),
    visibility 420ms;
}
.is-open .vrsus-collapse-content {
  opacity: 1;
  transform: none;
  visibility: visible;
}
</style>
