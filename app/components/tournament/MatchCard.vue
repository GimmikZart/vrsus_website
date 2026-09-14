<script setup lang="ts">
import type {
  TournamentMatchView,
  TournamentRules,
} from '~~/shared/types/tournament-view'
import {
  assignedParticipants,
  formatTimeGap,
  formatTournamentScore,
  orderedParticipants,
} from '~~/shared/utils/tournament-standings'
import { tournamentMatchStatusLabel } from '~/composables/useTournaments'

// Una partita, tre forme possibili.
//
// Due posti sono un duello e si leggono faccia a faccia. Tre o piu sono una
// manche e si leggono come un ordine di arrivo. Un posto solo e un tentativo a
// cronometro, dove l'unico dato che conta e il tempo e quanto dista dal
// migliore. La differenza non e estetica: in una manche da quattro non esiste
// "l'avversario", e mostrarla come un duello renderebbe illeggibile il
// risultato.
const props = defineProps<{
  match: TournamentMatchView
  rules: TournamentRules
  nameByEntry: Record<string, string>
  /** Miglior punteggio del torneo, per calcolare il distacco a cronometro. */
  bestScore?: number | null
  editable?: boolean
}>()

const emit = defineEmits<{ select: [match: TournamentMatchView] }>()

const participants = computed(() => orderedParticipants(props.match))
const assigned = computed(() => assignedParticipants(props.match))
const shape = computed(() => {
  if (assigned.value.length <= 1) return 'attempt'
  return props.rules.groupSize > 2 || assigned.value.length > 2
    ? 'heat'
    : 'duel'
})

const isDone = computed(() => props.match.status === 'completed')

function nameOf(entryId: string | null) {
  if (!entryId) return '—'
  return props.nameByEntry[entryId] ?? 'Partecipante'
}

function scoreLabel(value: number | null) {
  return formatTournamentScore(value, props.rules)
}

const medals: Record<number, string> = {
  1: 'text-amber-300',
  2: 'text-slate-300',
  3: 'text-amber-700',
}
</script>

<template>
  <component
    :is="editable ? 'button' : 'div'"
    :type="editable ? 'button' : undefined"
    class="block w-full rounded-2xl border border-white/10 bg-white/[0.03] text-left"
    :class="editable ? 'transition-colors hover:bg-white/[0.06]' : ''"
    @click="editable ? emit('select', match) : undefined"
  >
    <div
      class="flex items-center justify-between gap-2 border-b border-white/[0.07] px-3 py-1.5 text-[10px] tracking-[0.14em] text-white/35 uppercase"
    >
      <span>#{{ match.bracketPosition }}</span>
      <span class="truncate">
        {{ match.platformName ?? tournamentMatchStatusLabel(match.status) }}
      </span>
    </div>

    <!-- Duello: due nomi e un punteggio in mezzo. -->
    <div v-if="shape === 'duel'" class="flex items-center gap-2 px-3 py-3">
      <span
        v-for="(part, index) in participants"
        :key="part.slot"
        class="contents"
      >
        <span
          v-if="index === 1"
          class="shrink-0 rounded-lg bg-white/[0.06] px-2 py-1 font-mono text-xs text-white/80 tabular-nums"
        >
          {{ scoreLabel(participants[0]?.score ?? null) }} :
          {{ scoreLabel(part.score) }}
        </span>
        <span
          class="min-w-0 flex-1 truncate text-sm"
          :class="[
            index === 0 ? 'text-right' : '',
            part.outcome === 'win'
              ? 'font-semibold text-white'
              : 'text-white/65',
          ]"
          >{{ nameOf(part.entryId) }}</span
        >
      </span>
    </div>

    <!-- Manche: si legge come un ordine di arrivo. -->
    <ul v-else-if="shape === 'heat'" class="divide-y divide-white/[0.05]">
      <li
        v-for="part in participants"
        :key="part.slot"
        class="flex items-center gap-3 px-3 py-2"
      >
        <span
          class="grid size-6 shrink-0 place-items-center rounded-full bg-white/[0.06] text-xs font-semibold"
          :class="
            part.placement && medals[part.placement]
              ? medals[part.placement]
              : 'text-white/50'
          "
        >
          {{ part.placement ?? part.slot }}
        </span>
        <span
          class="min-w-0 flex-1 truncate text-sm"
          :class="
            part.placement === 1 && isDone
              ? 'font-semibold text-white'
              : 'text-white/70'
          "
          >{{ nameOf(part.entryId) }}</span
        >
        <span
          v-if="part.score !== null"
          class="shrink-0 font-mono text-xs text-white/70 tabular-nums"
          >{{ scoreLabel(part.score) }}</span
        >
        <span
          v-if="isDone && rules.standingMetric === 'placement_points'"
          class="text-brand-blue-300 w-10 shrink-0 text-right font-mono text-xs tabular-nums"
          >+{{ part.pointsAwarded }}</span
        >
      </li>
    </ul>

    <!-- Tentativo a cronometro: il tempo e il distacco dal migliore. -->
    <div v-else class="flex items-center gap-3 px-3 py-3">
      <span class="min-w-0 flex-1 truncate text-sm text-white/80">{{
        nameOf(participants[0]?.entryId ?? null)
      }}</span>
      <span class="shrink-0 font-mono text-sm text-white tabular-nums">
        {{ scoreLabel(participants[0]?.score ?? null) }}
      </span>
      <span
        v-if="
          bestScore !== null &&
          bestScore !== undefined &&
          formatTimeGap(participants[0]?.score ?? null, bestScore)
        "
        class="w-16 shrink-0 text-right font-mono text-xs text-white/40 tabular-nums"
      >
        {{ formatTimeGap(participants[0]?.score ?? null, bestScore) }}
      </span>
    </div>
  </component>
</template>
