<script setup lang="ts">
import type { Database } from '~/types/database.types'

definePageMeta({ layout: 'app', middleware: ['auth'] })

type FeedbackKind = 'message' | 'suggestion' | 'review' | 'problem'

const client = useSupabaseClient<Database>()
const user = useSupabaseUser()
const form = reactive({ kind: 'message' as FeedbackKind, rating: 0, body: '' })
const pending = ref(false)
const message = ref('')
const errorMessage = ref('')

const kindOptions: { value: FeedbackKind; label: string }[] = [
  { value: 'message', label: 'Messaggio' },
  { value: 'suggestion', label: 'Consiglio' },
  { value: 'review', label: 'Recensione' },
  { value: 'problem', label: 'Problemi riscontrati' },
]

async function sendFeedback() {
  errorMessage.value = ''
  message.value = ''
  if (form.body.trim().length < 3) {
    errorMessage.value = 'Scrivi almeno qualche parola.'
    return
  }
  pending.value = true
  const { error } = await client.from('user_feedback').insert({
    user_id: String(user.value?.sub),
    kind: form.kind,
    rating: form.kind === 'review' && form.rating ? form.rating : null,
    body: form.body.trim(),
  })
  pending.value = false
  if (error) {
    errorMessage.value = 'Invio non riuscito. Riprova fra poco.'
    return
  }
  form.body = ''
  form.rating = 0
  message.value = 'Grazie, abbiamo ricevuto il tuo messaggio.'
}

usePageActions(
  computed(() => [
    {
      label: 'Invia',
      icon: 'i-lucide-send',
      onClick: sendFeedback,
      loading: pending.value,
      disabled: pending.value || form.body.trim().length < 3,
    },
  ]),
)

useSeoMeta({ title: 'Scrivici — VRSUS', robots: 'noindex, nofollow' })
</script>

<template>
  <div class="space-y-6">
    <header>
      <NuxtLink to="/app" class="text-sm text-white/45 hover:text-white"
        >← Bacheca</NuxtLink
      >
      <p
        class="text-brand-red-400 mt-6 text-xs font-semibold tracking-[0.24em] uppercase"
      >
        Contatti
      </p>
      <h1 class="font-display mt-2 text-3xl font-semibold text-white">
        Scrivici
      </h1>
      <p class="mt-2 max-w-2xl text-sm leading-6 text-white/55">
        Il contenuto resta a uso interno e non viene pubblicato. Scegli il tipo
        più adatto per aiutarci a gestirlo rapidamente.
      </p>
    </header>

    <section
      class="space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
    >
      <UFormField label="Tipo">
        <select v-model="form.kind" class="vrsus-select w-full">
          <option
            v-for="option in kindOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </UFormField>

      <UFormField v-if="form.kind === 'review'" label="Voto">
        <div class="flex gap-2">
          <button
            v-for="score in 5"
            :key="score"
            type="button"
            class="grid size-11 place-items-center rounded-xl border transition-colors"
            :class="
              form.rating >= score
                ? 'border-brand-red-500/60 bg-brand-red-500/15 text-brand-red-300'
                : 'border-white/15 text-white/40'
            "
            @click="form.rating = score"
          >
            <UIcon name="i-lucide-star" class="size-5" />
          </button>
        </div>
      </UFormField>

      <UFormField label="Messaggio">
        <UTextarea
          v-model="form.body"
          :rows="7"
          class="w-full"
          placeholder="Raccontaci cosa vuoi comunicarci"
        />
      </UFormField>

      <UAlert
        v-if="message"
        color="success"
        variant="subtle"
        :description="message"
      />
      <UAlert
        v-if="errorMessage"
        color="error"
        variant="subtle"
        :description="errorMessage"
      />
    </section>
  </div>
</template>
