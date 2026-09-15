<script setup lang="ts">
// Atterraggio del link di conferma dell'email.
//
// Supabase manda l'utente qui con un `code` nell'indirizzo; il client del
// browser lo scambia da solo con una sessione (`detectSessionInUrl`), quindi
// qui non si scambia niente a mano: si aspetta che la sessione compaia e si
// entra. Se il link e scaduto o gia usato, Supabase rimanda un errore
// nell'indirizzo e lo diciamo in chiaro, invece di lasciare una pagina bianca.
//
// Questa rotta e quella dichiarata come `callback` in `nuxt.config.ts`: senza,
// chi confermava l'email finiva su una pagina inesistente.
definePageMeta({ layout: 'site' })

const user = useSupabaseUser()
const state = ref<'checking' | 'error'>('checking')
const errorMessage = ref('')

useSeoMeta({ title: 'Conferma account — VRSUS', robots: 'noindex, nofollow' })

function linkError(): string {
  const query = new URLSearchParams(window.location.search)
  // Alcuni errori arrivano nel frammento, che non passa dal server.
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const code = query.get('error_code') ?? hash.get('error_code')
  const description =
    query.get('error_description') ?? hash.get('error_description')

  if (!query.get('error') && !hash.get('error') && !code) return ''

  if (code === 'otp_expired' || description?.includes('expired')) {
    return 'Il link di conferma è scaduto. Richiedine uno nuovo provando ad accedere.'
  }

  return 'Il link di conferma non è più valido. Potrebbe essere già stato usato.'
}

onMounted(async () => {
  const failure = linkError()
  if (failure) {
    errorMessage.value = failure
    state.value = 'error'
    return
  }

  if (user.value) {
    await navigateTo('/app')
    return
  }

  // Lo scambio del codice avviene subito dopo il primo render: si aspetta la
  // sessione con un limite, invece di restare appesi per sempre.
  const stop = watch(user, async (value) => {
    if (!value) return
    stop()
    clearTimeout(timer)
    await navigateTo('/app')
  })

  const timer = setTimeout(() => {
    stop()
    if (user.value) return
    errorMessage.value =
      'Non siamo riusciti a completare la conferma. Prova ad accedere con email e password.'
    state.value = 'error'
  }, 10000)

  onBeforeUnmount(() => {
    stop()
    clearTimeout(timer)
  })
})
</script>

<template>
  <main
    class="mx-auto flex min-h-[calc(100vh-9rem)] max-w-xl flex-col items-center justify-center px-5 py-16 text-center"
  >
    <template v-if="state === 'checking'">
      <UIcon
        name="i-lucide-loader-circle"
        class="text-brand-red-400 size-8 animate-spin"
      />
      <h1 class="font-display mt-6 text-3xl font-semibold text-white">
        Stiamo confermando il tuo account
      </h1>
      <p class="mt-3 leading-7 text-white/55">Un istante e sei dentro.</p>
    </template>

    <template v-else>
      <div
        class="bg-brand-red-500/15 grid size-16 place-items-center rounded-2xl"
      >
        <UIcon name="i-lucide-mail-warning" class="text-brand-red-300 size-8" />
      </div>
      <h1 class="font-display mt-8 text-3xl font-semibold text-white">
        Conferma non riuscita
      </h1>
      <p class="mt-4 leading-7 text-white/55">{{ errorMessage }}</p>
      <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
        <UButton to="/login" size="lg" label="Vai all'accesso" />
        <UButton
          to="/"
          size="lg"
          color="neutral"
          variant="ghost"
          label="Torna al sito"
        />
      </div>
    </template>
  </main>
</template>
