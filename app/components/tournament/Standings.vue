<script setup lang="ts">
import type {
  TournamentRules,
  TournamentStandingRow,
} from '~~/shared/types/tournament-view'
import {
  formatTimeGap,
  formatTournamentScore,
} from '~~/shared/utils/tournament-standings'

// Classifica del torneo. Finche non esiste un risultato la lista e l ordine di
// iscrizione e nessuna corona viene assegnata: un podio prima che si giochi
// sarebbe falso.
//
// Le colonne dipendono da come si vince: in un girone contano le vittorie, in
// una gara a tempo il tempo migliore e il distacco, in una prova a punti la
// somma. Mostrarle tutte sempre renderebbe la tabella illeggibile e
// costringerebbe a leggere colonne che per quel torneo non significano nulla.
const props = defineProps<{
  standings: TournamentStandingRow[]
  rules: TournamentRules
  /** Mostra nome, cognome ed eta: solo dove i dati anagrafici sono ammessi. */
  showIdentity?: boolean
  /** Se valorizzato ogni riga con un utente diventa un link alla sua scheda. */
  profileBasePath?: string
}>()

const ranked = computed(() =>
  props.standings.some((row) => row.position !== null),
)

const leaderScore = computed(() => props.standings[0]?.bestScore ?? null)

type Column = {
  key: string
  label: string
  short: string
  value: (row: TournamentStandingRow) => string
  strong?: boolean
}

const columns = computed<Column[]>(() => {
  const played: Column = {
    key: 'played',
    label: 'Giocate',
    short: 'G',
    value: (row) => String(row.played),
  }
  const wins: Column = {
    key: 'wins',
    label: 'Vinte',
    short: 'V',
    value: (row) => String(row.wins),
    strong: true,
  }
  const losses: Column = {
    key: 'losses',
    label: 'Perse',
    short: 'S',
    value: (row) => String(row.losses),
  }
  const points: Column = {
    key: 'points',
    label: 'Punti',
    short: 'Punti',
    value: (row) =>
      new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(
        row.points,
      ),
    strong: true,
  }

  switch (props.rules.standingMetric) {
    case 'points_sum':
    case 'placement_points':
      return [points, played, wins]
    case 'best_time':
      return [
        {
          key: 'best',
          label: 'Miglior tempo',
          short: 'Tempo',
          value: (row) => formatTournamentScore(row.bestScore, props.rules),
          strong: true,
        },
        {
          key: 'gap',
          label: 'Distacco',
          short: 'Gap',
          value: (row) =>
            formatTimeGap(row.bestScore, leaderScore.value) ?? '—',
        },
        { ...played, label: 'Tentativi', short: 'T' },
      ]
    case 'total_time':
      return [
        {
          key: 'total',
          label: 'Tempo totale',
          short: 'Totale',
          value: (row) => formatTournamentScore(row.totalScore, props.rules),
          strong: true,
        },
        { ...played, label: 'Tentativi', short: 'T' },
      ]
    default:
      return props.rules.allowDraw
        ? [
            played,
            wins,
            {
              key: 'draws',
              label: 'Pari',
              short: 'N',
              value: (row) => String(row.draws),
            },
            losses,
          ]
        : [played, wins, losses]
  }
})

const crowns: Record<number, { icon: string; class: string; label: string }> = {
  1: { icon: 'i-lucide-crown', class: 'text-amber-300', label: 'Primo posto' },
  2: {
    icon: 'i-lucide-crown',
    class: 'text-slate-300',
    label: 'Secondo posto',
  },
  3: { icon: 'i-lucide-crown', class: 'text-amber-700', label: 'Terzo posto' },
}

function crownFor(position: number | null) {
  return position ? crowns[position] : undefined
}

function fullName(row: TournamentStandingRow) {
  const parts = [row.firstName, row.lastName].filter(Boolean)
  return parts.length ? parts.join(' ') : row.displayName
}

function rowLink(row: TournamentStandingRow) {
  return props.profileBasePath && row.userId
    ? `${props.profileBasePath}/${row.userId}`
    : undefined
}

/** Nella scheda di una squadra servono i nomi di chi la compone. */
function membersLabel(row: TournamentStandingRow) {
  if (props.rules.entrySize <= 1 || !row.members.length) return null
  return row.members.map((member) => member.displayName).join(' · ')
}
</script>

<template>
  <div>
    <p v-if="!standings.length" class="text-sm text-white/45">
      Nessun iscritto al momento.
    </p>

    <template v-else>
      <p v-if="!ranked" class="mb-3 text-xs text-white/40">
        Il torneo non ha ancora risultati: la lista segue l ordine di
        iscrizione.
      </p>

      <!-- Mobile: una card per iscritto. -->
      <ul class="space-y-2 lg:hidden">
        <li v-for="(row, index) in standings" :key="row.entryId">
          <component
            :is="rowLink(row) ? resolveComponent('NuxtLink') : 'div'"
            :to="rowLink(row)"
            class="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3"
            :class="
              rowLink(row) ? 'transition-colors hover:bg-white/[0.06]' : ''
            "
          >
            <span
              class="grid size-8 shrink-0 place-items-center rounded-full bg-white/[0.06] text-sm font-semibold text-white/60"
            >
              <UIcon
                v-if="crownFor(row.position)"
                :name="crownFor(row.position)!.icon"
                :class="crownFor(row.position)!.class"
                class="size-5"
                :aria-label="crownFor(row.position)!.label"
              />
              <template v-else>{{ row.position ?? index + 1 }}</template>
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium text-white">
                {{ showIdentity ? fullName(row) : row.displayName }}
              </p>
              <p
                v-if="membersLabel(row)"
                class="mt-0.5 truncate text-xs text-white/40"
              >
                {{ membersLabel(row) }}
              </p>
              <p class="mt-0.5 truncate text-xs text-white/45">
                <span v-if="showIdentity && row.age !== null"
                  >{{ row.age }} anni · </span
                ><span v-if="showIdentity">{{ row.displayName }} · </span>
                <span v-for="(column, position) in columns" :key="column.key">
                  <span v-if="position > 0"> · </span>{{ column.short }}
                  {{ column.value(row) }}
                </span>
              </p>
            </div>
            <slot name="row-actions" :row="row" />
          </component>
        </li>
      </ul>

      <!-- Desktop: tabella. -->
      <div class="hidden overflow-x-auto lg:block">
        <table class="w-full min-w-[36rem] text-left text-sm">
          <thead class="text-xs tracking-wide text-white/40 uppercase">
            <tr class="border-b border-white/10">
              <th scope="col" class="px-3 py-2 font-medium">Pos.</th>
              <th v-if="showIdentity" scope="col" class="px-3 py-2 font-medium">
                Nome
              </th>
              <th v-if="showIdentity" scope="col" class="px-3 py-2 font-medium">
                Cognome
              </th>
              <th v-if="showIdentity" scope="col" class="px-3 py-2 font-medium">
                Eta
              </th>
              <th scope="col" class="px-3 py-2 font-medium">
                {{ rules.entrySize > 1 ? 'Squadra' : 'Giocatore' }}
              </th>
              <th
                v-for="column in columns"
                :key="column.key"
                scope="col"
                class="px-3 py-2 text-right font-medium"
              >
                {{ column.label }}
              </th>
              <th v-if="$slots['row-actions']" scope="col" class="px-3 py-2">
                <span class="sr-only">Azioni</span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.06]">
            <tr
              v-for="(row, index) in standings"
              :key="row.entryId"
              class="transition-colors hover:bg-white/[0.03]"
            >
              <td class="px-3 py-2.5">
                <span class="inline-flex items-center gap-2">
                  <UIcon
                    v-if="crownFor(row.position)"
                    :name="crownFor(row.position)!.icon"
                    :class="crownFor(row.position)!.class"
                    class="size-5"
                    :aria-label="crownFor(row.position)!.label"
                  />
                  <span class="text-white/60">{{
                    row.position ?? index + 1
                  }}</span>
                </span>
              </td>
              <td v-if="showIdentity" class="px-3 py-2.5 text-white/85">
                {{ row.firstName ?? '—' }}
              </td>
              <td v-if="showIdentity" class="px-3 py-2.5 text-white/85">
                {{ row.lastName ?? '—' }}
              </td>
              <td v-if="showIdentity" class="px-3 py-2.5 text-white/60">
                {{ row.age ?? '—' }}
              </td>
              <td class="px-3 py-2.5">
                <NuxtLink
                  v-if="rowLink(row)"
                  :to="rowLink(row)"
                  class="text-white hover:underline"
                  >{{ row.displayName }}</NuxtLink
                >
                <span v-else class="text-white">{{ row.displayName }}</span>
                <span
                  v-if="membersLabel(row)"
                  class="block truncate text-xs text-white/40"
                  >{{ membersLabel(row) }}</span
                >
              </td>
              <td
                v-for="column in columns"
                :key="column.key"
                class="px-3 py-2.5 text-right tabular-nums"
                :class="column.strong ? 'text-white/85' : 'text-white/60'"
              >
                {{ column.value(row) }}
              </td>
              <td v-if="$slots['row-actions']" class="px-3 py-2.5 text-right">
                <slot name="row-actions" :row="row" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
