<script setup lang="ts">
import type { TournamentMatchView } from '~~/shared/types/tournament-view'
import { tournamentRoundLabel } from '~~/shared/utils/tournament-standings'
import { tournamentMatchStatusLabel } from '~/composables/useTournaments'

// Tabellone a eliminazione diretta nella forma classica: una colonna per
// round, gli incontri che si incontrano verso destra. Il contenitore scorre in
// orizzontale da solo, il body della pagina non si muove mai.
const props = defineProps<{
  matches: TournamentMatchView[]
  nameByEntry: Record<string, string>
  /** Abilita il click sull incontro per correggerlo. */
  editable?: boolean
}>()

const emit = defineEmits<{ select: [match: TournamentMatchView] }>()

const rounds = computed(() =>
  [...new Set(props.matches.map((match) => match.roundNumber))].sort(
    (a, b) => a - b,
  ),
)

const lastRound = computed(() => rounds.value[rounds.value.length - 1] ?? 0)

function matchesOf(round: number) {
  return props.matches
    .filter((match) => match.roundNumber === round)
    .sort((a, b) => a.bracketPosition - b.bracketPosition)
}

function nameOf(entryId: string | null) {
  if (!entryId) return null
  return props.nameByEntry[entryId] ?? 'Partecipante'
}

/**
 * Il tabellone ha sempre due lati: sono i primi due posti della partita.
 * Finche il ramo precedente non ha prodotto un vincitore il posto esiste ma e
 * vuoto, ed e quello che disegna la casella in attesa.
 */
function sideOf(match: TournamentMatchView, slot: number) {
  return match.participants.find((part) => part.slot === slot) ?? null
}

function roundLabel(round: number) {
  return tournamentRoundLabel(round, lastRound.value, 'single_elimination')
}
</script>

<template>
  <div class="bracket-scroll">
    <div class="bracket">
      <section v-for="round in rounds" :key="round" class="round">
        <p
          class="mb-3 px-1 text-[11px] font-semibold tracking-[0.18em] text-white/40 uppercase"
        >
          {{ roundLabel(round) }}
        </p>
        <div class="round-body">
          <div
            v-for="(match, index) in matchesOf(round)"
            :key="match.id"
            class="cell"
            :class="{
              'has-next': round !== lastRound,
              'has-prev': round !== rounds[0],
              'pair-top': round !== lastRound && index % 2 === 0,
              'pair-bottom': round !== lastRound && index % 2 === 1,
            }"
          >
            <component
              :is="editable ? 'button' : 'div'"
              :type="editable ? 'button' : undefined"
              class="match"
              :class="editable ? 'match-editable' : ''"
              @click="editable ? emit('select', match) : undefined"
            >
              <span
                class="flex items-center justify-between gap-2 border-b border-white/[0.08] px-2.5 py-1 text-[10px] tracking-wide text-white/35 uppercase"
              >
                <span>#{{ match.bracketPosition }}</span>
                <span class="truncate">{{
                  match.platformName ?? tournamentMatchStatusLabel(match.status)
                }}</span>
              </span>
              <span
                v-for="slot in [1, 2]"
                :key="slot"
                class="side"
                :class="
                  sideOf(match, slot)?.outcome === 'win' ? 'side-winner' : ''
                "
              >
                <span class="truncate">{{
                  nameOf(sideOf(match, slot)?.entryId ?? null) ?? '—'
                }}</span>
                <span class="score">{{
                  sideOf(match, slot)?.score ?? ''
                }}</span>
              </span>
            </component>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
/*
  I collegamenti sono pseudo-elementi, non SVG: le celle di una colonna hanno
  tutte la stessa altezza (flex: 1), quindi la meta verticale disegnata dalla
  cella superiore incontra sempre quella della cella inferiore.
*/
.bracket-scroll {
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.bracket {
  --stub: 1.5rem;
  --bracket-line: rgb(255 255 255 / 18%);

  display: flex;
  align-items: stretch;
  min-width: min-content;
}

.round {
  display: flex;
  min-width: 13.5rem;
  flex-direction: column;
}

.round-body {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.cell {
  position: relative;
  display: flex;
  flex: 1;
  align-items: center;
  padding: 0.375rem 0;
}

.cell.has-next {
  padding-right: var(--stub);
}

.cell.has-prev {
  padding-left: var(--stub);
}

.cell.has-next .match::after,
.cell.has-prev .match::before {
  position: absolute;
  top: 50%;
  height: 1px;
  width: var(--stub);
  background: var(--bracket-line);
  content: '';
}

.cell.has-next .match::after {
  left: 100%;
}

.cell.has-prev .match::before {
  right: 100%;
}

.cell.pair-top::after,
.cell.pair-bottom::after {
  position: absolute;
  right: calc(var(--stub) / 2);
  width: 1px;
  background: var(--bracket-line);
  content: '';
}

.cell.pair-top::after {
  top: 50%;
  bottom: 0;
}

.cell.pair-bottom::after {
  top: 0;
  bottom: 50%;
}

/*
  Niente overflow: hidden qui: i collegamenti sono pseudo-elementi che escono
  dal riquadro e verrebbero tagliati. Gli angoli li arrotonda la riga in fondo.
*/
.match {
  position: relative;
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 0.75rem;
  background: rgb(255 255 255 / 4%);
  text-align: left;
}

.match-editable {
  cursor: pointer;
  transition: background-color 150ms ease;
}

.match-editable:hover {
  background: rgb(255 255 255 / 8%);
}

.side {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.4rem 0.625rem;
  font-size: 0.8125rem;
  color: rgb(255 255 255 / 65%);
}

.side + .side {
  border-top: 1px solid rgb(255 255 255 / 6%);
  border-bottom-right-radius: 0.7rem;
  border-bottom-left-radius: 0.7rem;
}

.side-winner {
  background: rgb(255 255 255 / 5%);
  color: white;
  font-weight: 600;
}

.score {
  min-width: 1rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>
