<script setup lang="ts">
import type { TournamentDetailView } from '~~/shared/types/tournament-view'
import {
  tournamentEntryLabel,
  tournamentResultLabel,
  tournamentStructureLabel,
  tournamentSummary,
} from '~~/shared/utils/tournament-standings'
import {
  formatTournamentDate,
  tournamentStatusLabel,
} from '~/composables/useTournaments'

// Intestazione della scheda torneo: e la stessa ovunque il torneo venga
// aperto, console o app utente. Le azioni riservate a staff e admin arrivano
// dallo slot, cosi la struttura non cambia per ruolo.
const props = defineProps<{
  tournament: TournamentDetailView
  /** Evidenzia la scheda quando l utente corrente e iscritto. */
  highlight?: boolean
}>()

// Di base restano visibili solo stato, nome e vincitore: il resto e utile ma
// non serve tenerlo a schermo mentre si guarda il tabellone.
const expanded = ref(false)

// La frase che spiega la dinamica nasce dalla stessa configurazione che
// governa il motore: non puo raccontare un torneo diverso da quello che poi
// si gioca davvero.
const summary = computed(() => tournamentSummary(props.tournament))

const statusColor = computed(() => {
  return (
    {
      registration_open: 'text-emerald-300',
      checkin: 'text-emerald-300',
      running: 'text-brand-red-400',
      completed: 'text-white/60',
      cancelled: 'text-white/40',
    }[props.tournament.status] ?? 'text-white/70'
  )
})
</script>

<template>
  <header
    class="rounded-3xl border p-5 sm:p-6"
    :class="
      highlight
        ? 'border-green-500/50 bg-green-500/[0.06]'
        : 'border-white/10 bg-white/[0.04]'
    "
  >
    <div class="flex flex-wrap items-center gap-2">
      <slot name="badges" />
      <span
        class="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] tracking-wide uppercase"
        :class="statusColor"
      >
        {{ tournamentStatusLabel(tournament.status) }}
      </span>
      <span
        v-if="tournament.platformCode"
        class="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/70"
        >{{ tournament.platformCode }}</span
      >
      <UiVrsusArciChip :required="tournament.arciRequired" size="sm" />
      <span
        v-if="!tournament.rankingEnabled"
        class="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] text-amber-200"
        >Fuori ranking</span
      >
    </div>

    <h1 class="font-display mt-4 text-2xl font-semibold text-white sm:text-3xl">
      {{ tournament.name }}
    </h1>

    <ul class="mt-3 flex flex-wrap items-center gap-1.5">
      <li
        v-for="(chip, index) in summary"
        :key="chip"
        class="rounded-lg px-2 py-1 text-xs"
        :class="
          index === 0
            ? 'bg-brand-blue-500/15 text-brand-blue-200'
            : 'bg-white/[0.06] text-white/65'
        "
      >
        {{ chip }}
      </li>
    </ul>

    <div
      v-if="tournament.winner"
      class="mt-4 flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/[0.08] px-4 py-3"
    >
      <UIcon name="i-lucide-crown" class="size-6 shrink-0 text-amber-300" />
      <div class="min-w-0">
        <p class="text-[11px] tracking-[0.18em] text-amber-200/80 uppercase">
          Vincitore
        </p>
        <p class="truncate font-semibold text-white">
          {{ tournament.winner.displayName }}
        </p>
      </div>
    </div>

    <button
      type="button"
      class="mt-4 inline-flex min-h-9 items-center gap-1.5 rounded-lg text-sm text-white/50 transition-colors hover:text-white/80"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      <span>{{ expanded ? 'Nascondi dettagli' : 'Mostra dettagli' }}</span>
      <UIcon
        :name="expanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
        class="size-4"
      />
    </button>

    <dl
      v-show="expanded"
      class="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"
    >
      <div class="flex justify-between gap-3 sm:block">
        <dt class="text-white/45">Piattaforma</dt>
        <dd class="text-white/85 sm:mt-1">
          {{ tournament.platformName ?? '—' }}
        </dd>
      </div>
      <div class="flex justify-between gap-3 sm:block">
        <dt class="text-white/45">Gioco</dt>
        <dd class="text-white/85 sm:mt-1">{{ tournament.gameName ?? '—' }}</dd>
      </div>
      <div class="flex justify-between gap-3 sm:block">
        <dt class="text-white/45">Tipo di torneo</dt>
        <dd class="text-white/85 sm:mt-1">
          {{ tournamentStructureLabel(tournament) }}
        </dd>
      </div>
      <div class="flex justify-between gap-3 sm:block">
        <dt class="text-white/45">Composizione</dt>
        <dd class="text-white/85 sm:mt-1">
          {{ tournamentEntryLabel(tournament.entrySize) }}
        </dd>
      </div>
      <div class="flex justify-between gap-3 sm:block">
        <dt class="text-white/45">Come si vince</dt>
        <dd class="text-white/85 sm:mt-1">
          {{ tournamentResultLabel(tournament) }}
        </dd>
      </div>
      <div class="flex justify-between gap-3 sm:block">
        <dt class="text-white/45">Data e ora</dt>
        <dd class="text-white/85 sm:mt-1">
          {{ formatTournamentDate(tournament.startsAt) }}
        </dd>
      </div>
      <div class="flex justify-between gap-3 sm:block">
        <dt class="text-white/45">Iscritti</dt>
        <dd class="text-white/85 sm:mt-1">
          {{ tournament.entriesCount }} / {{ tournament.maxEntries ?? '∞' }}
        </dd>
      </div>
      <div class="flex justify-between gap-3 sm:block">
        <dt class="text-white/45">Partite giocate</dt>
        <dd class="text-white/85 sm:mt-1">
          {{ tournament.matchesPlayed }} / {{ tournament.matchesTotal }}
        </dd>
      </div>
      <div
        v-if="tournament.eventTitle"
        class="flex justify-between gap-3 sm:block"
      >
        <dt class="text-white/45">Evento</dt>
        <dd class="truncate text-white/85 sm:mt-1">
          {{ tournament.eventTitle }}
        </dd>
      </div>
      <div
        v-if="tournament.pointSchemeName"
        class="flex justify-between gap-3 sm:block"
      >
        <dt class="text-white/45">Punti VRSUS</dt>
        <dd class="truncate text-white/85 sm:mt-1">
          {{ tournament.pointSchemeName }}
        </dd>
      </div>
    </dl>

    <div class="mt-5 empty:mt-0">
      <slot name="actions" />
    </div>
  </header>
</template>
