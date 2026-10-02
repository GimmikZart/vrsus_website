<script setup lang="ts">
import type { Database } from '~/types/database.types'
import { formatPublicEventPrice } from '~/composables/usePublicEvents'
import { tournamentStatusLabel } from '~/composables/useTournaments'
import {
  createEventBooking,
  getBookingErrorCode,
  useMyBookings,
} from '~/composables/useBookings'

definePageMeta({ layout: 'app', middleware: ['auth'] })

// Scheda di una giornata per il cliente: si legge tutto quello che c'e da
// sapere e, se le prenotazioni sono aperte, si prenota da qui con una
// conferma esplicita (DEC-042). Nessun comando di modifica: quelli vivono in
// console.
const route = useRoute()
const client = useSupabaseClient<Database>()
const eventId = computed(() => String(route.params.id))

const { data: detail, error } = await useAsyncData(
  () => `app-event-${eventId.value}`,
  async () => {
    const { data: event } = await client
      .from('public_events')
      .select('*')
      .eq('id', eventId.value)
      .maybeSingle()

    if (!event?.id) return null

    const [platformRows, tournamentRows] = await Promise.all([
      client
        .from('public_event_platforms')
        .select('*')
        .eq('event_id', event.id)
        .order('sort_order', { ascending: true }),
      client
        .from('public_tournaments')
        .select('*')
        .eq('event_id', event.id)
        .order('starts_at', { ascending: true }),
    ])

    const platformIds = (platformRows.data ?? [])
      .map((row) => row.id)
      .filter((id): id is string => Boolean(id))

    const gameRows = platformIds.length
      ? await client
          .from('public_event_platform_games')
          .select('*')
          .in('event_platform_id', platformIds)
          .order('sort_order', { ascending: true })
      : { data: [] }

    return {
      event,
      platforms: platformRows.data ?? [],
      games: gameRows.data ?? [],
      tournaments: tournamentRows.data ?? [],
    }
  },
)

if (error.value || !detail.value?.event) {
  throw createError({ statusCode: 404, statusMessage: 'Evento non trovato' })
}

const event = computed(() => detail.value?.event ?? null)
const returnTournament = computed(() => {
  const requestedId = route.query.torneo
  if (typeof requestedId !== 'string') return null
  return (
    (detail.value?.tournaments ?? []).find(
      (tournament) => tournament.id === requestedId,
    ) ?? null
  )
})

const gamesByPlatform = computed(() => {
  const map: Record<string, string[]> = {}
  for (const game of detail.value?.games ?? []) {
    if (!game.event_platform_id || !game.game_name) continue
    map[game.event_platform_id] = [
      ...(map[game.event_platform_id] ?? []),
      game.game_name,
    ]
  }
  return map
})

// --- Stato della mia prenotazione -----------------------------------------

const { data: myBookings, refresh: refreshBookings } = await useMyBookings()
onMounted(() => {
  void refreshBookings()
})

const myBooking = computed(
  () =>
    (myBookings.value ?? []).find(
      (booking) =>
        booking.event_id === eventId.value &&
        ['confirmed', 'waitlisted'].includes(booking.status),
    ) ?? null,
)

const { data: arciStatus } = await useMyArciStatus()

// Un minore senza consenso non puo prenotare: la guardia e nel database, qui
// la si anticipa per spiegare il motivo invece di mostrare un errore generico.
const { data: consent } = await useAsyncData('my-consent-status', async () => {
  const { data } = await client.rpc('my_consent_status')
  return data?.[0] ?? null
})

const blockedByConsent = computed(
  () => Boolean(consent.value?.is_minor) && !consent.value?.has_consent,
)

const isFull = computed(() => event.value?.public_capacity_status === 'full')

const bookingWindowOpen = computed(() => {
  const row = event.value
  if (!row || row.status !== 'scheduled' || !row.booking_enabled) return false
  const now = Date.now()
  const opensAt = row.booking_opens_at
    ? new Date(row.booking_opens_at).getTime()
    : null
  const closesAt = row.booking_closes_at
    ? new Date(row.booking_closes_at).getTime()
    : null
  return (
    (opensAt === null || now >= opensAt) &&
    (closesAt === null || now <= closesAt)
  )
})

const canBook = computed(
  () =>
    bookingWindowOpen.value &&
    !myBooking.value &&
    !blockedByConsent.value &&
    (!isFull.value || Boolean(event.value?.waitlist_enabled)),
)

const waitlistOnly = computed(
  () => isFull.value && Boolean(event.value?.waitlist_enabled),
)

const askBooking = ref(false)
const bookingPending = ref(false)
const bookingError = ref('')

async function confirmBooking() {
  bookingPending.value = true
  bookingError.value = ''

  try {
    await createEventBooking(eventId.value)
    askBooking.value = false
    await refreshBookings()
  } catch (bookError) {
    bookingError.value =
      {
        GUARDIAN_CONSENT_REQUIRED:
          'Serve il consenso di un genitore o tutore prima di prenotare.',
        EVENT_NOT_BOOKABLE: 'Le prenotazioni per questo evento sono chiuse.',
        BOOKING_NOT_OPEN: 'Le prenotazioni non sono ancora aperte.',
        ALREADY_BOOKED: 'Hai già una prenotazione per questo evento.',
        BOOKING_ALREADY_EXISTS: 'Hai già una prenotazione per questo evento.',
        EVENT_FULL: 'L’evento è completo e la lista d’attesa non è attiva.',
        WAITLIST_DISABLED:
          'L’evento è completo e la lista d’attesa non è attiva.',
      }[getBookingErrorCode(bookError)] ??
      'Prenotazione non riuscita. Riprova fra poco.'
  } finally {
    bookingPending.value = false
  }
}

const statusLabel = computed(
  () =>
    ({
      running: 'Serata in corso',
      scheduled: 'In programma',
      completed: 'Conclusa',
    })[event.value?.status ?? ''] ?? 'Evento',
)

const eventWhen = computed(() => {
  const startsAt = event.value?.starts_at
  if (!startsAt) return 'Data da definire'
  const start = new Date(startsAt)
  if (Number.isNaN(start.getTime())) return 'Data da definire'

  const day = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(start)
  const time = (value: Date) =>
    new Intl.DateTimeFormat('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(value)

  const end = event.value?.ends_at ? new Date(event.value.ends_at) : null
  const endLabel = end && !Number.isNaN(end.getTime()) ? time(end) : null
  const label = `${day} · ${time(start)}${endLabel ? `–${endLabel}` : ''}`
  return label.charAt(0).toUpperCase() + label.slice(1)
})

const infoRows = computed(() => {
  const row = event.value
  if (!row) return []

  const rows: { label: string; value: string; warn?: boolean }[] = [
    { label: 'Quando', value: eventWhen.value },
    { label: 'Dove', value: row.venue_name || 'Sede VRSUS' },
    {
      label: 'Costo',
      value: formatPublicEventPrice(row.price_cents, row.payment_required),
    },
    {
      label: 'Tessera ARCI',
      value: row.arci_required ? 'Obbligatoria' : 'Non richiesta',
      warn: Boolean(row.arci_required),
    },
  ]

  if (row.public_confirmed_count !== null) {
    rows.push({
      label: 'Posti',
      value: `${row.public_confirmed_count} / ${row.public_max_capacity ?? '—'}`,
    })
  }

  return rows
})

useSeoMeta({
  title: () => `${event.value?.title ?? 'Evento'} — VRSUS`,
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div v-if="event" class="space-y-6">
    <NuxtLink to="/app/eventi" class="text-sm text-white/45 hover:text-white">
      ← Eventi
    </NuxtLink>

    <header>
      <div class="flex flex-wrap items-center gap-2">
        <span
          class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase"
          :class="
            event.status === 'running'
              ? 'bg-brand-red-500/20 text-brand-red-300'
              : 'bg-white/10 text-white/60'
          "
        >
          <UiVrsusLiveDot v-if="event.status === 'running'" size="0.4rem" />
          {{ statusLabel }}
        </span>
        <UiVrsusArciChip :required="event.arci_required" size="sm" />
      </div>

      <h1
        class="font-display mt-3 text-2xl font-semibold text-white sm:text-3xl"
      >
        {{ event.title }}
      </h1>
      <p v-if="event.short_description" class="mt-2 text-white/60">
        {{ event.short_description }}
      </p>
    </header>

    <section
      v-if="returnTournament"
      class="border-brand-blue-400/30 bg-brand-blue-400/[0.08] rounded-2xl border p-4 sm:p-5"
    >
      <p
        class="text-brand-blue-200 text-xs font-semibold tracking-[0.16em] uppercase"
      >
        Per giocare a {{ returnTournament.name }}
      </p>
      <p class="mt-2 text-sm leading-6 text-white/75">
        1. Prenota un posto a questo evento. 2. Torna al torneo e conferma
        l’iscrizione. Il posto al torneo non viene riservato dalla prenotazione
        dell’evento.
      </p>
      <p
        v-if="myBooking?.status === 'waitlisted'"
        class="mt-2 text-sm text-amber-200"
      >
        Sei in lista d’attesa: attendi la conferma del posto prima di iscriverti
        al torneo.
      </p>
      <UButton
        v-if="myBooking?.status === 'confirmed'"
        class="mt-4"
        :to="`/app/tornei/${returnTournament.id}/prenota`"
        color="primary"
        :label="`Continua con ${returnTournament.name}`"
      />
    </section>

    <!-- Prenotazione: stato attuale e comando, sempre nello stesso posto. -->
    <section
      class="rounded-2xl border p-4 sm:p-5"
      :class="
        myBooking?.status === 'confirmed'
          ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
          : 'border-white/10 bg-white/[0.04]'
      "
    >
      <template v-if="myBooking">
        <p class="font-display text-base font-semibold text-white">
          {{
            myBooking.status === 'confirmed'
              ? 'Sei prenotato'
              : 'Sei in lista d’attesa'
          }}
        </p>
        <p class="mt-1 text-sm text-white/55">
          {{
            myBooking.status === 'confirmed'
              ? 'Mostra il QR del biglietto all’ingresso.'
              : 'Se si libera un posto ricevi il biglietto e una notifica.'
          }}
        </p>
        <UButton
          class="mt-4"
          :to="`/app/prenotazioni/${myBooking.id}`"
          color="neutral"
          variant="outline"
          label="Apri il biglietto"
        />
      </template>

      <template v-else-if="canBook">
        <p class="font-display text-base font-semibold text-white">
          {{ waitlistOnly ? 'Evento al completo' : 'Prenota il tuo posto' }}
        </p>
        <p class="mt-1 text-sm text-white/55">
          {{
            waitlistOnly
              ? 'Puoi entrare in lista d’attesa: se si libera un posto ricevi il biglietto.'
              : 'Prenotando riservi un posto per te. Il pagamento, quando previsto, avviene sul posto.'
          }}
        </p>

        <p
          v-if="event.arci_required && !arciStatus?.card_valid"
          class="mt-3 text-sm leading-6 text-amber-200/85"
        >
          Per questa giornata serve la tessera ARCI in corso di validità. Se non
          ce l’hai puoi farla da noi all’ingresso.
        </p>

        <UButton
          class="mt-4"
          color="primary"
          size="lg"
          :label="
            waitlistOnly ? 'Entra in lista d’attesa' : 'Prenota il tuo posto'
          "
          @click="askBooking = true"
        />
      </template>

      <template v-else-if="blockedByConsent">
        <p class="font-display text-base font-semibold text-white">
          Serve il consenso di un genitore
        </p>
        <p class="mt-1 text-sm text-white/55">
          Hai meno di 18 anni e non risulta un consenso registrato. Puoi
          aggiungerlo dalle impostazioni.
        </p>
        <UButton
          class="mt-4"
          to="/app/impostazioni"
          color="primary"
          label="Vai alle impostazioni"
        />
      </template>

      <template v-else>
        <p class="text-sm text-white/55">
          {{
            isFull && !event.waitlist_enabled
              ? 'L’evento è al completo e la lista d’attesa non è disponibile.'
              : event.status === 'running'
                ? 'Le prenotazioni sono chiuse: la serata è già cominciata. Chiedi al personale se c’è ancora posto.'
                : event.status === 'completed'
                  ? 'Questa giornata è conclusa.'
                  : 'Le prenotazioni per questa data non sono aperte.'
          }}
        </p>
      </template>

      <p v-if="bookingError" class="mt-3 text-sm text-red-300">
        {{ bookingError }}
      </p>
    </section>

    <section class="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <dl class="grid gap-3 sm:grid-cols-2">
        <div v-for="row in infoRows" :key="row.label" class="min-w-0">
          <dt class="text-[11px] tracking-[0.14em] text-white/35 uppercase">
            {{ row.label }}
          </dt>
          <dd
            class="mt-0.5 text-sm font-medium"
            :class="row.warn ? 'text-amber-200' : 'text-white/90'"
          >
            {{ row.value }}
          </dd>
        </div>
      </dl>
    </section>

    <section v-if="event.description">
      <p class="text-sm leading-6 whitespace-pre-line text-white/60">
        {{ event.description }}
      </p>
    </section>

    <section v-if="detail?.tournaments.length">
      <h2 class="font-display text-lg font-semibold text-white">
        Tornei della giornata
      </h2>
      <ul class="mt-3 space-y-2">
        <li
          v-for="tournament in detail.tournaments"
          :key="String(tournament.id)"
        >
          <NuxtLink
            :to="`/app/tornei/${tournament.id}`"
            class="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/25"
          >
            <div class="min-w-0">
              <p class="truncate font-medium text-white">
                {{ tournament.name }}
              </p>
              <p class="mt-0.5 text-xs text-white/45">
                {{ tournamentStatusLabel(String(tournament.status)) }}
              </p>
            </div>
            <UIcon
              name="i-lucide-chevron-right"
              class="size-5 shrink-0 text-white/25"
            />
          </NuxtLink>
        </li>
      </ul>
    </section>

    <section v-if="detail?.platforms.length">
      <h2 class="font-display text-lg font-semibold text-white">
        Postazioni e giochi
      </h2>
      <ul class="mt-3 grid gap-3 sm:grid-cols-2">
        <li
          v-for="platform in detail.platforms"
          :key="String(platform.id)"
          class="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
        >
          <div class="flex items-center gap-2">
            <span
              v-if="platform.code"
              class="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-semibold tracking-wider text-white/70"
              >{{ platform.code }}</span
            >
            <p class="truncate font-medium text-white">{{ platform.name }}</p>
          </div>
          <p
            v-if="platform.id && gamesByPlatform[String(platform.id)]?.length"
            class="mt-2 text-sm text-white/45"
          >
            {{ gamesByPlatform[String(platform.id)]?.join(' · ') }}
          </p>
        </li>
      </ul>
    </section>

    <UiVrsusConfirmDialog
      v-model="askBooking"
      :title="
        waitlistOnly
          ? 'Entrare in lista d’attesa?'
          : 'Confermi la prenotazione?'
      "
      :description="
        waitlistOnly
          ? 'Ti avvisiamo appena si libera un posto.'
          : 'Riservi un posto per te. Puoi annullare dal biglietto in area personale.'
      "
      :confirm-label="waitlistOnly ? 'Entra in lista' : 'Prenota'"
      :pending="bookingPending"
      @confirm="confirmBooking"
    >
      <dl class="space-y-2 rounded-xl bg-white/[0.04] p-3 text-sm">
        <div class="flex justify-between gap-3">
          <dt class="text-white/45">Evento</dt>
          <dd class="truncate text-right text-white/85">{{ event.title }}</dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-white/45">Quando</dt>
          <dd class="text-right text-white/85">{{ eventWhen }}</dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-white/45">Costo</dt>
          <dd class="text-right text-white/85">
            {{
              formatPublicEventPrice(event.price_cents, event.payment_required)
            }}
          </dd>
        </div>
        <div v-if="event.arci_required" class="flex justify-between gap-3">
          <dt class="text-white/45">Tessera ARCI</dt>
          <dd class="text-right text-amber-200">Obbligatoria</dd>
        </div>
      </dl>
    </UiVrsusConfirmDialog>
  </div>
</template>
