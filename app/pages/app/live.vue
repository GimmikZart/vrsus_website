<script setup lang="ts">
import QRCode from 'qrcode'
import type { Database } from '~/types/database.types'
import { getMyBookingQr, useMyBookings } from '~/composables/useBookings'
import {
  formatTournamentDate,
  tournamentStatusLabel,
  tournamentMatchStatusLabel,
} from '~/composables/useTournaments'
import { buildMyLiveTournaments } from '~~/shared/utils/live-day'

definePageMeta({ layout: 'app', middleware: ['auth'] })

// La serata, vista da chi la vive. In alto quello che serve adesso: il
// biglietto prima di entrare, i propri tornei dopo. Sotto, la giornata come la
// vede tutta la sala: tornei e postazioni. Nessun dato degli altri clienti:
// prenotati e presenti restano in console (DEC-042).
const client = useSupabaseClient<Database>()
const user = useSupabaseUser()

const {
  data: day,
  status,
  refresh: refreshDay,
} = await useAsyncData('app-live-day', async () => {
  const { data: event } = await client
    .from('public_events')
    .select('*')
    .eq('status', 'running')
    .order('starts_at', { ascending: true })
    .limit(1)
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

  const platforms = platformRows.data ?? []
  const tournaments = tournamentRows.data ?? []
  const tournamentIds = tournaments
    .map((row) => row.id)
    .filter((id): id is string => Boolean(id))
  const platformIds = platforms
    .map((row) => row.id)
    .filter((id): id is string => Boolean(id))

  const [games, entries, members, matches, participants, catalog] =
    await Promise.all([
      platformIds.length
        ? client
            .from('public_event_platform_games')
            .select('*')
            .in('event_platform_id', platformIds)
            .order('sort_order', { ascending: true })
        : Promise.resolve({ data: [] }),
      tournamentIds.length
        ? client
            .from('public_tournament_entries')
            .select('*')
            .in('tournament_id', tournamentIds)
        : Promise.resolve({ data: [] }),
      tournamentIds.length
        ? client
            .from('public_tournament_entry_members')
            .select('*')
            .in('tournament_id', tournamentIds)
        : Promise.resolve({ data: [] }),
      tournamentIds.length
        ? client
            .from('public_tournament_matches')
            .select('*')
            .in('tournament_id', tournamentIds)
        : Promise.resolve({ data: [] }),
      tournamentIds.length
        ? client
            .from('public_match_participants')
            .select('*')
            .in('tournament_id', tournamentIds)
        : Promise.resolve({ data: [] }),
      client
        .from('public_games')
        .select('id, name, platform_id, platform_name'),
    ])

  return {
    event,
    platforms,
    games: games.data ?? [],
    tournaments,
    entries: entries.data ?? [],
    members: members.data ?? [],
    matches: matches.data ?? [],
    participants: participants.data ?? [],
    catalog: catalog.data ?? [],
  }
})

const liveEvent = computed(() => day.value?.event ?? null)

// --- Il biglietto ----------------------------------------------------------

const { data: myBookings, refresh: refreshBookings } = await useMyBookings()

const myBooking = computed(
  () =>
    (myBookings.value ?? []).find(
      (booking) =>
        booking.event_id === liveEvent.value?.id &&
        ['confirmed', 'waitlisted'].includes(booking.status),
    ) ?? null,
)

const checkedIn = computed(() => Boolean(myBooking.value?.checked_in_at))

const qrDataUrl = ref('')
const qrError = ref('')

// Il QR si genera solo quando serve davvero: prenotazione confermata e
// ingresso non ancora passato.
async function loadQr() {
  const booking = myBooking.value
  if (!booking || booking.status !== 'confirmed' || checkedIn.value) {
    qrDataUrl.value = ''
    return
  }

  qrError.value = ''
  try {
    const qr = await getMyBookingQr(booking.id)
    if (!qr?.qr_token) {
      qrDataUrl.value = ''
      return
    }
    qrDataUrl.value = await QRCode.toDataURL(qr.qr_token, {
      width: 420,
      margin: 1,
      color: { dark: '#08090d', light: '#ffffff' },
    })
  } catch {
    qrError.value = 'Non è stato possibile generare il QR code.'
  }
}

watch(myBooking, loadQr, { immediate: true })

async function refreshAll() {
  await Promise.all([refreshDay(), refreshBookings()])
  await loadQr()
}

// --- I miei tornei ---------------------------------------------------------

const platformNameByEventPlatform = computed(() => {
  const map: Record<string, string> = {}
  for (const platform of day.value?.platforms ?? []) {
    if (platform.id) map[String(platform.id)] = platform.name ?? 'Postazione'
  }
  return map
})

const gameNameById = computed(() => {
  const map: Record<string, { name: string; platformName: string | null }> = {}
  for (const game of day.value?.catalog ?? []) {
    if (game.id) {
      map[String(game.id)] = {
        name: game.name ?? 'Gioco',
        platformName: game.platform_name ?? null,
      }
    }
  }
  return map
})

const tournamentRows = computed(() =>
  (day.value?.tournaments ?? []).map((tournament) => {
    const game = tournament.game_id
      ? gameNameById.value[String(tournament.game_id)]
      : undefined
    return {
      id: String(tournament.id),
      name: tournament.name ?? 'Torneo',
      status: String(tournament.status ?? 'draft'),
      startsAt: tournament.starts_at,
      gameName: game?.name ?? null,
      platformName: game?.platformName ?? null,
    }
  }),
)

const myEntryIds = computed(() => {
  const uid = user.value?.sub
  if (!uid) return []
  return (day.value?.members ?? [])
    .filter((member) => member.user_id === uid)
    .map((member) => String(member.entry_id))
})

const myTournaments = computed(() =>
  buildMyLiveTournaments({
    tournaments: tournamentRows.value,
    entries: (day.value?.entries ?? []).map((entry) => ({
      id: String(entry.id),
      tournamentId: String(entry.tournament_id),
      displayName: entry.display_name ?? 'Partecipante',
      status: String(entry.status ?? 'registered'),
    })),
    matches: (day.value?.matches ?? []).map((match) => ({
      id: String(match.id),
      tournamentId: String(match.tournament_id),
      stageNumber: match.stage_number ?? 1,
      roundNumber: match.round_number ?? 1,
      bracketPosition: match.bracket_position ?? 1,
      status: String(match.status ?? 'pending'),
      platformName: match.event_platform_id
        ? (platformNameByEventPlatform.value[String(match.event_platform_id)] ??
          null)
        : null,
    })),
    participants: (day.value?.participants ?? []).map((participant) => ({
      matchId: String(participant.match_id),
      entryId: participant.entry_id ? String(participant.entry_id) : null,
    })),
    myEntryIds: myEntryIds.value,
  }),
)

const myTournamentIds = computed(
  () => new Set(myTournaments.value.map((item) => item.tournamentId)),
)

/** Quanto manca alla mia partita, detto come lo direbbe un operatore. */
function waitLabel(matchesBefore: number, matchStatus: string) {
  if (matchStatus === 'called') return 'Ti stanno chiamando'
  if (matchStatus === 'running') return 'La tua partita è in corso'
  if (matchesBefore === 0) return 'Sei il prossimo'
  if (matchesBefore === 1) return 'Manca una partita alla tua'
  return `Mancano ${matchesBefore} partite alla tua`
}

// --- Le schede della giornata ----------------------------------------------

const activeTab = ref('tournaments')

const tabs = computed(() => [
  {
    value: 'tournaments',
    label: 'Tornei',
    count: tournamentRows.value.length,
  },
  {
    value: 'platforms',
    label: 'Piattaforme',
    count: day.value?.platforms.length ?? 0,
  },
])

const gamesByPlatform = computed(() => {
  const map: Record<string, string[]> = {}
  for (const game of day.value?.games ?? []) {
    if (!game.event_platform_id || !game.game_name) continue
    map[String(game.event_platform_id)] = [
      ...(map[String(game.event_platform_id)] ?? []),
      game.game_name,
    ]
  }
  return map
})

const orderedTournaments = computed(() =>
  [...tournamentRows.value].sort((first, second) => {
    const rank = (status: string) =>
      status === 'running' ? 0 : status === 'completed' ? 2 : 1
    return rank(first.status) - rank(second.status)
  }),
)

useSeoMeta({ title: 'Live — VRSUS', robots: 'noindex, nofollow' })
</script>

<template>
  <div class="space-y-6">
    <div
      v-if="status === 'pending' && !day"
      class="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"
    />

    <!-- Nessuna serata accesa: la voce Live sparisce da sola, ma per URL si arriva. -->
    <div
      v-else-if="!liveEvent"
      class="rounded-2xl border border-dashed border-white/15 p-10 text-center"
    >
      <UIcon name="i-lucide-radio" class="mx-auto size-8 text-white/30" />
      <p class="mt-4 font-medium text-white/80">Nessuna serata in corso</p>
      <p class="mt-2 text-sm text-white/50">
        Quando apriamo le porte questa pagina si accende.
      </p>
      <UButton
        class="mt-6"
        to="/app/eventi"
        color="primary"
        label="Vedi gli eventi"
      />
    </div>

    <template v-else>
      <header class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p
            class="text-brand-red-400 flex items-center gap-2 text-xs font-semibold tracking-[0.24em] uppercase"
          >
            Live <UiVrsusLiveDot size="0.5rem" />
          </p>
          <h1
            class="font-display mt-2 truncate text-2xl font-semibold text-white sm:text-3xl"
          >
            {{ liveEvent.title }}
          </h1>
        </div>
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-refresh-cw"
          label="Aggiorna"
          @click="refreshAll"
        />
      </header>

      <!-- Biglietto: c'e finche non si passa la porta, poi lascia il posto. -->
      <section
        v-if="myBooking?.status === 'confirmed' && !checkedIn"
        class="rounded-3xl border border-green-500/40 bg-green-500/[0.06] p-5 text-center"
      >
        <p
          class="text-[11px] font-semibold tracking-[0.18em] text-green-300 uppercase"
        >
          Il tuo biglietto
        </p>
        <div v-if="qrDataUrl" class="mt-4 flex flex-col items-center">
          <div class="rounded-2xl bg-white p-4">
            <img
              :src="qrDataUrl"
              alt="QR code della prenotazione"
              class="size-48"
            />
          </div>
          <p class="mt-3 text-sm text-white/55">
            Mostra questo codice all’ingresso.
          </p>
        </div>
        <div v-else-if="qrError" class="mt-4 text-sm text-red-300">
          {{ qrError }}
        </div>
        <div
          v-else
          class="mx-auto mt-4 h-52 w-52 animate-pulse rounded-2xl bg-white/5"
        />
      </section>

      <section
        v-else-if="myBooking?.status === 'waitlisted'"
        class="rounded-2xl border border-amber-500/30 bg-amber-500/[0.07] p-4 text-sm text-amber-100/85"
      >
        Sei in lista d’attesa. Se si libera un posto ricevi il biglietto e una
        notifica.
      </section>

      <!-- Senza prenotazione non si resta a bocca asciutta: si sa cosa fare. -->
      <section
        v-else-if="!myBooking"
        class="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/60"
      >
        Le prenotazioni per questa serata sono chiuse. Per entrare chiedi
        direttamente al personale se c’è ancora disponibilità.
      </section>

      <!-- Passata la porta, quello che conta e quando tocca a te. -->
      <section v-if="checkedIn && myTournaments.length">
        <h2 class="font-display text-lg font-semibold text-white">
          I tuoi tornei
        </h2>

        <ul class="mt-3 space-y-3">
          <li
            v-for="item in myTournaments"
            :key="item.tournamentId"
            class="rounded-2xl border p-4"
            :class="
              item.next && ['called', 'running'].includes(item.next.status)
                ? 'border-brand-red-500/50 bg-brand-red-500/[0.08]'
                : 'border-white/10 bg-white/[0.03]'
            "
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate font-medium text-white">
                  {{ item.gameName ?? item.name }}
                </p>
                <p class="mt-0.5 truncate text-xs text-white/45">
                  <span v-if="item.platformName"
                    >{{ item.platformName }} · </span
                  >{{ formatTournamentDate(item.startsAt) }}
                </p>
              </div>
              <span
                class="shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] tracking-wide text-white/65 uppercase"
                >{{ tournamentStatusLabel(item.status) }}</span
              >
            </div>

            <div v-if="item.next" class="mt-3 border-t border-white/10 pt-3">
              <p class="font-display text-base font-semibold text-white">
                {{ waitLabel(item.next.matchesBefore, item.next.status) }}
              </p>
              <!--
                Le righe si allargano su due colonne ma il valore puo andare a
                capo: in una manche da quattro gli avversari sono tre nomi e su
                un telefono non ci stanno in riga.
              -->
              <dl class="mt-2 grid gap-1.5 text-sm">
                <div class="flex justify-between gap-3">
                  <dt class="shrink-0 text-white/45">Avversario</dt>
                  <dd
                    class="min-w-0 flex-1 text-right break-words text-white/85"
                  >
                    {{
                      item.next.opponents.length
                        ? item.next.opponents.join(' · ')
                        : 'Da definire'
                    }}
                  </dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt class="shrink-0 text-white/45">Turno</dt>
                  <dd class="min-w-0 flex-1 text-right text-white/85">
                    {{ item.next.roundNumber }}ª ·
                    {{ tournamentMatchStatusLabel(item.next.status) }}
                  </dd>
                </div>
                <div
                  v-if="item.next.platformName"
                  class="flex justify-between gap-3"
                >
                  <dt class="shrink-0 text-white/45">Postazione</dt>
                  <dd
                    class="min-w-0 flex-1 text-right break-words text-white/85"
                  >
                    {{ item.next.platformName }}
                  </dd>
                </div>
              </dl>
            </div>

            <p v-else-if="item.done" class="mt-3 text-sm text-white/50">
              Per te questo torneo è finito. La classifica è nella scheda del
              torneo.
            </p>
            <p v-else class="mt-3 text-sm text-white/50">
              Il calendario non è ancora stato generato: appena parte trovi qui
              la tua partita.
            </p>

            <UButton
              class="mt-3"
              :to="`/app/tornei/${item.tournamentId}`"
              color="neutral"
              variant="ghost"
              size="sm"
              label="Apri il torneo"
            />
          </li>
        </ul>
      </section>

      <div class="sticky-tabs">
        <UiVrsusTabs v-model="activeTab" :items="tabs" />
      </div>

      <section v-if="activeTab === 'tournaments'">
        <p v-if="!orderedTournaments.length" class="text-sm text-white/45">
          Nessun torneo in programma per questa serata.
        </p>

        <ul v-else class="grid gap-3 sm:grid-cols-2">
          <li v-for="tournament in orderedTournaments" :key="tournament.id">
            <NuxtLink
              :to="`/app/tornei/${tournament.id}`"
              class="block h-full rounded-2xl border p-4 transition-colors"
              :class="
                tournament.status === 'running'
                  ? 'border-brand-red-500/35 bg-brand-red-500/[0.06]'
                  : tournament.status === 'completed'
                    ? 'border-white/[0.07] bg-white/[0.02] opacity-70'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/25'
              "
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate font-medium text-white">
                    {{ tournament.gameName ?? tournament.name }}
                  </p>
                  <p class="mt-0.5 truncate text-xs text-white/45">
                    <span v-if="tournament.platformName"
                      >{{ tournament.platformName }} · </span
                    >{{ formatTournamentDate(tournament.startsAt) }}
                  </p>
                </div>
                <span
                  v-if="myTournamentIds.has(tournament.id)"
                  class="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300"
                  >Iscritto</span
                >
              </div>
              <p class="mt-3 text-xs tracking-wide text-white/50 uppercase">
                {{ tournamentStatusLabel(tournament.status) }}
              </p>
            </NuxtLink>
          </li>
        </ul>
      </section>

      <section v-else>
        <p v-if="!day?.platforms.length" class="text-sm text-white/45">
          Nessuna postazione configurata per questa serata.
        </p>

        <ul v-else class="grid gap-3 sm:grid-cols-2">
          <li
            v-for="platform in day.platforms"
            :key="String(platform.id)"
            class="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
          >
            <UiVrsusEntityImage
              :src="platform.image_path"
              :alt="platform.name ?? 'Postazione'"
              kind="platform"
              class="aspect-[16/9] w-full"
            />
            <div class="p-4">
              <div class="flex items-center gap-2">
                <span
                  v-if="platform.code"
                  class="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-semibold tracking-wider text-white/70"
                  >{{ platform.code }}</span
                >
                <p class="truncate font-medium text-white">
                  {{ platform.name }}
                </p>
              </div>
              <ul
                v-if="gamesByPlatform[String(platform.id)]?.length"
                class="mt-3 flex flex-wrap gap-1.5"
              >
                <li
                  v-for="game in gamesByPlatform[String(platform.id)]"
                  :key="game"
                  class="rounded-md bg-white/[0.06] px-2 py-1 text-xs text-white/75"
                >
                  {{ game }}
                </li>
              </ul>
              <p v-else class="mt-3 text-xs text-white/35">
                Nessun gioco assegnato a questa postazione.
              </p>
            </div>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
