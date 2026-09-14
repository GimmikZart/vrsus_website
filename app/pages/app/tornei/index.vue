<script setup lang="ts">
import type { Database } from '~/types/database.types'
import {
  formatTournamentDate,
  tournamentStatusLabel,
} from '~/composables/useTournaments'

definePageMeta({ layout: 'app', middleware: ['auth'] })

const client = useSupabaseClient<Database>()

const filters = reactive({ platform: '', game: '', from: '' })

const { data: platforms } = await useAsyncData(
  'tournaments-platforms',
  async () => {
    const { data } = await client
      .from('public_platforms')
      .select('*')
      .order('name')
    return data ?? []
  },
)
const { data: games } = await useAsyncData('tournaments-games', async () => {
  const { data } = await client.from('public_games').select('*').order('name')
  return data ?? []
})

const { data: bundle } = await useAsyncData('app-tournaments', async () => {
  const [tournaments, entries] = await Promise.all([
    client
      .from('public_tournaments')
      .select('*')
      .order('starts_at', { ascending: true }),
    client.from('public_tournament_entries').select('*'),
  ])

  return {
    tournaments: tournaments.data ?? [],
    entries: entries.data ?? [],
  }
})

// Le iscrizioni proprie determinano il bordo verde della card. Il filtro sul
// proprio id e esplicito: un admin puo leggere le iscrizioni di tutti, quindi
// affidarsi alle sole RLS mostrerebbe "Iscritto" ovunque.
const user = useSupabaseUser()
const { data: myEntries } = await useAsyncData('app-my-entries', async () => {
  const userId = user.value?.sub
  if (!userId) return []
  const { data } = await client
    .from('tournament_entry_members')
    .select('entry_id, tournament_entries(tournament_id)')
    .eq('user_id', userId)
  return (data ?? [])
    .map((row) => {
      const entry = row.tournament_entries as { tournament_id?: string } | null
      return entry?.tournament_id
    })
    .filter((id): id is string => Boolean(id))
})

const entriesByTournament = computed(() => {
  const map: Record<string, number> = {}
  for (const entry of bundle.value?.entries ?? []) {
    const key = String(entry.tournament_id)
    if (entry.status === 'withdrawn') continue
    map[key] = (map[key] ?? 0) + 1
  }
  return map
})

const winnersByTournament = computed(() => {
  const map: Record<string, string> = {}
  for (const entry of bundle.value?.entries ?? []) {
    if (entry.status === 'winner' && entry.tournament_id) {
      map[String(entry.tournament_id)] = entry.display_name ?? 'Vincitore'
    }
  }
  return map
})

const gamesForPlatform = computed(() => {
  const list = games.value ?? []
  if (!filters.platform) return list
  return list.filter((game) => game.platform_id === filters.platform)
})

watch(
  () => filters.platform,
  () => {
    if (!gamesForPlatform.value.some((game) => game.id === filters.game)) {
      filters.game = ''
    }
  },
)

function matchesFilters(
  tournament: Database['public']['Views']['public_tournaments']['Row'],
) {
  if (filters.platform && tournament.platform_id !== filters.platform)
    return false
  if (filters.game && tournament.game_id !== filters.game) return false
  if (filters.from && tournament.starts_at) {
    if (new Date(tournament.starts_at) < new Date(filters.from)) return false
  }
  return true
}

const upcoming = computed(() =>
  (bundle.value?.tournaments ?? [])
    .filter(
      (tournament) =>
        [
          'registration_open',
          'registration_closed',
          'checkin',
          'running',
        ].includes(String(tournament.status)) && matchesFilters(tournament),
    )
    .sort(
      (a, b) =>
        new Date(a.starts_at ?? 0).getTime() -
        new Date(b.starts_at ?? 0).getTime(),
    ),
)

const past = computed(() =>
  (bundle.value?.tournaments ?? [])
    .filter(
      (tournament) =>
        String(tournament.status) === 'completed' && matchesFilters(tournament),
    )
    .sort(
      (a, b) =>
        new Date(b.starts_at ?? 0).getTime() -
        new Date(a.starts_at ?? 0).getTime(),
    ),
)

function isRegistered(id: string | null) {
  return Boolean(id && (myEntries.value ?? []).includes(id))
}

function platformCode(id: string | null) {
  return (platforms.value ?? []).find((item) => item.id === id)?.code ?? '—'
}
function gameName(id: string | null) {
  return (games.value ?? []).find((item) => item.id === id)?.name ?? 'Gioco'
}

useSeoMeta({ title: 'Tornei — VRSUS', robots: 'noindex, nofollow' })
</script>

<template>
  <div class="space-y-6">
    <header>
      <p
        class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
      >
        Competizioni
      </p>
      <h1
        class="font-display mt-2 text-2xl font-semibold text-white sm:text-3xl"
      >
        Tornei
      </h1>
    </header>

    <div class="grid gap-3 sm:grid-cols-3">
      <label class="block">
        <span
          class="mb-1.5 block text-xs tracking-wide text-white/45 uppercase"
        >
          Postazione
        </span>
        <select v-model="filters.platform" class="vrsus-select">
          <option value="">Tutte</option>
          <option
            v-for="platform in platforms"
            :key="platform.id ?? ''"
            :value="platform.id"
          >
            {{ platform.name }}
          </option>
        </select>
      </label>
      <label class="block">
        <span class="mb-1.5 block text-xs tracking-wide text-white/45 uppercase"
          >Gioco</span
        >
        <select v-model="filters.game" class="vrsus-select">
          <option value="">Tutti</option>
          <option
            v-for="game in gamesForPlatform"
            :key="game.id ?? ''"
            :value="game.id"
          >
            {{ game.name }}
          </option>
        </select>
      </label>
      <label class="block">
        <span class="mb-1.5 block text-xs tracking-wide text-white/45 uppercase"
          >Dal</span
        >
        <input v-model="filters.from" type="date" class="vrsus-select" />
      </label>
    </div>

    <section>
      <h2 class="font-display text-lg font-semibold text-white">
        Prossimi tornei
      </h2>

      <p v-if="!upcoming.length" class="mt-3 text-sm text-white/45">
        Nessun torneo in programma con questi filtri.
      </p>

      <div class="mt-4 space-y-3">
        <NuxtLink
          v-for="tournament in upcoming"
          :key="tournament.id ?? ''"
          :to="`/app/tornei/${tournament.id}`"
          class="block rounded-2xl border p-4 transition-colors"
          :class="
            isRegistered(tournament.id)
              ? 'border-green-500/50 bg-green-500/[0.06] shadow-[0_0_24px_rgb(34_197_94/12%)]'
              : 'border-brand-red-500/40 bg-brand-red-500/[0.05] shadow-[0_0_24px_rgb(239_51_64/10%)]'
          "
        >
          <div class="flex flex-wrap items-center gap-2">
            <!--
              Il bordo da solo non e accessibile a chi non distingue i colori:
              l'etichetta testuale accompagna sempre lo stato.
            -->
            <span
              v-if="isRegistered(tournament.id)"
              class="rounded-full bg-green-500/15 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-green-300 uppercase"
              >Iscritto</span
            >
            <span
              v-else
              class="bg-brand-red-500/15 text-brand-red-300 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase"
              >{{ tournamentStatusLabel(String(tournament.status)) }}</span
            >
            <span
              class="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/70"
            >
              {{ platformCode(tournament.platform_id) }}
            </span>
          </div>

          <h3 class="font-display mt-3 text-base font-semibold text-white">
            {{ tournament.name }}
          </h3>
          <p class="mt-1 text-sm text-white/50">
            {{ gameName(tournament.game_id) }}
          </p>

          <div
            class="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-white/45"
          >
            <span>{{ formatTournamentDate(tournament.starts_at) }}</span>
            <span>
              {{ entriesByTournament[String(tournament.id)] ?? 0 }} /
              {{ tournament.max_entries ?? '∞' }} partecipanti
            </span>
          </div>
        </NuxtLink>
      </div>
    </section>

    <section>
      <h2 class="font-display text-lg font-semibold text-white">
        Tornei passati
      </h2>

      <p v-if="!past.length" class="mt-3 text-sm text-white/45">
        Nessun torneo concluso con questi filtri.
      </p>

      <div class="mt-4 space-y-3">
        <NuxtLink
          v-for="tournament in past"
          :key="tournament.id ?? ''"
          :to="`/app/tornei/${tournament.id}`"
          class="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/25"
        >
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] tracking-wide text-white/60 uppercase"
            >
              Concluso
            </span>
            <span
              class="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/70"
            >
              {{ platformCode(tournament.platform_id) }}
            </span>
          </div>

          <h3 class="font-display mt-3 text-base font-semibold text-white">
            {{ tournament.name }}
          </h3>
          <p class="mt-1 text-sm text-white/50">
            {{ gameName(tournament.game_id) }}
          </p>

          <div
            class="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-white/45"
          >
            <span>{{ formatTournamentDate(tournament.starts_at) }}</span>
            <span>
              {{ entriesByTournament[String(tournament.id)] ?? 0 }} /
              {{ tournament.max_entries ?? '∞' }} partecipanti
            </span>
            <span
              v-if="winnersByTournament[String(tournament.id)]"
              class="text-white/70"
            >
              Vincitore: {{ winnersByTournament[String(tournament.id)] }}
            </span>
          </div>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
