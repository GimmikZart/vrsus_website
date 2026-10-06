<script setup lang="ts">
// Conferma in una finestra sopra la pagina. Serve dove un gesto impegna
// davvero qualcosa: prenotare un posto, iscriversi a un torneo.
//
// E scritta a mano invece che con il modale della libreria perche il
// contenuto e sempre lo stesso (titolo, riga di spiegazione, due comandi) e
// cosi resta identica ovunque.
const open = defineModel<boolean>({ required: true })

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    confirmLabel?: string
    cancelLabel?: string
    pending?: boolean
  }>(),
  { description: '', confirmLabel: 'Conferma', cancelLabel: 'Annulla' },
)

const emit = defineEmits<{ confirm: [] }>()

function close() {
  if (props.pending) return
  open.value = false
}

// Esc chiude, come ci si aspetta da una finestra di conferma.
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

watch(open, (value) => {
  if (import.meta.server) return
  if (value) {
    window.addEventListener('keydown', onKeydown)
    document.body.style.overflow = 'hidden'
  } else {
    window.removeEventListener('keydown', onKeydown)
    document.body.style.overflow = ''
  }
})

onBeforeUnmount(() => {
  if (import.meta.server) return
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div
        v-if="open"
        class="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm"
        @click.self="close"
      >
        <div
          role="dialog"
          aria-modal="true"
          class="vrsus-dialog-panel w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d0f14] p-5 shadow-2xl shadow-black/60"
        >
          <h2 class="font-display text-lg font-semibold text-white">
            {{ title }}
          </h2>
          <p v-if="description" class="mt-2 text-sm leading-6 text-white/55">
            {{ description }}
          </p>

          <div class="mt-4 empty:hidden">
            <slot />
          </div>

          <div
            class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
          >
            <UButton
              color="neutral"
              variant="ghost"
              :disabled="pending"
              :label="cancelLabel"
              @click="close"
            />
            <UButton
              color="primary"
              :loading="pending"
              :label="confirmLabel"
              @click="emit('confirm')"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
