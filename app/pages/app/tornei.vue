<script setup lang="ts">
import type { Database } from '~/types/database.types'

definePageMeta({ middleware: ['auth'] })

const client = useSupabaseClient<Database>()
type TournamentEntry = Database['public']['Tables']['tournament_entries']['Row']

const {
  data: tournaments,
  status,
  error,
} = await useAsyncData('my-area-tournaments', async () => {
  const { data, error } = await client
    .from('public_tournaments')
    .select('*')
    .order('starts_at', { ascending: true })
  if (error) throw error
  return data ?? []
})
const { data: entries } = await useAsyncData<TournamentEntry[]>(
  'my-tournament-entries',
  async () => {
    const { data, error } = await client
      .from('tournament_entries')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },
)

const myTournamentIds = computed(
  () => new Set((entries.value ?? []).map((entry) => entry.tournament_id)),
)

function isRegistered(tournamentId: string | null) {
  return tournamentId ? myTournamentIds.value.has(tournamentId) : false
}

useSeoMeta({ title: 'I miei tornei — VRSUS', robots: 'noindex, nofollow' })
</script>

<template>
  <main
    class="mx-auto min-h-[calc(100vh-9rem)] max-w-7xl px-5 py-16 sm:px-8 lg:py-24"
  >
    <NuxtLink to="/app" class="text-sm text-white/50 hover:text-white"
      >← Area personale</NuxtLink
    >
    <header class="mt-8 max-w-2xl">
      <p
        class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
      >
        VRSUS Arena
      </p>
      <h1 class="font-display mt-3 text-4xl font-semibold text-white">
        I miei tornei<span class="text-brand-red-500">.</span>
      </h1>
      <p class="mt-4 text-white/55">
        Segui le iscrizioni, il check-in e i match dei tornei pubblicati.
      </p>
    </header>

    <div class="mt-10">
      <div v-if="status === 'pending'" class="text-white/50">
        Caricamento tornei…
      </div>
      <UAlert
        v-else-if="error"
        color="error"
        variant="subtle"
        description="Non è stato possibile caricare i tornei."
      />
      <div
        v-else-if="!tournaments?.length"
        class="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-white/55"
      >
        Non ci sono ancora tornei pubblicati.
      </div>
      <div v-else class="grid gap-5 md:grid-cols-2">
        <NuxtLink
          v-for="tournament in tournaments"
          :key="String(tournament.id)"
          :to="`/app/tornei/${String(tournament.id)}`"
          class="group rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition-colors hover:border-white/25 sm:p-8"
        >
          <div class="flex items-center justify-between gap-3">
            <UBadge
              color="primary"
              variant="subtle"
              :label="tournamentStatusLabel(String(tournament.status))"
            />
            <UBadge
              v-if="isRegistered(tournament.id)"
              color="success"
              variant="subtle"
              label="Iscritto"
            />
          </div>
          <h2 class="font-display mt-8 text-2xl font-semibold text-white">
            {{ tournament.name }}
          </h2>
          <p
            v-if="tournament.description"
            class="mt-3 line-clamp-3 text-sm leading-6 text-white/60"
          >
            {{ tournament.description }}
          </p>
          <div
            class="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/50"
          >
            <span v-if="tournament.starts_at">{{
              formatPublicEventDate(String(tournament.starts_at))
            }}</span>
            <span v-if="tournament.max_entries"
              >Max {{ tournament.max_entries }} partecipanti</span
            >
          </div>
        </NuxtLink>
      </div>
    </div>
  </main>
</template>
