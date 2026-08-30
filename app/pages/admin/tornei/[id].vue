<script setup lang="ts">
import type { VrsusRole } from '~/composables/useVrsusAuth'
import type { Database } from '~/types/database.types'

type MatchScore = NonNullable<
  Database['public']['Tables']['matches']['Insert']['score_payload']
>

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: [
    'tournament_admin',
    'admin',
    'super_admin',
  ] satisfies VrsusRole[],
})

const route = useRoute()
const client = useSupabaseClient()
const tournamentId = String(route.params.id)
const pending = ref(false)
const message = ref('')
const selectedWinners = reactive<Record<string, string>>({})
const selectedStations = reactive<Record<string, string>>({})
const scorePayloads = reactive<Record<string, string>>({})

const { data: tournament, error } = await useAsyncData(
  `admin-tournament-${tournamentId}`,
  async () => {
    const { data, error } = await client
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .maybeSingle()
    if (error) throw error
    return data
  },
)
const { data: entries, refresh: refreshEntries } = await useAsyncData(
  `admin-tournament-entries-${tournamentId}`,
  async () => {
    const { data, error } = await client
      .from('tournament_entries')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('created_at')
    if (error) throw error
    return data ?? []
  },
)
const { data: matches, refresh: refreshMatches } = await useAsyncData(
  `admin-tournament-matches-${tournamentId}`,
  async () => {
    const { data, error } = await client
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('round_number')
      .order('bracket_position')
    if (error) throw error
    return data ?? []
  },
)
const { data: eventStations } = await useAsyncData(
  `admin-tournament-stations-${tournamentId}`,
  async () => {
    if (!tournament.value?.event_id) return []
    const { data: stationLinks, error: stationLinksError } = await client
      .from('event_stations')
      .select('id, station_id, public_name')
      .eq('event_id', tournament.value.event_id)
      .eq('active', true)
      .order('sort_order')
    if (stationLinksError) throw stationLinksError
    const stationIds = (stationLinks ?? []).map((station) => station.station_id)
    if (!stationIds.length) return []
    const { data: stations, error: stationsError } = await client
      .from('stations')
      .select('id, name')
      .in('id', stationIds)
    if (stationsError) throw stationsError
    return (stationLinks ?? []).map((link) => ({
      id: link.id,
      name:
        link.public_name ??
        stations?.find((station) => station.id === link.station_id)?.name ??
        'Postazione',
    }))
  },
)

function entryName(id: string | null) {
  return (
    entries.value?.find((entry) => entry.id === id)?.display_name ?? 'In attesa'
  )
}

async function createBracket() {
  pending.value = true
  try {
    await client.rpc('create_single_elimination_bracket', {
      p_tournament_id: tournamentId,
    })
    message.value = 'Bracket generato.'
    await refreshMatches()
    await refreshEntries()
  } catch {
    message.value =
      'Bracket non generato: servono almeno due partecipanti eleggibili.'
  } finally {
    pending.value = false
  }
}

async function checkIn(entryId: string | null) {
  if (!entryId) return
  pending.value = true
  try {
    await client.rpc('check_in_tournament_entry', { p_entry_id: entryId })
    message.value = 'Check-in registrato.'
    await refreshEntries()
  } finally {
    pending.value = false
  }
}

async function recordResult(matchId: string | null) {
  if (!matchId || !selectedWinners[matchId]) return
  pending.value = true
  try {
    let scorePayload: MatchScore = {}
    const rawScore = scorePayloads[String(matchId)]?.trim()
    if (rawScore) {
      const parsed = JSON.parse(rawScore) as unknown
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('INVALID_SCORE')
      }
      scorePayload = parsed as MatchScore
    }
    const { error } = await client.rpc('record_match_result', {
      p_match_id: matchId,
      p_score_payload: scorePayload,
      p_winner_entry_id: selectedWinners[matchId],
    })
    if (error) throw error
    message.value = 'Risultato registrato.'
    await refreshMatches()
    await refreshEntries()
  } catch {
    message.value = 'Risultato non registrato: verifica stato e partecipanti.'
  } finally {
    pending.value = false
  }
}

async function callMatch(matchId: string | null) {
  if (!matchId) return
  pending.value = true
  try {
    const { data, error } = await client.rpc('call_tournament_match', {
      p_match_id: matchId,
    })
    if (error) throw error
    const result = data as { notification_ids?: unknown } | null
    const notificationIds = Array.isArray(result?.notification_ids)
      ? result.notification_ids.filter(
          (id): id is string => typeof id === 'string',
        )
      : []
    if (notificationIds.length) {
      await $fetch('/api/notifications/dispatch', {
        method: 'POST',
        body: { notificationIds },
      })
    }
    message.value = 'Giocatori chiamati e notifiche create.'
    await refreshMatches()
  } catch {
    message.value = 'Non è stato possibile chiamare i giocatori.'
  } finally {
    pending.value = false
  }
}

async function startMatch(matchId: string | null) {
  if (!matchId) return
  pending.value = true
  try {
    await client.rpc('start_tournament_match', { p_match_id: matchId })
    message.value = 'Match avviato.'
    await refreshMatches()
  } catch {
    message.value = 'Non è stato possibile avviare il match.'
  } finally {
    pending.value = false
  }
}

async function assignStation(matchId: string | null) {
  if (!matchId || !selectedStations[matchId]) return
  pending.value = true
  try {
    await client.rpc('assign_match_station', {
      p_match_id: matchId,
      p_event_station_id: selectedStations[matchId],
    })
    message.value = 'Postazione assegnata.'
    await refreshMatches()
  } catch {
    message.value = 'Non è stato possibile assegnare la postazione.'
  } finally {
    pending.value = false
  }
}

useSeoMeta({
  title: () => `${tournament.value?.name ?? 'Torneo'} — Admin VRSUS`,
  robots: 'noindex, nofollow',
})
</script>

<template>
  <main class="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
    <NuxtLink to="/admin/tornei" class="text-sm text-white/45 hover:text-white"
      >← Tornei</NuxtLink
    >
    <div v-if="error || !tournament" class="mt-8 text-white/60">
      Torneo non trovato.
    </div>
    <template v-else
      ><div
        class="mt-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p
            class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
          >
            Operazioni torneo
          </p>
          <h1 class="font-display mt-3 text-4xl font-semibold text-white">
            {{ tournament.name }}
          </h1>
          <p class="mt-3 text-white/50">
            {{ tournamentStatusLabel(String(tournament.status)) }}
          </p>
        </div>
        <UButton
          :loading="pending"
          color="primary"
          label="Genera bracket"
          @click="createBracket"
        />
      </div>
      <UAlert
        v-if="message"
        class="mt-6 max-w-xl"
        color="success"
        variant="subtle"
        :description="message"
      />
      <section class="mt-10 grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside>
          <h2 class="font-display text-xl font-semibold text-white">
            Iscritti
          </h2>
          <div class="mt-4 space-y-2">
            <div
              v-for="entry in entries"
              :key="String(entry.id)"
              class="rounded-xl border border-white/10 bg-white/[0.04] p-3"
            >
              <div class="flex items-center justify-between gap-3">
                <span class="text-sm text-white/75">{{
                  entry.display_name
                }}</span
                ><UBadge
                  :color="entry.status === 'checked_in' ? 'success' : 'neutral'"
                  variant="subtle"
                  :label="String(entry.status)"
                />
              </div>
              <UButton
                v-if="entry.status === 'registered'"
                class="mt-3"
                size="xs"
                variant="soft"
                color="secondary"
                label="Check-in"
                @click="checkIn(entry.id)"
              />
            </div>
          </div>
        </aside>
        <div>
          <h2 class="font-display text-xl font-semibold text-white">Match</h2>
          <div class="mt-4 grid gap-3 md:grid-cols-2">
            <div
              v-for="match in matches"
              :key="String(match.id)"
              class="rounded-xl border border-white/10 bg-white/[0.04] p-4"
            >
              <div
                class="flex items-center justify-between text-xs text-white/40"
              >
                <span
                  >Round {{ match.round_number }} · #{{
                    match.bracket_position
                  }}</span
                ><span>{{ match.status }}</span>
              </div>
              <p class="mt-4 text-sm text-white/70">
                {{ entryName(match.entry_a_id) }}
                <span class="text-white/30">vs</span>
                {{ entryName(match.entry_b_id) }}
              </p>
              <div
                v-if="
                  ['ready', 'called', 'running'].includes(String(match.status))
                "
                class="mt-4 space-y-3"
              >
                <div class="flex flex-wrap gap-2">
                  <USelect
                    v-model="selectedStations[String(match.id)]"
                    :items="
                      (eventStations ?? []).map((station) => ({
                        label: station.name,
                        value: String(station.id),
                      }))
                    "
                    :placeholder="
                      match.event_station_id
                        ? 'Postazione assegnata'
                        : 'Postazione'
                    "
                  />
                  <UButton
                    size="sm"
                    variant="soft"
                    :loading="pending"
                    label="Assegna"
                    @click="assignStation(match.id)"
                  />
                </div>
                <div class="flex flex-wrap gap-2">
                  <UButton
                    v-if="match.status === 'ready'"
                    size="sm"
                    variant="soft"
                    :loading="pending"
                    label="Chiama giocatori"
                    @click="callMatch(match.id)"
                  />
                  <UButton
                    v-if="match.status === 'called'"
                    size="sm"
                    variant="soft"
                    :loading="pending"
                    label="Avvia match"
                    @click="startMatch(match.id)"
                  />
                </div>
                <div class="flex flex-wrap gap-2">
                  <USelect
                    v-model="selectedWinners[String(match.id)]"
                    :items="
                      [match.entry_a_id, match.entry_b_id]
                        .filter(Boolean)
                        .map((id) => ({
                          label: entryName(id),
                          value: String(id),
                        }))
                    "
                    placeholder="Vincitore"
                  />
                  <UInput
                    v-model="scorePayloads[String(match.id)]"
                    placeholder='Punteggio JSON, es. {"a":2}'
                    aria-label="Punteggio JSON"
                  />
                  <UButton
                    size="sm"
                    :loading="pending"
                    label="Salva risultato"
                    @click="recordResult(match.id)"
                  />
                </div>
              </div>
            </div>
            <p v-if="!matches?.length" class="text-sm text-white/45">
              Il bracket non è ancora stato generato.
            </p>
          </div>
        </div>
      </section></template
    >
  </main>
</template>
