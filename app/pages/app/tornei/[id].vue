<script setup lang="ts">
import {
  checkInTournamentEntry,
  registerTournamentEntry,
  tournamentMatchStatusLabel,
  tournamentStatusLabel,
  withdrawTournamentEntry,
} from '~/composables/useTournaments'
import type { Database } from '~/types/database.types'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const client = useSupabaseClient<Database>()
const user = useSupabaseUser()
const tournamentId = String(route.params.id)
const pending = ref(false)
const message = ref('')
const errorMessage = ref('')

const { data: tournament, error } = await useAsyncData(
  `my-tournament-${tournamentId}`,
  async () => {
    const { data, error } = await client
      .from('public_tournaments')
      .select('*')
      .eq('id', tournamentId)
      .maybeSingle()
    if (error) throw error
    return data
  },
)

if (error.value || !tournament.value) {
  throw createError({ statusCode: 404, statusMessage: 'Torneo non trovato' })
}

const { data: entries } = await useAsyncData(
  `my-tournament-entries-${tournamentId}`,
  async () => {
    const { data, error } = await client
      .from('public_tournament_entries')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('seed', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
    if (error) throw error
    return data ?? []
  },
)
const { data: matches } = await useAsyncData(
  `my-tournament-matches-${tournamentId}`,
  async () => {
    const { data, error } = await client
      .from('public_tournament_matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('round_number', { ascending: true })
      .order('bracket_position', { ascending: true })
    if (error) throw error
    return data ?? []
  },
)
const { data: membership } = await useAsyncData(
  `my-tournament-membership-${tournamentId}-${user.value?.sub ?? 'anonymous'}`,
  async () => {
    if (!user.value) return null
    const { data: ownEntries, error } = await client
      .from('tournament_entry_members')
      .select('entry_id')
      .eq('user_id', user.value.sub)
    if (error) throw error
    const entryIds = new Set((entries.value ?? []).map((entry) => entry.id))
    return ownEntries?.find((entry) => entryIds.has(entry.entry_id)) ?? null
  },
)

const myEntry = computed(() =>
  entries.value?.find((entry) => entry.id === membership.value?.entry_id),
)

function entryName(entryId: string | null) {
  return (
    entries.value?.find((entry) => entry.id === entryId)?.display_name ??
    'In attesa'
  )
}

const rounds = computed(() => [
  ...new Set((matches.value ?? []).map((match) => match.round_number)),
])

function matchesForRound(round: number | null) {
  return matches.value?.filter((match) => match.round_number === round) ?? []
}

async function refreshTournament() {
  await Promise.all([
    refreshNuxtData(`my-tournament-entries-${tournamentId}`),
    refreshNuxtData(`my-tournament-matches-${tournamentId}`),
    refreshNuxtData(
      `my-tournament-membership-${tournamentId}-${user.value?.sub ?? 'anonymous'}`,
    ),
  ])
}

async function perform(action: () => Promise<unknown>, success: string) {
  pending.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    await action()
    message.value = success
    await refreshTournament()
  } catch {
    errorMessage.value = 'L’operazione non è disponibile in questo momento.'
  } finally {
    pending.value = false
  }
}

function register() {
  return perform(
    () => registerTournamentEntry(tournamentId),
    'Iscrizione registrata. Presentati al check-in quando richiesto.',
  )
}

function withdraw() {
  return perform(
    () => withdrawTournamentEntry(tournamentId),
    'Iscrizione ritirata.',
  )
}

function checkIn() {
  if (!myEntry.value) return
  const entryId = myEntry.value.id
  if (!entryId) return
  return perform(
    () => checkInTournamentEntry(entryId),
    'Check-in torneo completato.',
  )
}

let realtimeChannel: ReturnType<typeof client.channel> | null = null
onMounted(() => {
  realtimeChannel = client
    .channel(`my-tournament-${tournamentId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `tournament_id=eq.${tournamentId}`,
      },
      refreshTournament,
    )
    .subscribe()
})
onUnmounted(() => {
  if (realtimeChannel) client.removeChannel(realtimeChannel)
})

useSeoMeta({ title: 'Dettaglio torneo — VRSUS', robots: 'noindex, nofollow' })
</script>

<template>
  <main
    class="mx-auto min-h-[calc(100vh-9rem)] max-w-7xl px-5 py-16 sm:px-8 lg:py-24"
  >
    <NuxtLink to="/app/tornei" class="text-sm text-white/50 hover:text-white"
      >← I miei tornei</NuxtLink
    >
    <header class="mt-8 max-w-3xl">
      <UBadge
        color="primary"
        variant="subtle"
        :label="tournamentStatusLabel(String(tournament!.status))"
      />
      <h1
        class="font-display mt-5 text-4xl font-semibold text-white sm:text-6xl"
      >
        {{ tournament!.name }}<span class="text-brand-red-500">.</span>
      </h1>
      <p
        v-if="tournament!.description"
        class="mt-5 text-lg leading-8 text-white/60"
      >
        {{ tournament!.description }}
      </p>
    </header>

    <div class="mt-8 flex flex-wrap items-center gap-3">
      <UButton
        v-if="!myEntry && tournament!.status === 'registration_open'"
        :loading="pending"
        color="primary"
        label="Iscriviti al torneo"
        @click="register"
      />
      <UButton
        v-else-if="
          myEntry &&
          tournament!.checkin_required &&
          myEntry.status === 'registered'
        "
        :loading="pending"
        color="secondary"
        label="Conferma check-in"
        @click="checkIn"
      />
      <UBadge
        v-else-if="myEntry"
        color="success"
        variant="subtle"
        :label="
          myEntry.status === 'checked_in'
            ? 'Check-in completato'
            : 'Iscrizione registrata'
        "
      />
      <UButton
        v-if="
          myEntry &&
          ['registered', 'checked_in'].includes(String(myEntry.status))
        "
        :loading="pending"
        color="neutral"
        variant="ghost"
        label="Ritira iscrizione"
        @click="withdraw"
      />
    </div>
    <UAlert
      v-if="message"
      class="mt-5 max-w-xl"
      color="success"
      variant="subtle"
      :description="message"
    />
    <UAlert
      v-if="errorMessage"
      class="mt-5 max-w-xl"
      color="error"
      variant="subtle"
      :description="errorMessage"
    />

    <section class="mt-14 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div>
        <h2 class="font-display text-2xl font-semibold text-white">Bracket</h2>
        <div
          v-if="!matches?.length"
          class="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-sm text-white/50"
        >
          Il bracket sarà pubblicato quando il torneo inizierà.
        </div>
        <div v-else class="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <div v-for="round in rounds" :key="String(round)" class="space-y-3">
            <p class="text-xs tracking-[0.18em] text-white/40 uppercase">
              {{
                round === rounds[rounds.length - 1]
                  ? 'Finale'
                  : `Round ${round}`
              }}
            </p>
            <div
              v-for="match in matchesForRound(round)"
              :key="String(match.id)"
              class="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
            >
              <div
                class="flex items-center justify-between text-xs text-white/40"
              >
                <span>#{{ match.bracket_position }}</span
                ><span>{{
                  tournamentMatchStatusLabel(String(match.status))
                }}</span>
              </div>
              <div class="mt-3 space-y-2 text-sm">
                <p
                  :class="
                    match.winner_entry_id === match.entry_a_id
                      ? 'font-semibold text-white'
                      : 'text-white/60'
                  "
                >
                  {{ entryName(match.entry_a_id) }}
                </p>
                <p
                  :class="
                    match.winner_entry_id === match.entry_b_id
                      ? 'font-semibold text-white'
                      : 'text-white/60'
                  "
                >
                  {{ entryName(match.entry_b_id) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <aside>
        <h2 class="font-display text-2xl font-semibold text-white">
          Partecipanti
        </h2>
        <div
          class="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
        >
          <p class="text-sm text-white/45">
            {{ entries?.length ?? 0 }} iscritti<span
              v-if="tournament!.max_entries"
            >
              / {{ tournament!.max_entries }}</span
            >
          </p>
          <ul
            class="mt-4 divide-y divide-white/10"
            aria-label="Partecipanti torneo"
          >
            <li
              v-for="entry in entries"
              :key="String(entry.id)"
              class="flex items-center justify-between gap-3 py-3 text-sm"
            >
              <span class="text-white/75">{{ entry.display_name }}</span
              ><span class="text-xs text-white/35">{{
                entry.seed
                  ? `Seed ${entry.seed}`
                  : tournamentStatusLabel(String(entry.status))
              }}</span>
            </li>
          </ul>
        </div>
      </aside>
    </section>
  </main>
</template>
