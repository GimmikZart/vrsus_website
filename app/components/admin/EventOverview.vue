<script setup lang="ts">
import type {
  EventOverviewPayload,
  EventOverviewTournament,
} from '~~/shared/types/event-overview'
import { formatPublicEventPrice } from '~/composables/usePublicEvents'
import {
  tournamentFormatLabel,
  tournamentStatusLabel,
} from '~/composables/useTournaments'

// Riepilogo di una giornata: informazioni in alto e le schede della serata. E
// lo stesso blocco nella dashboard e nella scheda di un evento; cambiano solo
// le azioni, che arrivano dallo slot.
const props = defineProps<{ data: EventOverviewPayload }>()

const isLive = computed(() => props.data.mode === 'live')
const isPast = computed(() => props.data.mode === 'past')

/**
 * Prenotati e partecipanti sono due domande diverse: quante persone hanno
 * detto che vengono e chi e effettivamente entrato. Prima dell avvio la
 * seconda non esiste ancora, quindi la scheda compare solo a evento in corso o
 * concluso; i prenotati restano sempre a vista.
 */
const showAttendees = computed(() => isLive.value || isPast.value)

// La scheda in alto si richiude: durante la serata conta la lista, non il
// prezzo della giornata, e su mobile quei dati costano mezzo schermo.
const detailsOpen = ref(true)

const tabs = computed(() => [
  {
    value: 'booked',
    label: 'Prenotati',
    count: props.data.counts?.booked ?? 0,
  },
  ...(showAttendees.value
    ? [
        {
          value: 'attendees',
          label: 'Partecipanti',
          count: props.data.counts?.checkedIn ?? 0,
        },
      ]
    : []),
  {
    value: 'tournaments',
    label: 'Tornei',
    count: props.data.tournaments.length,
  },
  {
    value: 'platforms',
    label: 'Piattaforme',
    count: props.data.platforms.length,
  },
])

// A serata avviata o chiusa la prima cosa da guardare e chi c e davvero.
const activeTab = ref(showAttendees.value ? 'attendees' : 'booked')

// Cambiando evento la scheda aperta puo non esistere piu: senza questo la
// pagina resterebbe su una vista vuota.
watch(tabs, (list) => {
  if (!list.some((tab) => tab.value === activeTab.value)) {
    activeTab.value = list[0]?.value ?? 'booked'
  }
})

// Il cronometro dei tornei ha bisogno di un orologio: un solo intervallo per
// pagina, fermato quando la pagina viene lasciata.
const now = ref(Date.now())
let ticker: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  ticker = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => {
  if (ticker) clearInterval(ticker)
})

const people = computed(() =>
  activeTab.value === 'attendees'
    ? props.data.bookings.filter((row) => row.checkedInAt !== null)
    : props.data.bookings,
)

/** Prenotati senza tessera, solo dove la tessera serve davvero. */
const missingArci = computed(() =>
  props.data.event?.arciRequired ? (props.data.counts?.missingArci ?? 0) : 0,
)

/**
 * Giorno dell evento in forma breve. L anno compare solo quando non e quello
 * corrente: sulla dashboard sarebbe sempre ridondante.
 */
const eventDay = computed(() => {
  const startsAt = props.data.event?.startsAt
  if (!startsAt) return 'Data da definire'
  const start = new Date(startsAt)
  if (Number.isNaN(start.getTime())) return 'Data da definire'

  const label = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year:
      start.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  }).format(start)

  return label.charAt(0).toUpperCase() + label.slice(1)
})

/** Fascia oraria dell evento, staccata dal giorno per dare gerarchia. */
const eventTime = computed(() => {
  const event = props.data.event
  if (!event?.startsAt) return null
  const start = new Date(event.startsAt)
  if (Number.isNaN(start.getTime())) return null

  const time = (value: Date) =>
    new Intl.DateTimeFormat('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(value)

  const end = event.endsAt ? new Date(event.endsAt) : null
  const endLabel = end && !Number.isNaN(end.getTime()) ? time(end) : null

  return endLabel ? `${time(start)} – ${endLabel}` : time(start)
})

/**
 * Il numero grande della scheda: a evento avviato chi e presente sul totale
 * dei prenotati, prima dell avvio i prenotati sulla capienza.
 */
const headline = computed(() => {
  const counts = props.data.counts
  return showAttendees.value
    ? {
        label: 'Presenti',
        value: counts?.checkedIn ?? 0,
        total: counts?.booked ?? 0,
      }
    : {
        label: 'Prenotati',
        value: counts?.booked ?? 0,
        total: props.data.event?.maxCapacity ?? null,
      }
})

/** Il resto dei dati della giornata, che vive nella parte richiudibile. */
const details = computed(() => {
  const event = props.data.event
  if (!event) return []

  const rows: { label: string; value: string }[] = [
    {
      label: 'Prezzo giornata',
      value: formatPublicEventPrice(event.priceCents, event.paymentRequired),
    },
    { label: 'Postazioni', value: String(event.platformsCount) },
    { label: 'Tornei', value: String(props.data.tournaments.length) },
  ]

  // A evento avviato il numero grande mostra presenti su prenotati: la
  // capienza della sala non ci sta piu e torna qui.
  if (showAttendees.value) {
    rows.push({
      label: 'Capienza',
      value: event.maxCapacity ? String(event.maxCapacity) : 'Senza limite',
    })
  }

  rows.push({
    label: 'Tessera ARCI',
    value: event.arciRequired ? 'Obbligatoria' : 'Non richiesta',
  })

  if (props.data.counts?.waitlisted) {
    rows.push({
      label: 'Lista d’attesa',
      value: String(props.data.counts.waitlisted),
    })
  }

  return rows
})

/**
 * Ordine dei tornei: prima quelli in corso, poi quelli ancora da giocare, in
 * fondo i conclusi. A parita di stato resta l ordine di orario deciso dal
 * server, perche il sort di JavaScript e stabile.
 */
function tournamentRank(status: string) {
  if (status === 'running') return 0
  if (status === 'completed') return 2
  return 1
}

const orderedTournaments = computed(() =>
  [...props.data.tournaments].sort(
    (first, second) =>
      tournamentRank(first.status) - tournamentRank(second.status),
  ),
)

/** Orario di inizio del torneo: il giorno e quello dell evento. */
function tournamentTime(tournament: EventOverviewTournament) {
  if (!tournament.startsAt) return 'Orario da definire'
  const start = new Date(tournament.startsAt)
  if (Number.isNaN(start.getTime())) return 'Orario da definire'
  return new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(start)
}

function formatDelta(milliseconds: number) {
  const total = Math.max(0, Math.floor(milliseconds / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`
}

/**
 * Conto alla rovescia nell'ultima ora prima dell'inizio, cronometro a torneo
 * avviato. Fuori da questa finestra basta l'orario.
 */
function tournamentClock(tournament: EventOverviewTournament) {
  if (!tournament.startsAt || tournament.status === 'completed') return null

  const start = new Date(tournament.startsAt).getTime()
  if (Number.isNaN(start)) return null
  const delta = start - now.value

  if (tournament.status === 'running') {
    return delta > 0
      ? { label: 'In corso', tone: 'live' as const }
      : { label: `+${formatDelta(-delta)}`, tone: 'live' as const }
  }

  if (delta > 0 && delta <= 60 * 60 * 1000) {
    return { label: `-${formatDelta(delta)}`, tone: 'soon' as const }
  }

  if (delta <= 0) return { label: 'Da avviare', tone: 'soon' as const }

  return null
}

function tournamentStateLabel(tournament: EventOverviewTournament) {
  if (tournament.status === 'running') return 'In corso'
  if (tournament.status === 'completed') return 'Concluso'
  if (tournament.startsAt) {
    const delta = new Date(tournament.startsAt).getTime() - now.value
    if (delta > 0 && delta <= 30 * 60 * 1000) return 'Inizia a breve'
  }
  return tournamentStatusLabel(tournament.status)
}

function bookingStatusLabel(value: string) {
  return (
    {
      confirmed: 'Confermata',
      waitlisted: 'Lista d’attesa',
      no_show: 'Assente',
    }[value] ?? value
  )
}
</script>

<template>
  <div v-if="data.event">
    <!--
      Scheda della giornata. Sempre visibili lo stato, quando si gioca e il
      numero che conta adesso; il resto sta nella parte richiudibile.
    -->
    <section
      class="rounded-2xl border"
      :class="
        isLive
          ? 'border-brand-red-500/40 bg-brand-red-500/[0.06]'
          : 'border-white/10 bg-white/[0.04]'
      "
    >
      <div class="flex items-start gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
        <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span
            class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] uppercase"
            :class="
              isLive
                ? 'bg-brand-red-500/20 text-brand-red-300'
                : 'bg-white/10 text-white/70'
            "
          >
            <UiVrsusLiveDot v-if="isLive" size="0.4rem" />
            {{ isLive ? 'Live' : isPast ? 'Conclusa' : 'Da avviare' }}
          </span>
          <span
            v-if="data.event.venueName"
            class="truncate rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] text-white/55"
            >{{ data.event.venueName }}</span
          >
        </div>

        <button
          type="button"
          class="-mr-1 inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          :aria-expanded="detailsOpen"
          aria-controls="event-overview-details"
          @click="detailsOpen = !detailsOpen"
        >
          <span class="hidden sm:inline">Dettagli</span>
          <span class="sr-only sm:hidden">Mostra o nascondi i dettagli</span>
          <UIcon
            name="i-lucide-chevron-down"
            class="size-4 transition-transform duration-200"
            :class="detailsOpen ? 'rotate-180' : ''"
          />
        </button>
      </div>

      <div
        class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 px-4 pt-3 pb-4 sm:px-5 sm:pb-5"
      >
        <div class="min-w-0">
          <p
            class="font-display text-xl leading-tight font-semibold text-white sm:text-2xl"
          >
            {{ eventDay }}
          </p>
          <p v-if="eventTime" class="mt-1 text-sm text-white/50">
            {{ eventTime }}
          </p>
        </div>

        <div class="text-right">
          <p
            class="font-display text-3xl leading-none font-bold text-white tabular-nums sm:text-4xl"
          >
            {{ headline.value
            }}<span
              v-if="headline.total"
              class="text-xl font-semibold text-white/30 sm:text-2xl"
              >/{{ headline.total }}</span
            >
          </p>
          <p
            class="mt-1.5 text-[11px] font-medium tracking-[0.16em] text-white/40 uppercase"
          >
            {{ headline.label }}
          </p>
        </div>
      </div>

      <!--
        Parte richiudibile: la griglia a righe 0fr/1fr fa scorrere l apertura
        senza misurare l altezza con JavaScript.
      -->
      <div
        id="event-overview-details"
        class="grid transition-[grid-template-rows] duration-200 ease-out"
        :class="detailsOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
      >
        <div class="overflow-hidden">
          <dl
            class="grid grid-cols-2 gap-x-4 gap-y-3.5 border-t border-white/10 px-4 py-4 sm:grid-cols-4 sm:px-5"
          >
            <div v-for="item in details" :key="item.label" class="min-w-0">
              <dt
                class="text-[11px] font-medium tracking-[0.14em] text-white/35 uppercase"
              >
                {{ item.label }}
              </dt>
              <dd class="mt-1 text-sm font-semibold text-white/90">
                {{ item.value }}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div
        v-if="$slots.actions"
        class="border-t border-white/10 px-4 py-3.5 sm:px-5"
      >
        <slot name="actions" />
      </div>
    </section>

    <!--
      Le schede restano agganciate in alto: con liste lunghe l'operatore deve
      poter cambiare vista senza risalire tutta la pagina.
    -->
    <div class="sticky-tabs mt-5">
      <UiVrsusTabs v-model="activeTab" :items="tabs" />
    </div>

    <!--
      Niente riepilogo numerico qui: il conteggio sta gia sulla scheda della
      giornata e sull etichetta della scheda.
    -->
    <section
      v-if="activeTab === 'booked' || activeTab === 'attendees'"
      class="mt-4"
    >
      <UAlert
        v-if="activeTab === 'booked' && missingArci"
        class="mb-4"
        color="warning"
        variant="subtle"
        icon="i-lucide-id-card"
        :description="`${missingArci} ${missingArci === 1 ? 'prenotato non ha' : 'prenotati non hanno'} la tessera ARCI valida per questa stagione.`"
      />

      <p v-if="!people.length" class="text-sm text-white/45">
        {{
          activeTab !== 'attendees'
            ? 'Non ci sono ancora prenotazioni per questo evento.'
            : isPast
              ? 'Nessuno ha fatto il check-in a questa giornata.'
              : 'Nessun partecipante ha ancora passato il QR code.'
        }}
      </p>

      <template v-else>
        <!-- Mobile: card per prenotato -->
        <ul class="space-y-2 lg:hidden">
          <li v-for="person in people" :key="person.bookingId">
            <NuxtLink
              :to="`/admin/utenti/${person.userId}`"
              class="block rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 transition-colors hover:bg-white/[0.06]"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate font-medium text-white">
                    {{
                      [person.firstName, person.lastName]
                        .filter(Boolean)
                        .join(' ') || person.displayName
                    }}
                  </p>
                  <p class="mt-0.5 text-xs text-white/45">
                    <span v-if="person.age !== null"
                      >{{ person.age }} anni · </span
                    >{{ person.nickname ?? person.displayName }}
                  </p>
                </div>
                <div class="flex shrink-0 items-center gap-2">
                  <span
                    v-if="data.event.arciRequired && !person.arciCardValid"
                    class="rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-200"
                    >No ARCI</span
                  >
                  <UIcon
                    v-if="person.firstTime"
                    name="i-lucide-badge-check"
                    class="size-5 text-emerald-300"
                    aria-label="Prima volta da VRSUS"
                  />
                </div>
              </div>
              <div class="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
                <span
                  v-for="tournament in person.tournaments"
                  :key="tournament.id"
                  class="rounded-md bg-white/10 px-2 py-0.5 text-white/70"
                  >{{ tournament.gameName ?? tournament.name }}</span
                >
                <span v-if="!person.tournaments.length" class="text-white/30"
                  >Nessun torneo</span
                >
              </div>
            </NuxtLink>
          </li>
        </ul>

        <!-- Desktop: tabella -->
        <div class="hidden overflow-x-auto lg:block">
          <table class="w-full min-w-[46rem] text-left text-sm">
            <thead class="text-xs tracking-wide text-white/40 uppercase">
              <tr class="border-b border-white/10">
                <th scope="col" class="px-3 py-2 font-medium">Nome</th>
                <th scope="col" class="px-3 py-2 font-medium">Cognome</th>
                <th scope="col" class="px-3 py-2 font-medium">Eta</th>
                <th scope="col" class="px-3 py-2 font-medium">Tornei</th>
                <th scope="col" class="px-3 py-2 font-medium">Stato</th>
                <th scope="col" class="px-3 py-2 text-center font-medium">
                  ARCI
                </th>
                <th scope="col" class="px-3 py-2 text-center font-medium">
                  Prima volta
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/[0.06]">
              <tr
                v-for="person in people"
                :key="person.bookingId"
                class="transition-colors hover:bg-white/[0.03]"
              >
                <td class="px-3 py-2.5">
                  <NuxtLink
                    :to="`/admin/utenti/${person.userId}`"
                    class="text-white hover:underline"
                    >{{ person.firstName ?? person.displayName }}</NuxtLink
                  >
                </td>
                <td class="px-3 py-2.5 text-white/80">
                  {{ person.lastName ?? '—' }}
                </td>
                <td class="px-3 py-2.5 text-white/60">
                  {{ person.age ?? '—' }}
                </td>
                <td class="px-3 py-2.5">
                  <span v-if="person.tournaments.length" class="text-white/75">
                    {{
                      person.tournaments
                        .map((item) => item.gameName ?? item.name)
                        .join(' | ')
                    }}
                  </span>
                  <span v-else class="text-white/30">—</span>
                </td>
                <td class="px-3 py-2.5 text-white/60">
                  {{ bookingStatusLabel(person.status) }}
                  <span v-if="person.checkedInAt" class="text-emerald-300">
                    · presente</span
                  >
                </td>
                <td class="px-3 py-2.5 text-center">
                  <UIcon
                    v-if="person.arciCardValid"
                    name="i-lucide-id-card"
                    class="size-5 text-emerald-300"
                    aria-label="Tessera ARCI valida"
                  />
                  <span
                    v-else-if="data.event.arciRequired"
                    class="text-amber-300"
                    aria-label="Tessera ARCI mancante"
                    >mancante</span
                  >
                  <span v-else class="text-white/25">—</span>
                </td>
                <td class="px-3 py-2.5 text-center">
                  <UIcon
                    v-if="person.firstTime"
                    name="i-lucide-check"
                    class="size-5 text-emerald-300"
                    aria-label="Prima volta da VRSUS"
                  />
                  <span v-else class="text-white/25">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </section>

    <section v-else-if="activeTab === 'tournaments'" class="mt-4">
      <p v-if="!orderedTournaments.length" class="text-sm text-white/45">
        Nessun torneo collegato a questo evento.
      </p>

      <ul v-else class="grid gap-3 sm:grid-cols-2">
        <li v-for="tournament in orderedTournaments" :key="tournament.id">
          <NuxtLink
            :to="`/admin/tornei/${tournament.id}`"
            class="block h-full rounded-2xl border bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.06]"
            :class="
              tournament.status === 'running'
                ? 'border-brand-red-500/35'
                : tournament.status === 'completed'
                  ? 'border-white/[0.07] opacity-70'
                  : 'border-white/10'
            "
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate font-medium text-white">
                  {{ tournament.gameName ?? tournament.name }}
                </p>
                <p class="mt-0.5 truncate text-sm text-white/50">
                  <span v-if="tournament.platformName"
                    >{{ tournament.platformName }} · </span
                  >{{ tournamentFormatLabel(tournament.format) }}
                </p>
              </div>
              <span
                class="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] tracking-wide uppercase"
                :class="
                  tournament.status === 'running'
                    ? 'bg-brand-red-500/20 text-brand-red-300'
                    : 'bg-white/10 text-white/60'
                "
                ><UiVrsusLiveDot
                  v-if="tournament.status === 'running'"
                  size="0.35rem"
                />{{ tournamentStateLabel(tournament) }}</span
              >
            </div>

            <div class="mt-3.5 flex items-end justify-between gap-3">
              <div>
                <p class="font-display text-xl font-semibold text-white">
                  {{ tournamentTime(tournament) }}
                </p>
                <p
                  v-if="tournamentClock(tournament)"
                  class="mt-0.5 font-mono text-xs tabular-nums"
                  :class="
                    tournamentClock(tournament)!.tone === 'live'
                      ? 'text-brand-red-300'
                      : 'text-amber-300'
                  "
                >
                  {{ tournamentClock(tournament)!.label }}
                </p>
              </div>
              <dl class="flex gap-4 text-xs text-white/45">
                <div class="text-right">
                  <dt>Iscritti</dt>
                  <dd class="text-white/80">{{ tournament.entriesCount }}</dd>
                </div>
                <div v-if="showAttendees" class="text-right">
                  <dt>Presenti</dt>
                  <dd class="text-white/80">{{ tournament.checkedInCount }}</dd>
                </div>
                <div v-if="showAttendees" class="text-right">
                  <dt>Partite</dt>
                  <dd class="text-white/80">
                    {{ tournament.matchesPlayed }}/{{ tournament.matchesTotal }}
                  </dd>
                </div>
              </dl>
            </div>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <section v-else class="mt-4">
      <p v-if="!data.platforms.length" class="text-sm text-white/45">
        Nessuna postazione configurata per questo evento.
      </p>

      <ul v-else class="grid gap-3 sm:grid-cols-2">
        <li
          v-for="platform in data.platforms"
          :key="platform.id"
          class="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
        >
          <div class="flex items-center gap-3">
            <span
              class="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/[0.06]"
            >
              <img
                v-if="platform.imagePath"
                :src="platform.imagePath"
                :alt="platform.name"
                class="size-full object-cover"
              />
              <UIcon
                v-else
                name="i-lucide-monitor"
                class="size-5 text-white/40"
              />
            </span>
            <div class="min-w-0">
              <p class="truncate font-medium text-white">{{ platform.name }}</p>
              <p class="mt-0.5 text-xs text-white/45">
                <span v-if="platform.code">{{ platform.code }} · </span>
                {{ platform.games.length }} giochi
              </p>
            </div>
          </div>

          <ul v-if="platform.games.length" class="mt-3 flex flex-wrap gap-1.5">
            <li
              v-for="game in platform.games"
              :key="game.id"
              class="rounded-md bg-white/[0.06] px-2 py-1 text-xs text-white/75"
            >
              {{ game.name }}
            </li>
          </ul>
          <p v-else class="mt-3 text-xs text-white/35">
            Nessun gioco assegnato a questa postazione.
          </p>
        </li>
      </ul>
    </section>
  </div>
</template>
