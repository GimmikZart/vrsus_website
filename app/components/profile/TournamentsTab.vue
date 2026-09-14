<script setup lang="ts">
import type { ProfileTournamentView } from '~~/shared/types/profile-view'
import {
  formatTournamentDate,
  tournamentFormatLabel,
  tournamentStatusLabel,
} from '~/composables/useTournaments'

// Tornei a cui l utente si e iscritto, con il piazzamento quando esiste.
defineProps<{
  tournaments: ProfileTournamentView[]
  /** Prefisso della scheda torneo nella shell corrente. */
  tournamentBasePath: string
}>()

const crowns: Record<number, string> = {
  1: 'text-amber-300',
  2: 'text-slate-300',
  3: 'text-amber-700',
}
</script>

<template>
  <div>
    <p v-if="!tournaments.length" class="text-sm text-white/45">
      Nessuna iscrizione a tornei.
    </p>

    <ul v-else class="grid gap-3 sm:grid-cols-2">
      <li v-for="item in tournaments" :key="item.entryId">
        <NuxtLink
          :to="`${tournamentBasePath}/${item.tournamentId}`"
          class="block h-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.06]"
        >
          <div class="flex items-start gap-3">
            <span
              class="grid size-9 shrink-0 place-items-center rounded-full bg-white/[0.06] text-sm font-semibold text-white/70"
            >
              <UIcon
                v-if="item.position && crowns[item.position]"
                name="i-lucide-crown"
                class="size-5"
                :class="crowns[item.position]"
              />
              <template v-else>{{ item.position ?? '—' }}</template>
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium text-white">{{ item.name }}</p>
              <p class="mt-0.5 truncate text-sm text-white/50">
                <span v-if="item.platformCode">{{ item.platformCode }} · </span>
                {{ item.gameName ?? 'Gioco da definire' }}
              </p>
            </div>
          </div>

          <dl
            class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/45"
          >
            <div>{{ formatTournamentDate(item.startsAt) }}</div>
            <div>{{ tournamentFormatLabel(item.format) }}</div>
            <div>{{ item.wins }}V · {{ item.losses }}S</div>
          </dl>

          <div class="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span class="rounded-md bg-white/10 px-2 py-0.5 text-white/70">{{
              tournamentStatusLabel(item.status)
            }}</span>
            <span
              v-if="item.position"
              class="rounded-md bg-white/10 px-2 py-0.5 text-white/70"
              >{{ item.position }}° su {{ item.entriesCount }}</span
            >
          </div>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
