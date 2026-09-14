<script setup lang="ts">
import type { ProfileRankingRow } from '~~/shared/types/profile-view'

// Storico dei punteggi in ordine cronologico, filtrabile per piattaforma o
// gioco. Le due letture del ranking restano distinte (DEC-023): i punti VRSUS
// vengono dai tornei, i record assoluti dai punteggi registrati sul gioco.
const props = defineProps<{ ranking: ProfileRankingRow[] }>()

const platformFilter = ref('')
const gameFilter = ref('')

const platforms = computed(() => {
  const map = new Map<string, string>()
  for (const row of props.ranking) {
    if (row.platformId && row.platformName)
      map.set(row.platformId, row.platformName)
  }
  return [...map].map(([value, label]) => ({ value, label }))
})

const games = computed(() => {
  const map = new Map<string, string>()
  for (const row of props.ranking) {
    if (!row.gameId || !row.gameName) continue
    if (platformFilter.value && row.platformId !== platformFilter.value)
      continue
    map.set(row.gameId, row.gameName)
  }
  return [...map].map(([value, label]) => ({ value, label }))
})

watch(platformFilter, () => {
  if (!games.value.some((game) => game.value === gameFilter.value)) {
    gameFilter.value = ''
  }
})

const rows = computed(() =>
  props.ranking.filter((row) => {
    if (platformFilter.value && row.platformId !== platformFilter.value) {
      return false
    }
    if (gameFilter.value && row.gameId !== gameFilter.value) return false
    return true
  }),
)

function formatDate(value: string) {
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}
</script>

<template>
  <div>
    <div class="flex flex-col gap-2 sm:flex-row">
      <select
        v-model="platformFilter"
        class="vrsus-select w-full sm:max-w-xs"
        aria-label="Filtra per piattaforma"
      >
        <option value="">Tutte le piattaforme</option>
        <option
          v-for="platform in platforms"
          :key="platform.value"
          :value="platform.value"
        >
          {{ platform.label }}
        </option>
      </select>
      <select
        v-model="gameFilter"
        class="vrsus-select w-full sm:max-w-xs"
        aria-label="Filtra per gioco"
      >
        <option value="">Tutti i giochi</option>
        <option v-for="game in games" :key="game.value" :value="game.value">
          {{ game.label }}
        </option>
      </select>
    </div>

    <p v-if="!rows.length" class="mt-5 text-sm text-white/45">
      Nessun punteggio registrato con questi filtri.
    </p>

    <ul v-else class="mt-5 space-y-2">
      <li
        v-for="row in rows"
        :key="row.kind + row.id"
        class="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3"
      >
        <span
          class="grid size-9 shrink-0 place-items-center rounded-full"
          :class="
            row.kind === 'points'
              ? 'bg-brand-red-500/15 text-brand-red-300'
              : 'bg-brand-blue-500/15 text-brand-blue-300'
          "
        >
          <UIcon
            :name="row.kind === 'points' ? 'i-lucide-trophy' : 'i-lucide-gauge'"
            class="size-4"
          />
        </span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm text-white/85">
            {{ row.gameName ?? row.tournamentName ?? row.label }}
          </p>
          <p class="mt-0.5 truncate text-xs text-white/40">
            {{ formatDate(row.recordedAt) }}
            <span v-if="row.platformName"> · {{ row.platformName }}</span>
            <span v-if="row.tournamentName"> · {{ row.tournamentName }}</span>
          </p>
        </div>
        <span
          class="shrink-0 font-mono text-sm tabular-nums"
          :class="row.kind === 'points' ? 'text-white' : 'text-white/70'"
        >
          {{ row.kind === 'points' && row.value > 0 ? '+' : '' }}{{ row.value }}
        </span>
      </li>
    </ul>
  </div>
</template>
