<script setup lang="ts">
import type { Database } from '~/types/database.types'
import { formatPublicEventPrice } from '~/composables/usePublicEvents'

definePageMeta({ layout: 'app', middleware: ['auth'] })

// Le giornate viste dal cliente: in corso, in programma, storico. E la stessa
// lettura della console ma senza nessun comando di modifica: qui si apre una
// data per leggerla e, se e ancora aperta, per prenotarsi (DEC-042).
const client = useSupabaseClient<Database>()

type PublicEventRow = Database['public']['Views']['public_events']['Row']

const { data: events, status } = await useAsyncData<PublicEventRow[]>(
  'app-events',
  async () => {
    const { data } = await client
      .from('public_events')
      .select('*')
      .order('starts_at', { ascending: true })
    return data ?? []
  },
)

const { data: myBookings } = await useMyBookings()

const bookingByEvent = computed(() => {
  const map: Record<string, string> = {}
  for (const booking of myBookings.value ?? []) {
    if (['confirmed', 'waitlisted'].includes(booking.status)) {
      map[booking.event_id] = booking.status
    }
  }
  return map
})

const now = Date.now()

function isPast(event: PublicEventRow) {
  if (event.status === 'completed') return true
  const endsAt = event.ends_at ? new Date(event.ends_at).getTime() : null
  return endsAt !== null && endsAt < now
}

const running = computed(() =>
  (events.value ?? []).filter((event) => event.status === 'running'),
)

const upcoming = computed(() =>
  (events.value ?? []).filter(
    (event) => event.status === 'scheduled' && !isPast(event),
  ),
)

// Lo storico si legge dal piu recente: le date vecchie interessano meno.
const past = computed(() =>
  (events.value ?? [])
    .filter((event) => event.status !== 'running' && isPast(event))
    .sort(
      (first, second) =>
        new Date(second.starts_at ?? 0).getTime() -
        new Date(first.starts_at ?? 0).getTime(),
    ),
)

const groups = computed(() => [
  { key: 'running', title: 'In corso', items: running.value },
  { key: 'upcoming', title: 'In programma', items: upcoming.value },
  { key: 'past', title: 'Storico', items: past.value },
])

function eventDay(event: PublicEventRow) {
  if (!event.starts_at) return 'Data da definire'
  const start = new Date(event.starts_at)
  if (Number.isNaN(start.getTime())) return 'Data da definire'

  const day = new Intl.DateTimeFormat('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year:
      start.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  }).format(start)
  const time = new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(start)

  const label = `${day} · ${time}`
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/** Posti: la view espone lo stato solo quando l'evento lo rende visibile. */
function capacityLabel(event: PublicEventRow) {
  if (event.public_confirmed_count !== null) {
    return `${event.public_confirmed_count} / ${event.public_max_capacity ?? '—'} posti`
  }
  return (
    {
      full: 'Completo',
      almost_full: 'Quasi completo',
      available: 'Posti disponibili',
    }[event.public_capacity_status ?? ''] ?? null
  )
}

useSeoMeta({ title: 'Eventi — VRSUS', robots: 'noindex, nofollow' })
</script>

<template>
  <div class="space-y-6">
    <header>
      <p
        class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
      >
        Calendario
      </p>
      <h1
        class="font-display mt-2 text-2xl font-semibold text-white sm:text-3xl"
      >
        Eventi
      </h1>
    </header>

    <div v-if="status === 'pending'" class="space-y-3">
      <div
        v-for="index in 3"
        :key="index"
        class="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"
      />
    </div>

    <div
      v-else-if="!events?.length"
      class="rounded-2xl border border-dashed border-white/15 p-10 text-center text-white/50"
    >
      Nessun evento pubblicato. Appena fissiamo la prossima data la trovi qui.
    </div>

    <template v-else>
      <section
        v-for="group in groups.filter((item) => item.items.length)"
        :key="group.key"
      >
        <h2
          class="text-xs font-semibold tracking-[0.18em] text-white/40 uppercase"
        >
          {{ group.title }}
        </h2>

        <ul v-vrsus-motion="'cards'" class="mt-3 space-y-3">
          <li v-for="event in group.items" :key="String(event.id)">
            <NuxtLink
              :to="`/app/eventi/${event.id}`"
              class="block rounded-2xl border p-4 transition-colors"
              :class="
                event.status === 'running'
                  ? 'border-brand-red-500/35 bg-brand-red-500/[0.06] hover:border-brand-red-500/60'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/25'
              "
            >
              <div class="flex flex-wrap items-center gap-2">
                <span
                  v-if="event.status === 'running'"
                  class="bg-brand-red-500/20 text-brand-red-300 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase"
                >
                  <UiVrsusLiveDot size="0.4rem" />
                  Live
                </span>
                <span
                  v-if="bookingByEvent[String(event.id)] === 'confirmed'"
                  class="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300"
                  >Sei prenotato</span
                >
                <span
                  v-else-if="bookingByEvent[String(event.id)] === 'waitlisted'"
                  class="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-200"
                  >In lista d’attesa</span
                >
                <UiVrsusArciChip :required="event.arci_required" size="sm" />
              </div>

              <div class="mt-2 flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p
                    class="font-display truncate text-lg font-semibold text-white"
                  >
                    {{ event.title }}
                  </p>
                  <p class="mt-0.5 text-sm text-white/55">
                    {{ eventDay(event)
                    }}<span v-if="event.venue_name">
                      · {{ event.venue_name }}</span
                    >
                  </p>
                </div>
                <UIcon
                  name="i-lucide-chevron-right"
                  class="mt-1 size-5 shrink-0 text-white/25"
                />
              </div>

              <p
                class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
              >
                <span class="text-white/70">{{
                  formatPublicEventPrice(
                    event.price_cents,
                    event.payment_required,
                  )
                }}</span>
                <span v-if="capacityLabel(event)" class="text-white/40">{{
                  capacityLabel(event)
                }}</span>
              </p>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
