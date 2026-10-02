<script setup lang="ts">
import type { Database } from '~/types/database.types'
import { formatPublicContentDate } from '~/composables/usePublicCatalog'
import { formatPublicEventPrice } from '~/composables/usePublicEvents'

definePageMeta({ layout: 'app', middleware: ['auth'] })

// La home dell'app e la bacheca: annunci e sondaggi del circolo. Quando c'e
// una data in programma, sopra la bacheca compare l'invito a prenotarsi: e
// l'unica cosa che ha la precedenza sulle comunicazioni (DEC-042).
const client = useSupabaseClient<Database>()

const { data: nextEvent } = await useAsyncData('app-next-event', async () => {
  const { data } = await client
    .from('public_events')
    .select('id, title, starts_at, ends_at, price_cents, payment_required')
    .eq('status', 'scheduled')
    .order('starts_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  return data ?? null
})

const { data: myBookings } = await useMyBookings()

const bookedNextEvent = computed(() =>
  (myBookings.value ?? []).some(
    (booking) =>
      booking.event_id === nextEvent.value?.id &&
      ['confirmed', 'waitlisted'].includes(booking.status),
  ),
)

/** Giorno e fascia oraria in forma breve: nella CTA la riga deve stare su una. */
const eventWhen = computed(() => {
  const startsAt = nextEvent.value?.starts_at
  if (!startsAt) return 'Data da definire'
  const start = new Date(startsAt)
  if (Number.isNaN(start.getTime())) return 'Data da definire'

  const day = new Intl.DateTimeFormat('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(start)
  const time = (value: Date) =>
    new Intl.DateTimeFormat('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(value)

  const end = nextEvent.value?.ends_at
    ? new Date(nextEvent.value.ends_at)
    : null
  const endLabel = end && !Number.isNaN(end.getTime()) ? time(end) : null
  const label = `${day} · ${time(start)}${endLabel ? `–${endLabel}` : ''}`

  return label.charAt(0).toUpperCase() + label.slice(1)
})

// --- Bacheca ---------------------------------------------------------------

const { data: bundle, refresh } = await useAsyncData('board-feed', async () => {
  const [posts, options, myVotes] = await Promise.all([
    client
      .from('public_board_posts')
      .select('*')
      .order('pinned', { ascending: false })
      .order('published_at', { ascending: false }),
    client.from('public_board_poll_options').select('*').order('sort_order'),
    client.from('board_poll_votes').select('post_id, option_id'),
  ])

  return {
    posts: posts.data ?? [],
    options: options.data ?? [],
    myVotes: myVotes.data ?? [],
  }
})

type BoardOption =
  Database['public']['Views']['public_board_poll_options']['Row']

const optionsByPost = computed(() => {
  const map: Record<string, BoardOption[]> = {}
  for (const option of bundle.value?.options ?? []) {
    const key = String(option.post_id)
    map[key] = [...(map[key] ?? []), option]
  }
  return map
})

const myVoteByPost = computed(() => {
  const map: Record<string, string> = {}
  for (const vote of bundle.value?.myVotes ?? []) {
    map[String(vote.post_id)] = String(vote.option_id)
  }
  return map
})

function totalVotes(postId: string) {
  return (optionsByPost.value[postId] ?? []).reduce(
    (sum, option) => sum + (option.votes ?? 0),
    0,
  )
}

function percentage(postId: string, votes: number | null) {
  const total = totalVotes(postId)
  if (!total) return 0
  return Math.round(((votes ?? 0) / total) * 100)
}

const votingPost = ref<string | null>(null)

async function vote(postId: string, optionId: string) {
  votingPost.value = postId
  try {
    await client.rpc('vote_board_poll', {
      p_post_id: postId,
      p_option_id: optionId,
    })
    await refresh()
  } finally {
    votingPost.value = null
  }
}

// Il feedback resta a uso interno: lo si dichiara in chiaro nel modulo.
const feedbackOpen = ref(false)
const feedback = reactive({
  kind: 'suggestion' as 'message' | 'suggestion' | 'review',
  rating: 0,
  body: '',
})
const feedbackPending = ref(false)
const feedbackMessage = ref('')

const kindOptions = [
  { value: 'message', label: 'Messaggio' },
  { value: 'suggestion', label: 'Consiglio' },
  { value: 'review', label: 'Recensione' },
]

async function sendFeedback() {
  if (feedback.body.trim().length < 3) {
    feedbackMessage.value = 'Scrivi almeno qualche parola.'
    return
  }
  feedbackPending.value = true
  feedbackMessage.value = ''

  const user = useSupabaseUser()
  const { error } = await client.from('user_feedback').insert({
    user_id: String(user.value?.sub),
    kind: feedback.kind,
    rating:
      feedback.kind === 'review' && feedback.rating ? feedback.rating : null,
    body: feedback.body.trim(),
  })

  feedbackPending.value = false

  if (error) {
    feedbackMessage.value = 'Invio non riuscito. Riprova fra poco.'
    return
  }

  feedback.body = ''
  feedback.rating = 0
  feedbackMessage.value = 'Grazie, l’abbiamo ricevuto.'
  feedbackOpen.value = false
}

useSeoMeta({ title: 'Bacheca — VRSUS', robots: 'noindex, nofollow' })
</script>

<template>
  <div class="space-y-6">
    <!--
      Invito alla prossima data. Sta sopra tutto ma resta una riga di
      informazioni e un comando: il titolo porta il peso, data e prezzo
      restano testo di servizio.
    -->
    <section
      v-if="nextEvent"
      class="border-brand-red-500/30 bg-brand-red-500/[0.07] rounded-2xl border p-4 sm:p-5"
    >
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <p
              class="text-brand-red-300 text-[11px] font-semibold tracking-[0.18em] uppercase"
            >
              Prossimo evento
            </p>
            <span
              v-if="bookedNextEvent"
              class="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300"
              >Sei prenotato</span
            >
          </div>

          <h2
            class="font-display mt-1.5 truncate text-xl leading-tight font-semibold text-white sm:text-2xl"
          >
            {{ nextEvent.title }}
          </h2>
          <p class="mt-1 text-sm text-white/60">{{ eventWhen }}</p>

          <p class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span class="font-medium text-white/90">{{
              formatPublicEventPrice(
                nextEvent.price_cents,
                nextEvent.payment_required,
              )
            }}</span>
          </p>
        </div>

        <UButton
          class="shrink-0 justify-center"
          :to="`/app/eventi/${nextEvent.id}`"
          color="primary"
          size="lg"
          trailing-icon="i-lucide-arrow-right"
          :label="bookedNextEvent ? 'Apri l’evento' : 'Prenota il tuo posto'"
        />
      </div>
    </section>

    <header class="flex items-start justify-between gap-4">
      <div>
        <p
          class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
        >
          Comunicazioni
        </p>
        <h1
          class="font-display mt-2 text-2xl font-semibold text-white sm:text-3xl"
        >
          Bacheca
        </h1>
      </div>
      <UButton
        color="neutral"
        variant="outline"
        size="sm"
        icon="i-lucide-message-square-plus"
        label="Scrivici"
        @click="feedbackOpen = !feedbackOpen"
      />
    </header>

    <section
      v-if="feedbackOpen"
      class="rounded-2xl border border-white/15 bg-white/[0.04] p-5"
    >
      <h2 class="font-display text-base font-semibold text-white">
        Lasciaci un messaggio
      </h2>
      <p class="mt-2 text-sm text-white/50">
        Quello che scrivi qui resta a uso interno: lo leggiamo per migliorare il
        servizio e non viene pubblicato.
      </p>

      <div class="mt-4 space-y-4">
        <label class="block">
          <span
            class="mb-1.5 block text-xs tracking-wide text-white/45 uppercase"
            >Tipo</span
          >
          <select v-model="feedback.kind" class="vrsus-select">
            <option
              v-for="option in kindOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>

        <label v-if="feedback.kind === 'review'" class="block">
          <span
            class="mb-1.5 block text-xs tracking-wide text-white/45 uppercase"
            >Voto</span
          >
          <div class="flex gap-2">
            <button
              v-for="score in 5"
              :key="score"
              type="button"
              class="grid size-11 place-items-center rounded-xl border transition-colors"
              :class="
                feedback.rating >= score
                  ? 'border-brand-red-500/60 bg-brand-red-500/15 text-brand-red-300'
                  : 'border-white/15 text-white/40'
              "
              @click="feedback.rating = score"
            >
              <UIcon name="i-lucide-star" class="size-5" />
            </button>
          </div>
        </label>

        <label class="block">
          <span
            class="mb-1.5 block text-xs tracking-wide text-white/45 uppercase"
            >Messaggio</span
          >
          <textarea
            v-model="feedback.body"
            rows="4"
            class="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white"
          />
        </label>

        <UAlert
          v-if="feedbackMessage"
          color="info"
          variant="subtle"
          :description="feedbackMessage"
        />

        <UButton
          color="primary"
          block
          :loading="feedbackPending"
          label="Invia"
          @click="sendFeedback"
        />
      </div>
    </section>

    <p v-if="feedbackMessage && !feedbackOpen" class="text-sm text-green-400">
      {{ feedbackMessage }}
    </p>

    <div
      v-if="!bundle?.posts.length"
      class="rounded-2xl border border-dashed border-white/15 p-10 text-center text-white/50"
    >
      Nessuna comunicazione pubblicata.
    </div>

    <article
      v-for="post in bundle?.posts ?? []"
      :key="String(post.id)"
      class="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
    >
      <div class="flex flex-wrap items-center gap-2">
        <span
          v-if="post.pinned"
          class="bg-brand-red-500/15 text-brand-red-300 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase"
          >In evidenza</span
        >
        <span
          class="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] tracking-wide text-white/60 uppercase"
        >
          {{ post.post_type === 'poll' ? 'Sondaggio' : 'Annuncio' }}
        </span>
        <span class="text-xs text-white/35">
          {{ formatPublicContentDate(post.published_at) }}
        </span>
      </div>

      <h2 class="font-display mt-3 text-lg font-semibold text-white">
        {{ post.title }}
      </h2>

      <NuxtImg
        v-if="post.image_path"
        :src="post.image_path"
        :alt="post.title ?? ''"
        class="mt-4 w-full rounded-xl object-cover"
        loading="lazy"
      />

      <p
        v-if="post.body"
        class="mt-3 text-sm leading-6 whitespace-pre-line text-white/60"
      >
        {{ post.body }}
      </p>

      <!-- Prima del voto le opzioni sono pulsanti; dopo, percentuali. -->
      <div
        v-if="
          post.post_type === 'poll' && optionsByPost[String(post.id)]?.length
        "
        class="mt-4 space-y-2"
      >
        <template v-if="!myVoteByPost[String(post.id)]">
          <button
            v-for="option in optionsByPost[String(post.id)]"
            :key="String(option.id)"
            type="button"
            :disabled="votingPost === String(post.id)"
            class="flex min-h-11 w-full items-center rounded-xl border border-white/15 px-4 text-sm text-white/80 transition-colors hover:border-white/30 hover:bg-white/5 disabled:opacity-50"
            @click="vote(String(post.id), String(option.id))"
          >
            {{ option.label }}
          </button>
        </template>

        <template v-else>
          <div
            v-for="option in optionsByPost[String(post.id)]"
            :key="String(option.id)"
            class="relative overflow-hidden rounded-xl border px-4 py-2.5"
            :class="
              myVoteByPost[String(post.id)] === String(option.id)
                ? 'border-brand-red-500/50'
                : 'border-white/10'
            "
          >
            <div
              class="absolute inset-y-0 left-0 bg-white/[0.06]"
              :style="{
                width: percentage(String(post.id), option.votes) + '%',
              }"
            />
            <div class="relative flex items-center justify-between text-sm">
              <span class="text-white/85">{{ option.label }}</span>
              <span class="text-white/50">
                {{ percentage(String(post.id), option.votes) }}%
              </span>
            </div>
          </div>
          <p class="text-xs text-white/35">
            {{ totalVotes(String(post.id)) }} voti · puoi cambiare la tua scelta
          </p>
        </template>
      </div>
    </article>
  </div>
</template>
