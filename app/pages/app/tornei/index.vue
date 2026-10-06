<script setup lang="ts">
import type { Database } from '~/types/database.types'
import {
  formatTournamentDate,
  tournamentStatusLabel,
} from '~/composables/useTournaments'

definePageMeta({ layout: 'app', middleware: ['auth'] })

const client = useSupabaseClient<Database>()

type Tournament = Database['public']['Views']['public_tournaments']['Row']
type FilterKey = 'platform' | 'game' | 'from'
type TournamentFilters = Record<FilterKey, string>

const filters = reactive<TournamentFilters>({
  platform: '',
  game: '',
  from: '',
})
const draftFilters = reactive<TournamentFilters>({
  platform: '',
  game: '',
  from: '',
})
const filterOpen = ref(false)
const activeTab = ref('prossimi')

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

const { data: bundle, refresh: refreshTournaments } = await useAsyncData(
  'app-tournaments',
  async () => {
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
  },
)

// Le iscrizioni proprie determinano il bordo verde della card. Il filtro sul
// proprio id e esplicito: un admin puo leggere le iscrizioni di tutti, quindi
// affidarsi alle sole RLS mostrerebbe "Iscritto" ovunque.
const user = useSupabaseUser()
const { data: myEntries, refresh: refreshMyEntries } = await useAsyncData(
  'app-my-entries',
  async () => {
    const userId = user.value?.sub
    if (!userId) return []
    const { data } = await client
      .from('tournament_entry_members')
      .select('entry_id, tournament_entries(tournament_id, status)')
      .eq('user_id', userId)
    return (data ?? [])
      .map(
        (row) =>
          row.tournament_entries as {
            tournament_id?: string
            status?: string
          } | null,
      )
      .filter((entry) => entry?.status !== 'withdrawn')
      .map((entry) => entry?.tournament_id)
      .filter((id): id is string => Boolean(id))
  },
)

onMounted(() => {
  void Promise.all([refreshTournaments(), refreshMyEntries()])
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
  if (!draftFilters.platform) return list
  return list.filter((game) => game.platform_id === draftFilters.platform)
})

watch(
  () => draftFilters.platform,
  () => {
    if (!gamesForPlatform.value.some((game) => game.id === draftFilters.game)) {
      draftFilters.game = ''
    }
  },
)

function openFilters() {
  Object.assign(draftFilters, filters)
  filterOpen.value = true
}

function applyFilters() {
  Object.assign(filters, draftFilters)
  filterOpen.value = false
}

function clearDraft() {
  Object.assign(draftFilters, { platform: '', game: '', from: '' })
}

function removeFilter(key: FilterKey) {
  filters[key] = ''
}

function dateLabel(value: string) {
  const [year, month, day] = value.split('-')
  return day && month && year ? `dal ${day}/${month}/${year}` : value
}

function gameImage(gameId: string | null) {
  return (
    (games.value ?? []).find((game) => game.id === gameId)?.image_path ?? null
  )
}

const filterChips = computed(() => {
  const chips: { key: FilterKey; label: string }[] = []
  if (filters.platform) {
    const platform = (platforms.value ?? []).find(
      (item) => item.id === filters.platform,
    )
    chips.push({
      key: 'platform',
      label: platform?.code ?? platform?.name ?? 'Postazione',
    })
  }
  if (filters.game) {
    chips.push({
      key: 'game',
      label:
        (games.value ?? []).find((item) => item.id === filters.game)?.name ??
        'Gioco',
    })
  }
  if (filters.from) chips.push({ key: 'from', label: dateLabel(filters.from) })
  return chips
})

function matchesFilters(tournament: Tournament) {
  if (filters.platform && tournament.platform_id !== filters.platform)
    return false
  if (filters.game && tournament.game_id !== filters.game) return false
  if (filters.from && tournament.starts_at) {
    const localDate = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Rome',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(tournament.starts_at))
    if (localDate < filters.from) return false
  }
  return true
}

const filtered = computed(() =>
  (bundle.value?.tournaments ?? []).filter(matchesFilters),
)
const running = computed(() =>
  filtered.value.filter((item) => item.status === 'running'),
)
const upcoming = computed(() =>
  filtered.value.filter((item) =>
    ['registration_open', 'registration_closed', 'checkin'].includes(
      String(item.status),
    ),
  ),
)
const past = computed(() =>
  filtered.value.filter((item) => item.status === 'completed').reverse(),
)

const tabs = computed(() => [
  ...(running.value.length
    ? [{ value: 'in-corso', label: 'In corso', count: running.value.length }]
    : []),
  { value: 'prossimi', label: 'Prossimi', count: upcoming.value.length },
  { value: 'storico', label: 'Storico', count: past.value.length },
])

watch(running, (items) => {
  if (!items.length && activeTab.value === 'in-corso')
    activeTab.value = 'prossimi'
})

const visibleTournaments = computed(
  () =>
    ({
      'in-corso': running.value,
      prossimi: upcoming.value,
      storico: past.value,
    })[activeTab.value] ?? upcoming.value,
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

usePageActions(
  computed(() => [
    {
      label: filterChips.value.length
        ? `Filtri (${filterChips.value.length})`
        : 'Filtri',
      icon: 'i-lucide-sliders-horizontal',
      onClick: openFilters,
    },
  ]),
)

useSeoMeta({ title: 'Tornei — VRSUS', robots: 'noindex, nofollow' })
</script>

<template>
  <div class="space-y-5">
    <header>
      <div>
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
      </div>
    </header>

    <div
      v-if="filterChips.length"
      class="flex flex-wrap gap-2"
      aria-label="Filtri applicati"
    >
      <button
        v-for="chip in filterChips"
        :key="chip.key"
        type="button"
        class="border-brand-blue-400/35 bg-brand-blue-400/10 text-brand-blue-100 inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-medium"
        :aria-label="`Rimuovi filtro ${chip.label}`"
        @click="removeFilter(chip.key)"
      >
        {{ chip.label }}
        <UIcon name="i-lucide-x" class="size-3.5" />
      </button>
    </div>

    <UiVrsusTabs v-model="activeTab" :items="tabs" />

    <section aria-live="polite">
      <p
        v-if="!visibleTournaments.length"
        class="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/55"
      >
        Nessun torneo
        {{
          activeTab === 'storico'
            ? 'concluso'
            : activeTab === 'in-corso'
              ? 'in corso'
              : 'in programma'
        }}
        con questi filtri.
      </p>

      <div
        v-else
        v-vrsus-motion="{ preset: 'cards', key: activeTab }"
        class="space-y-3"
      >
        <NuxtLink
          v-for="tournament in visibleTournaments"
          :key="tournament.id ?? ''"
          :to="'/app/tornei/' + tournament.id"
          class="flex overflow-hidden rounded-2xl border transition-colors"
          :class="
            isRegistered(tournament.id)
              ? 'border-green-500/50 bg-green-500/[0.06] shadow-[0_0_24px_rgb(34_197_94/12%)]'
              : activeTab === 'storico'
                ? 'border-white/10 bg-white/[0.03] hover:border-white/25'
                : 'border-brand-red-500/40 bg-brand-red-500/[0.05] shadow-[0_0_24px_rgb(239_51_64/10%)]'
          "
        >
          <UiVrsusEntityImage
            :src="gameImage(tournament.game_id)"
            :alt="gameName(tournament.game_id)"
            class="w-24 shrink-0 sm:w-32"
          />
          <div class="min-w-0 flex-1 p-4">
            <div class="flex flex-wrap items-center gap-2">
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
                >{{ platformCode(tournament.platform_id) }}</span
              >
            </div>
            <h2 class="font-display mt-3 text-base font-semibold text-white">
              {{ tournament.name }}
            </h2>
            <p class="mt-1 text-sm text-white/50">
              {{ gameName(tournament.game_id) }}
            </p>
            <div
              class="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-white/45"
            >
              <span>{{ formatTournamentDate(tournament.starts_at) }}</span>
              <span
                >{{ entriesByTournament[String(tournament.id)] ?? 0 }} /
                {{ tournament.max_entries ?? '∞' }} partecipanti</span
              >
              <span
                v-if="
                  activeTab === 'storico' &&
                  winnersByTournament[String(tournament.id)]
                "
                class="text-white/70"
                >Vincitore:
                {{ winnersByTournament[String(tournament.id)] }}</span
              >
            </div>
          </div>
        </NuxtLink>
      </div>
    </section>

    <UiVrsusBottomSheet
      v-model="filterOpen"
      title="Filtra tornei"
      description="Scegli cosa vuoi vedere nell'elenco."
    >
      <div class="space-y-4">
        <label class="block">
          <span class="mb-1.5 block text-xs font-medium text-white/60"
            >Postazione</span
          >
          <select v-model="draftFilters.platform" class="vrsus-select">
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
          <span class="mb-1.5 block text-xs font-medium text-white/60"
            >Gioco</span
          >
          <select v-model="draftFilters.game" class="vrsus-select">
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
          <span class="mb-1.5 block text-xs font-medium text-white/60"
            >Dal</span
          >
          <input v-model="draftFilters.from" type="date" class="vrsus-select" />
        </label>
        <div class="flex gap-2 pt-1">
          <UButton
            color="neutral"
            variant="outline"
            size="lg"
            class="flex-1 justify-center"
            label="Azzera"
            @click="clearDraft"
          />
          <UButton
            color="primary"
            size="lg"
            class="flex-1 justify-center"
            label="Filtra"
            @click="applyFilters"
          />
        </div>
      </div>
    </UiVrsusBottomSheet>
  </div>
</template>
