<script setup lang="ts">
import type { VrsusRole } from '~/composables/useVrsusAuth'
import type { Database } from '~/types/database.types'
import type {
  TournamentDetailView,
  TournamentMatchView,
} from '~~/shared/types/tournament-view'
import {
  defaultTournamentForm,
  tournamentRulesPayload,
} from '~/composables/useTournamentForm'
import {
  assignedParticipants,
  orderedParticipants,
  tournamentRoundLabel,
} from '~~/shared/utils/tournament-standings'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
  requiredRoles: [
    'tournament_admin',
    'admin',
    'super_admin',
  ] satisfies VrsusRole[],
})

const route = useRoute()
const router = useRouter()
const client = useSupabaseClient<Database>()
const tournamentId = String(route.params.id)

// La scheda arriva gia composta dal server: nome, cognome ed eta degli
// iscritti non sono leggibili dal browser.
const { data: detail, refresh } = await useFetch<TournamentDetailView>(
  `/api/admin/tournaments/${tournamentId}`,
)

if (!detail.value) {
  throw createError({ statusCode: 404, statusMessage: 'Torneo non trovato' })
}

const requestFetch = useRequestFetch()

// Le postazioni non hanno grant per il browser: il selettore passa da un
// endpoint service-role.
const { data: stations } = await useAsyncData<{ id: string; name: string }[]>(
  `admin-tournament-stations-${tournamentId}`,
  async () => {
    if (!detail.value?.eventId) return []
    return await requestFetch<{ id: string; name: string }[]>(
      `/api/admin/events/${detail.value.eventId}/platforms`,
    )
  },
)

const activeTab = ref('classifica')

const tabs = computed(() => [
  {
    value: 'classifica',
    label: 'Classifica',
    count: detail.value?.standings.length ?? 0,
  },
  {
    value: 'partite',
    label: 'Partite',
    count: detail.value?.matches.length ?? 0,
  },
  { value: 'info', label: 'Info', count: null },
])

const pending = ref(false)
const message = ref('')
const messageTone = ref<'success' | 'error'>('success')

function notify(text: string, tone: 'success' | 'error' = 'success') {
  message.value = text
  messageTone.value = tone
}

async function run(
  action: () => Promise<unknown>,
  okText: string,
  failText: string,
) {
  pending.value = true
  message.value = ''
  try {
    await action()
    notify(okText)
    await refresh()
  } catch {
    notify(failText, 'error')
  } finally {
    pending.value = false
  }
}

// --- Stato del torneo -------------------------------------------------------

const nextStatuses = computed(() => {
  const status = detail.value?.status
  return (
    {
      draft: [{ value: 'registration_open', label: 'Apri iscrizioni' }],
      registration_open: [
        { value: 'registration_closed', label: 'Chiudi iscrizioni' },
      ],
      registration_closed: [{ value: 'checkin', label: 'Apri check-in' }],
      checkin: [],
      running: [{ value: 'completed', label: 'Concludi torneo' }],
    }[status ?? ''] ?? []
  )
})

const canStart = computed(() =>
  ['registration_closed', 'checkin'].includes(detail.value?.status ?? ''),
)

const canCancel = computed(
  () => !['completed', 'cancelled'].includes(detail.value?.status ?? ''),
)

async function setStatus(next: string) {
  await run(
    async () => {
      const { error } = await client
        .from('tournaments')
        .update({ status: next })
        .eq('id', tournamentId)
      if (error) throw error
    },
    'Stato aggiornato.',
    'Transizione di stato non consentita.',
  )
}

// Squadre incomplete: o le completa lo staff, o vanno tolte prima di generare
// il calendario. Il motore rifiuta di partire, qui si dice perche.
const incompleteTeams = computed(() => {
  const tournament = detail.value
  if (!tournament || tournament.entrySize <= 1) return []
  return tournament.entries.filter(
    (entry) =>
      entry.status !== 'withdrawn' &&
      entry.membersCount !== tournament.entrySize,
  )
})

async function startTournament() {
  const hasMatches = Boolean(detail.value?.matches.length)

  await run(
    async () => {
      if (hasMatches) {
        const { error } = await client
          .from('tournaments')
          .update({ status: 'running' })
          .eq('id', tournamentId)
        if (error) throw error
        return
      }
      const { error } = await client.rpc('generate_tournament_schedule', {
        p_tournament_id: tournamentId,
      })
      if (error) throw error
    },
    'Torneo avviato.',
    incompleteTeams.value.length
      ? 'Avvio non riuscito: completa o elimina le squadre incomplete.'
      : detail.value?.checkinRequired
        ? 'Avvio non riuscito: servono almeno due iscritti con il check-in fatto.'
        : 'Avvio non riuscito: servono almeno due iscritti.',
  )
}

const askDelete = ref(false)

async function deleteTournament() {
  pending.value = true
  const { error } = await client
    .from('tournaments')
    .delete()
    .eq('id', tournamentId)
  pending.value = false

  if (error) {
    notify('Il torneo non e stato eliminato.', 'error')
    return
  }
  await router.push('/admin/tornei')
}

// --- Modifica ---------------------------------------------------------------

const editing = ref(false)

function toLocalInput(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

const form = reactive({
  name: '',
  description: '',
  rules: '',
  startsAt: '',
  maxEntries: null as number | null,
  isPublic: true,
  rankingEnabled: true,
  checkinRequired: true,
})

// La configurazione si puo ancora correggere finche il calendario non
// esiste: dopo, cambiarla renderebbe le partite gia create incoerenti.
const rulesForm = reactive(defaultTournamentForm())
const rulesLocked = computed(() => Boolean(detail.value?.matches.length))

function resetForm() {
  const tournament = detail.value
  if (!tournament) return
  rulesForm.entrySize = tournament.entrySize
  rulesForm.teamFormation =
    tournament.teamFormation as typeof rulesForm.teamFormation
  rulesForm.format = tournament.format
  rulesForm.groupSize = tournament.groupSize
  rulesForm.roundsCount = tournament.roundsCount ?? 3
  rulesForm.resultKind = tournament.resultKind
  rulesForm.scoreDirection = tournament.scoreDirection ?? 'desc'
  rulesForm.heatSeeding = tournament.heatSeeding as typeof rulesForm.heatSeeding
  rulesForm.allowDraw = tournament.allowDraw
  rulesForm.placementPoints = tournament.placementPoints.join('/')
  form.name = tournament.name
  form.description = tournament.description ?? ''
  form.rules = tournament.rules ?? ''
  form.startsAt = toLocalInput(tournament.startsAt)
  form.maxEntries = tournament.maxEntries
  form.isPublic = tournament.isPublic
  form.rankingEnabled = tournament.rankingEnabled
  form.checkinRequired = tournament.checkinRequired
}

watch(editing, (open) => {
  if (open) resetForm()
})

async function saveTournament() {
  await run(
    async () => {
      const { error } = await client
        .from('tournaments')
        .update({
          name: form.name.trim(),
          description: form.description.trim() || null,
          rules: form.rules.trim() || null,
          starts_at: form.startsAt
            ? new Date(form.startsAt).toISOString()
            : null,
          max_entries: form.maxEntries || null,
          is_public: form.isPublic,
          ranking_enabled: form.rankingEnabled,
          checkin_required: form.checkinRequired,
          ...(rulesLocked.value ? {} : tournamentRulesPayload(rulesForm)),
        })
        .eq('id', tournamentId)
      if (error) throw error
      editing.value = false
    },
    'Torneo aggiornato.',
    'Modifica non riuscita: controlla i dati.',
  )
}

// --- Iscritti ---------------------------------------------------------------

const addingEntry = ref(false)
const candidateSearch = ref('')
const selectedCandidate = ref('')

const { data: candidates, refresh: refreshCandidates } = await useAsyncData(
  `admin-tournament-candidates-${tournamentId}`,
  () =>
    requestFetch<
      {
        id: string
        displayName: string
        nickname: string | null
        firstName: string | null
        lastName: string | null
      }[]
    >(`/api/admin/tournaments/${tournamentId}/candidates`, {
      query: { q: candidateSearch.value || undefined },
    }),
  { watch: [candidateSearch], default: () => [] },
)

function candidateLabel(candidate: {
  displayName: string
  nickname: string | null
  firstName: string | null
  lastName: string | null
}) {
  const name = [candidate.firstName, candidate.lastName]
    .filter(Boolean)
    .join(' ')
  const handle = candidate.nickname ?? candidate.displayName
  return name ? `${handle} — ${name}` : handle
}

async function addEntry() {
  if (!selectedCandidate.value) return
  await run(
    async () => {
      await $fetch(`/api/admin/tournaments/${tournamentId}/entries`, {
        method: 'POST',
        body: { userId: selectedCandidate.value },
      })
      selectedCandidate.value = ''
      await refreshCandidates()
    },
    'Iscrizione registrata.',
    'Iscrizione non riuscita: utente gia iscritto o torneo pieno.',
  )
}

async function removeEntry(entryId: string) {
  await run(
    async () => {
      await $fetch(
        `/api/admin/tournaments/${tournamentId}/entries/${entryId}`,
        { method: 'DELETE' },
      )
      await refreshCandidates()
    },
    'Iscritto rimosso.',
    'Rimozione non riuscita.',
  )
}

// Squadra spaiata: lo staff chiede a qualcuno in sala e lo aggiunge, oppure
// toglie la squadra. Sono le due sole uscite prima dell'avvio.
const teamCandidate = reactive<Record<string, string>>({})

async function addTeamMember(entryId: string) {
  const userId = teamCandidate[entryId]
  if (!userId) return
  await run(
    async () => {
      await $fetch(
        `/api/admin/tournaments/${tournamentId}/entries/${entryId}/members`,
        { method: 'POST', body: { userId } },
      )
      teamCandidate[entryId] = ''
      await refreshCandidates()
    },
    'Squadra completata.',
    'Non e stato possibile aggiungere il giocatore.',
  )
}

async function checkInEntry(entryId: string) {
  await run(
    async () => {
      const { error } = await client.rpc('check_in_tournament_entry', {
        p_entry_id: entryId,
      })
      if (error) throw error
    },
    'Check-in registrato.',
    'Check-in non riuscito.',
  )
}

// --- Partite ----------------------------------------------------------------

const selectedMatchId = ref<string | null>(null)

const selectedMatch = computed(
  () =>
    detail.value?.matches.find((match) => match.id === selectedMatchId.value) ??
    null,
)

// Il risultato ha una riga per posto in partita: due in un duello, quattro in
// una manche, una sola in un tentativo a cronometro. Cosa si scrive in quella
// riga dipende da come si vince, non dalla struttura.
type ResultRow = {
  entryId: string
  label: string
  score: number | null
  placement: number | null
}

const matchForm = reactive({
  stationId: '',
  winnerEntryId: '',
  draw: false,
  results: [] as ResultRow[],
})

function entryName(entryId: string | null) {
  if (!entryId) return 'In attesa'
  return (
    detail.value?.entries.find((entry) => entry.id === entryId)?.displayName ??
    'Partecipante'
  )
}

function selectMatch(match: TournamentMatchView) {
  selectedMatchId.value = match.id
  matchForm.stationId = ''
  matchForm.winnerEntryId = match.winnerEntryId ?? ''
  matchForm.draw = match.participants.some((part) => part.outcome === 'draw')
  matchForm.results = orderedParticipants(match)
    .filter((part) => part.entryId)
    .map((part) => ({
      entryId: part.entryId as string,
      label: entryName(part.entryId),
      score: part.score,
      placement: part.placement,
    }))
}

const matchTitle = computed(() => {
  const match = selectedMatch.value
  if (!match || !detail.value) return ''
  const names = assignedParticipants(match).map((part) =>
    entryName(part.entryId),
  )
  return detail.value.groupSize > 2 || names.length > 2
    ? names.join(' · ')
    : names.join(' vs ')
})

/** Cosa manca per salvare: si dice prima di far premere il pulsante. */
const resultError = computed(() => {
  const tournament = detail.value
  if (!tournament || !matchForm.results.length) return 'Partita senza iscritti.'

  if (tournament.resultKind === 'win_loss') {
    if (matchForm.draw) return null
    return matchForm.winnerEntryId ? null : 'Scegli chi ha vinto.'
  }
  if (tournament.resultKind === 'placement') {
    const places = matchForm.results.map((row) => row.placement)
    if (places.some((place) => !place)) return 'Indica l ordine di arrivo.'
    if (new Set(places).size !== places.length) {
      return 'Due concorrenti non possono avere la stessa posizione.'
    }
    return null
  }
  return matchForm.results.some((row) => row.score === null)
    ? tournament.resultKind === 'time'
      ? 'Inserisci il tempo di ogni concorrente.'
      : 'Inserisci il punteggio di ogni concorrente.'
    : null
})

function resultsPayload() {
  const kind = detail.value?.resultKind
  return matchForm.results.map((row) => ({
    entry_id: row.entryId,
    score: kind === 'points' || kind === 'time' ? row.score : null,
    placement: kind === 'placement' ? row.placement : null,
    outcome:
      kind === 'win_loss'
        ? matchForm.draw
          ? 'draw'
          : row.entryId === matchForm.winnerEntryId
            ? 'win'
            : 'loss'
        : null,
  }))
}

async function saveResult() {
  const match = selectedMatch.value
  if (!match || resultError.value) return
  await run(
    async () => {
      const { error } = await client.rpc('record_match_results', {
        p_match_id: match.id,
        p_results: resultsPayload(),
      })
      if (error) throw error
    },
    'Risultato registrato.',
    'Risultato non registrato: verifica stato e partecipanti.',
  )
}

async function amendScore() {
  const match = selectedMatch.value
  if (!match) return
  await run(
    async () => {
      const { error } = await client.rpc('amend_match_results', {
        p_match_id: match.id,
        p_results: matchForm.results.map((row) => ({
          entry_id: row.entryId,
          score: row.score,
        })),
      })
      if (error) throw error
    },
    'Punteggio corretto.',
    'Correzione non riuscita.',
  )
}

async function assignStation() {
  const match = selectedMatch.value
  if (!match || !matchForm.stationId) return
  await run(
    async () => {
      const { error } = await client.rpc('assign_match_station', {
        p_match_id: match.id,
        p_event_platform_id: matchForm.stationId,
      })
      if (error) throw error
    },
    'Postazione assegnata.',
    'Assegnazione non riuscita.',
  )
}

async function callMatch() {
  const match = selectedMatch.value
  if (!match) return
  await run(
    async () => {
      const { data, error } = await client.rpc('call_tournament_match', {
        p_match_id: match.id,
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
    },
    'Giocatori chiamati.',
    'Non e stato possibile chiamare i giocatori.',
  )
}

async function startMatch() {
  const match = selectedMatch.value
  if (!match) return
  await run(
    async () => {
      const { error } = await client.rpc('start_tournament_match', {
        p_match_id: match.id,
      })
      if (error) throw error
    },
    'Match avviato.',
    'Non e stato possibile avviare il match.',
  )
}

useSeoMeta({
  title: () => `${detail.value?.name ?? 'Torneo'} — Admin VRSUS`,
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div v-if="detail" class="space-y-6">
    <NuxtLink to="/admin/tornei" class="text-sm text-white/45 hover:text-white">
      ← Tornei
    </NuxtLink>

    <TournamentSummary :tournament="detail">
      <template #actions>
        <div class="flex flex-wrap items-center gap-2">
          <UButton
            v-for="option in nextStatuses"
            :key="option.value"
            color="neutral"
            variant="outline"
            size="sm"
            :loading="pending"
            :label="option.label"
            @click="setStatus(option.value)"
          />
          <UButton
            v-if="canStart"
            color="primary"
            size="sm"
            icon="i-lucide-play"
            :loading="pending"
            label="Avvia torneo"
            @click="startTournament"
          />
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-lucide-pencil"
            :label="editing ? 'Chiudi modifica' : 'Modifica'"
            @click="editing = !editing"
          />
          <template v-if="askDelete">
            <span class="text-sm text-white/60">Eliminare il torneo?</span>
            <UButton
              color="error"
              size="sm"
              :loading="pending"
              label="Conferma"
              @click="deleteTournament"
            />
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              label="Annulla"
              @click="askDelete = false"
            />
          </template>
          <UButton
            v-else
            color="error"
            variant="ghost"
            size="sm"
            icon="i-lucide-trash-2"
            label="Elimina"
            @click="askDelete = true"
          />
          <UButton
            v-if="canCancel"
            color="neutral"
            variant="ghost"
            size="sm"
            :loading="pending"
            label="Annulla torneo"
            @click="setStatus('cancelled')"
          />
        </div>
      </template>
    </TournamentSummary>

    <UAlert
      v-if="message"
      :color="messageTone === 'success' ? 'success' : 'error'"
      variant="subtle"
      :description="message"
    />

    <!-- Modifica del torneo -->
    <section
      v-if="editing"
      class="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
    >
      <h2 class="font-display text-lg font-semibold text-white">
        Modifica torneo
      </h2>
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <UFormField label="Nome">
          <UInput v-model="form.name" class="w-full" />
        </UFormField>
        <UFormField label="Data e ora">
          <UInput
            v-model="form.startsAt"
            type="datetime-local"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Numero massimo partecipanti">
          <UInput
            v-model.number="form.maxEntries"
            type="number"
            min="2"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Descrizione" class="sm:col-span-2">
          <UTextarea v-model="form.description" :rows="4" class="w-full" />
        </UFormField>
        <UFormField label="Regole" class="sm:col-span-2">
          <UTextarea v-model="form.rules" :rows="6" class="w-full" />
        </UFormField>
      </div>

      <p v-if="rulesLocked" class="mt-5 text-xs text-white/45">
        Il calendario e gia stato generato: struttura e punteggio non si
        cambiano piu.
      </p>
      <AdminTournamentRulesFields
        v-model="rulesForm"
        class="mt-4"
        :entries-count="detail.entriesCount"
        :disabled="rulesLocked"
      />
      <div class="mt-4 flex flex-wrap gap-5">
        <UCheckbox v-model="form.isPublic" label="Visibile agli utenti" />
        <UCheckbox
          v-model="form.rankingEnabled"
          label="Assegna punti ranking"
        />
        <UCheckbox v-model="form.checkinRequired" label="Richiede check-in" />
      </div>
      <div class="mt-5 flex gap-2">
        <UButton
          color="primary"
          :loading="pending"
          label="Salva"
          @click="saveTournament"
        />
        <UButton
          color="neutral"
          variant="ghost"
          label="Annulla"
          @click="editing = false"
        />
      </div>
    </section>

    <div class="sticky-tabs">
      <UiVrsusTabs v-model="activeTab" :items="tabs" />
    </div>

    <!-- Classifica -->
    <section v-if="activeTab === 'classifica'" class="space-y-4">
      <div
        v-if="incompleteTeams.length"
        class="rounded-2xl border border-amber-400/30 bg-amber-400/[0.07] p-4"
      >
        <h2 class="font-display text-sm font-semibold text-amber-200">
          {{ incompleteTeams.length }} squadre incomplete
        </h2>
        <p class="mt-1 text-xs text-amber-100/70">
          Il torneo non parte finche restano squadre spaiate: aggiungi un
          giocatore o elimina la squadra.
        </p>
        <ul class="mt-3 space-y-2">
          <li
            v-for="team in incompleteTeams"
            :key="team.id"
            class="flex flex-wrap items-center gap-2 rounded-xl bg-black/20 px-3 py-2"
          >
            <span class="min-w-0 flex-1 truncate text-sm text-white/85">
              {{ team.displayName }}
              <span class="text-white/45"
                >· {{ team.membersCount }}/{{ detail.entrySize }}</span
              >
            </span>
            <select
              v-model="teamCandidate[team.id]"
              class="vrsus-select w-full sm:w-60"
              :aria-label="`Giocatore da aggiungere a ${team.displayName}`"
            >
              <option value="">Scegli un utente…</option>
              <option
                v-for="candidate in candidates ?? []"
                :key="candidate.id"
                :value="candidate.id"
              >
                {{ candidateLabel(candidate) }}
              </option>
            </select>
            <UButton
              size="xs"
              color="primary"
              :loading="pending"
              :disabled="!teamCandidate[team.id]"
              label="Aggiungi"
              @click="addTeamMember(team.id)"
            />
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              :loading="pending"
              label="Elimina squadra"
              @click="removeEntry(team.id)"
            />
          </li>
        </ul>
      </div>

      <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div class="flex flex-wrap items-end gap-3">
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            icon="i-lucide-user-plus"
            :label="addingEntry ? 'Chiudi' : 'Iscrivi un utente'"
            @click="addingEntry = !addingEntry"
          />
          <template v-if="addingEntry">
            <UInput
              v-model="candidateSearch"
              placeholder="Cerca per nome o nickname"
              class="w-full sm:w-64"
            />
            <select
              v-model="selectedCandidate"
              class="vrsus-select w-full sm:w-72"
              aria-label="Utente da iscrivere"
            >
              <option value="">Scegli un utente…</option>
              <option
                v-for="candidate in candidates ?? []"
                :key="candidate.id"
                :value="candidate.id"
              >
                {{ candidateLabel(candidate) }}
              </option>
            </select>
            <UButton
              color="primary"
              size="sm"
              :loading="pending"
              :disabled="!selectedCandidate"
              label="Iscrivi"
              @click="addEntry"
            />
          </template>
        </div>
      </div>

      <TournamentStandings
        :standings="detail.standings"
        :rules="detail"
        show-identity
        profile-base-path="/admin/utenti"
      >
        <template #row-actions="{ row }">
          <span class="flex items-center gap-1">
            <UButton
              v-if="row.status === 'registered'"
              size="xs"
              color="secondary"
              variant="soft"
              :loading="pending"
              label="Check-in"
              @click="checkInEntry(row.entryId)"
            />
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-lucide-user-minus"
              :loading="pending"
              aria-label="Rimuovi iscritto"
              @click="removeEntry(row.entryId)"
            />
          </span>
        </template>
      </TournamentStandings>
    </section>

    <!-- Partite -->
    <section v-else-if="activeTab === 'partite'" class="space-y-4">
      <div
        v-if="selectedMatch"
        class="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs tracking-wide text-white/40 uppercase">
              {{
                tournamentRoundLabel(
                  selectedMatch.roundNumber,
                  detail.matches[detail.matches.length - 1]?.roundNumber ??
                    selectedMatch.roundNumber,
                  detail.format,
                )
              }}
              · #{{ selectedMatch.bracketPosition }}
            </p>
            <p class="mt-1 font-medium text-white">{{ matchTitle }}</p>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-x"
            aria-label="Chiudi incontro"
            @click="selectedMatchId = null"
          />
        </div>

        <div
          v-if="stations?.length"
          class="mt-4 flex flex-wrap items-center gap-2"
        >
          <select
            v-model="matchForm.stationId"
            class="vrsus-select w-full sm:w-64"
            aria-label="Postazione"
          >
            <option value="">
              {{
                selectedMatch.platformName
                  ? `Assegnata: ${selectedMatch.platformName}`
                  : 'Postazione…'
              }}
            </option>
            <option
              v-for="station in stations"
              :key="station.id"
              :value="station.id"
            >
              {{ station.name }}
            </option>
          </select>
          <UButton
            size="sm"
            variant="soft"
            color="neutral"
            :loading="pending"
            :disabled="!matchForm.stationId"
            label="Assegna"
            @click="assignStation"
          />
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-2">
          <UButton
            v-if="selectedMatch.status === 'ready'"
            size="sm"
            variant="soft"
            color="secondary"
            :loading="pending"
            label="Chiama giocatori"
            @click="callMatch"
          />
          <UButton
            v-if="selectedMatch.status === 'called'"
            size="sm"
            variant="soft"
            color="secondary"
            :loading="pending"
            label="Avvia match"
            @click="startMatch"
          />
          <!--
            Chiamare e avviare restano comodi in sala, ma non sono piu
            obbligatori: con quattro manche di fila la sequenza era solo un
            peso, e il risultato si registra anche da "pronto" (DEC-038).
          -->
          <p
            v-if="selectedMatch.status === 'pending'"
            class="text-xs text-white/40"
          >
            Questa partita aspetta ancora i partecipanti.
          </p>
        </div>

        <!--
          Una riga per posto in partita. Quello che si chiede dipende da come
          si vince: la crocetta del vincitore, il punteggio, il tempo o la
          posizione di arrivo.
        -->
        <ul class="mt-4 space-y-2">
          <li
            v-for="(row, index) in matchForm.results"
            :key="row.entryId"
            class="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2"
          >
            <span class="min-w-0 flex-1 truncate text-sm text-white/85">{{
              row.label
            }}</span>

            <template v-if="detail.resultKind === 'win_loss'">
              <label class="flex items-center gap-2 text-sm text-white/70">
                <input
                  v-model="matchForm.winnerEntryId"
                  type="radio"
                  :value="row.entryId"
                  :disabled="matchForm.draw"
                  class="size-4"
                />
                Vincitore
              </label>
            </template>

            <UInput
              v-else-if="detail.resultKind === 'placement'"
              v-model.number="row.placement"
              type="number"
              min="1"
              :max="matchForm.results.length"
              class="w-24"
              :aria-label="`Posizione di ${row.label}`"
            />

            <UInput
              v-else
              v-model.number="row.score"
              type="number"
              :step="detail.resultKind === 'time' ? '0.001' : '1'"
              class="w-32"
              :placeholder="detail.resultKind === 'time' ? 'secondi' : 'punti'"
              :aria-label="`Risultato di ${row.label}`"
            />

            <span class="w-6 shrink-0 text-right text-xs text-white/30">{{
              index + 1
            }}</span>
          </li>
        </ul>

        <label
          v-if="detail.allowDraw && detail.resultKind === 'win_loss'"
          class="mt-3 flex items-center gap-2 text-sm text-white/70"
        >
          <input v-model="matchForm.draw" type="checkbox" class="size-4" />
          Pareggio
        </label>

        <div class="mt-4 flex flex-wrap items-center gap-2">
          <UButton
            v-if="selectedMatch.status !== 'completed'"
            color="primary"
            size="sm"
            :loading="pending"
            :disabled="
              Boolean(resultError) || selectedMatch.status === 'pending'
            "
            label="Salva risultato"
            @click="saveResult"
          />
          <p
            v-if="selectedMatch.status !== 'completed' && resultError"
            class="text-xs text-amber-300/80"
          >
            {{ resultError }}
          </p>
          <template v-else>
            <UButton
              color="neutral"
              variant="outline"
              size="sm"
              :loading="pending"
              label="Correggi punteggio"
              @click="amendScore"
            />
            <p class="text-xs text-white/40">
              A incontro concluso si corregge il punteggio: cambiare il
              vincitore richiederebbe di disfare tabellone e punti gia
              assegnati.
            </p>
          </template>
        </div>
      </div>

      <TournamentMatches
        :matches="detail.matches"
        :entries="detail.entries"
        :rules="detail"
        editable
        @select="selectMatch"
      />
    </section>

    <!-- Info -->
    <section v-else class="space-y-4">
      <div
        v-if="detail.description"
        class="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
      >
        <h2 class="font-display text-base font-semibold text-white">
          Descrizione
        </h2>
        <p class="mt-2 text-sm leading-6 whitespace-pre-line text-white/60">
          {{ detail.description }}
        </p>
      </div>
      <div
        v-if="detail.rules"
        class="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
      >
        <h2 class="font-display text-base font-semibold text-white">Regole</h2>
        <p class="mt-2 text-sm leading-6 whitespace-pre-line text-white/60">
          {{ detail.rules }}
        </p>
      </div>
      <p
        v-if="!detail.description && !detail.rules"
        class="text-sm text-white/45"
      >
        Nessuna descrizione o regola inserita.
      </p>
    </section>
  </div>
</template>
