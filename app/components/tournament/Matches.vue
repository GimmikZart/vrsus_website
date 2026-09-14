<script setup lang="ts">
import type {
  TournamentEntryView,
  TournamentMatchView,
  TournamentRules,
} from '~~/shared/types/tournament-view'
import {
  isKnockout,
  tournamentRoundLabel,
  tournamentRounds,
} from '~~/shared/utils/tournament-standings'

// Storico delle partite. L'eliminazione diretta usa il tabellone; gironi,
// manche e tentativi a cronometro usano una scheda per round con l'elenco
// delle partite: e la stessa distinzione che fa la struttura del torneo, non
// una scelta di stile.
const props = defineProps<{
  matches: TournamentMatchView[]
  entries: TournamentEntryView[]
  rules: TournamentRules
  editable?: boolean
}>()

const emit = defineEmits<{ select: [match: TournamentMatchView] }>()

const knockout = computed(() => isKnockout(props.rules.format))

const nameByEntry = computed(() =>
  Object.fromEntries(
    props.entries.map((entry) => [entry.id, entry.displayName]),
  ),
)

const rounds = computed(() => tournamentRounds(props.matches))
const activeRound = ref<string>('')

watchEffect(() => {
  const available = rounds.value.map(String)
  if (!available.includes(activeRound.value)) {
    activeRound.value = available[0] ?? ''
  }
})

const roundTabs = computed(() =>
  rounds.value.map((round) => ({
    value: String(round),
    label: tournamentRoundLabel(
      round,
      rounds.value[rounds.value.length - 1] ?? round,
      props.rules.format,
    ),
    count: props.matches.filter((match) => match.roundNumber === round).length,
  })),
)

const visibleMatches = computed(() =>
  props.matches
    .filter((match) => String(match.roundNumber) === activeRound.value)
    .sort((a, b) => a.bracketPosition - b.bracketPosition),
)

/** Serve al distacco nei tentativi a cronometro. */
const bestScore = computed(() => {
  const scores = props.matches
    .flatMap((match) => match.participants)
    .map((part) => part.score)
    .filter((score): score is number => score !== null)
  if (!scores.length) return null
  return props.rules.scoreDirection === 'asc'
    ? Math.min(...scores)
    : Math.max(...scores)
})

// Una griglia a due colonne su schermi larghi: le manche sono card alte e in
// colonna singola si scorrerebbe all'infinito.
const gridLayout = computed(
  () => props.rules.groupSize > 2 || props.rules.format === 'time_trial',
)
</script>

<template>
  <div>
    <p v-if="!matches.length" class="text-sm text-white/45">
      Il calendario non e ancora stato generato.
    </p>

    <TournamentBracket
      v-else-if="knockout"
      :matches="matches"
      :name-by-entry="nameByEntry"
      :editable="editable"
      @select="emit('select', $event)"
    />

    <div v-else class="space-y-4">
      <UiVrsusTabs
        v-if="roundTabs.length > 1"
        v-model="activeRound"
        :items="roundTabs"
      />

      <ul
        class="gap-2"
        :class="gridLayout ? 'grid sm:grid-cols-2' : 'space-y-2'"
      >
        <li v-for="match in visibleMatches" :key="match.id">
          <TournamentMatchCard
            :match="match"
            :rules="rules"
            :name-by-entry="nameByEntry"
            :best-score="bestScore"
            :editable="editable"
            @select="emit('select', $event)"
          />
        </li>
      </ul>
    </div>
  </div>
</template>
