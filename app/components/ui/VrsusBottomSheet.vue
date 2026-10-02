<script setup lang="ts">
const open = defineModel<boolean>({ required: true })

const props = defineProps<{
  title: string
  description?: string
  pending?: boolean
}>()

const titleId = `sheet-${useId()}`
const closeButton = ref<HTMLButtonElement | null>(null)
let previousFocus: HTMLElement | null = null

function close() {
  if (!props.pending) open.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

watch(open, async (value) => {
  if (import.meta.server) return
  if (value) {
    previousFocus = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeydown)
    await nextTick()
    closeButton.value?.focus()
  } else {
    document.body.style.overflow = ''
    window.removeEventListener('keydown', onKeydown)
    previousFocus?.focus()
  }
})

onBeforeUnmount(() => {
  if (import.meta.server) return
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="open" class="fixed inset-0 z-[60]">
        <button
          type="button"
          class="absolute inset-0 w-full bg-black/75 backdrop-blur-sm"
          aria-label="Chiudi finestra"
          @click="close"
        />
        <section
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          class="sheet-panel absolute inset-x-0 bottom-0 mx-auto max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-white/15 bg-[#101219] px-5 pt-4 shadow-2xl shadow-black/70 sm:rounded-3xl"
          style="padding-bottom: max(1.25rem, env(safe-area-inset-bottom))"
        >
          <div class="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2
                :id="titleId"
                class="font-display text-xl font-semibold text-white"
              >
                {{ title }}
              </h2>
              <p
                v-if="description"
                class="mt-1 text-sm leading-5 text-white/55"
              >
                {{ description }}
              </p>
            </div>
            <button
              ref="closeButton"
              type="button"
              class="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-white/70"
              aria-label="Chiudi"
              :disabled="pending"
              @click="close"
            >
              <UIcon name="i-lucide-x" class="size-5" />
            </button>
          </div>
          <div class="mt-5">
            <slot />
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 220ms ease;
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-panel {
  transition: transform 220ms ease;
}
.sheet-enter-from .sheet-panel,
.sheet-leave-to .sheet-panel {
  transform: translateY(100%);
}
</style>
