<script setup lang="ts">
import type { PageAction } from '~/composables/usePageActions'

defineProps<{ actions: PageAction[] }>()
</script>

<template>
  <Transition name="float-menu">
    <div
      v-if="actions.length"
      class="vrsus-float-menu fixed inset-x-0 z-30 border-t border-white/10 bg-[#101219]/95 px-3 backdrop-blur-xl lg:left-64"
    >
      <div
        class="mx-auto flex h-14 max-w-3xl items-center gap-2 overflow-x-auto lg:max-w-5xl"
      >
        <UButton
          v-if="actions.length === 1 && actions[0]"
          :to="actions[0].to"
          :color="actions[0].color ?? 'primary'"
          :loading="actions[0].loading"
          :disabled="actions[0].disabled"
          class="w-full justify-center"
          :class="
            actions[0].color === 'error'
              ? '!bg-red-600 !text-white hover:!bg-red-500'
              : ''
          "
          size="lg"
          :label="actions[0].label"
          @click="actions[0].onClick?.()"
        />
        <UButton
          v-for="(action, index) in actions.length > 1 ? actions : []"
          :key="`${action.label}-${index}`"
          :to="action.to"
          :color="action.color ?? 'neutral'"
          variant="ghost"
          :loading="action.loading"
          :disabled="action.disabled"
          class="h-12 min-w-20 flex-1 flex-col justify-center gap-0.5 px-1 text-[11px]"
          :aria-label="action.label"
          @click="action.onClick?.()"
        >
          <UIcon
            v-if="action.icon"
            :name="action.icon"
            class="size-4 shrink-0"
          />
          <span class="truncate leading-none">{{ action.label }}</span>
        </UButton>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.vrsus-float-menu {
  bottom: calc(3.5rem + env(safe-area-inset-bottom, 0px));
}
@media (min-width: 1024px) {
  .vrsus-float-menu {
    bottom: 0;
  }
}
</style>
