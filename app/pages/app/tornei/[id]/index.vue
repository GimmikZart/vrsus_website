<script setup lang="ts">
import type { Database } from '~/types/database.types'
import {
  leaveTournamentTeam,
  tournamentRegistrationError,
  withdrawTournamentEntry,
} from '~/composables/useTournaments'
import { fetchPublicTournamentView } from '~/composables/useTournamentView'
import { teamOpenSlots } from '~~/shared/utils/tournament-standings'
import { useMyBookings } from '~/composables/useBookings'

definePageMeta({ layout: 'app', middleware: ['auth'] })

const route = useRoute()
const client = useSupabaseClient<Database>()
const user = useSupabaseUser()
const tournamentId = computed(() => String(route.params.id))

// Stessa struttura della scheda torneo della console: intestazione, classifica
// e partite. Cambiano i dati visibili, non la pagina.
const { data: detail, refresh } = await useAsyncData(
  () => `app-tournament-${tournamentId.value}`,
  () => fetchPublicTournamentView(tournamentId.value),
)

if (!detail.value) {
  throw createError({ statusCode: 404, statusMessage: 'Torneo non trovato' })
}

// Filtro esplicito sul proprio id: le RLS lasciano leggere agli admin anche le
// iscrizioni altrui.
const { data: myEntries, refresh: refreshMine } = await useAsyncData(
  () => `app-my-entry-${tournamentId.value}`,
  async () => {
    const userId = user.value?.sub
    if (!userId) return []
    const { data } = await client
      .from('tournament_entry_members')
      .select('entry_id, tournament_entries(tournament_id, status)')
      .eq('user_id', userId)
    return (data ?? [])
      .map((row) => {
        const entry = row.tournament_entries as {
          tournament_id?: string
          status?: string
        } | null
        return entry?.status === 'withdrawn' ? undefined : entry?.tournament_id
      })
      .filter((id): id is string => Boolean(id))
  },
)

const isRegistered = computed(() =>
  (myEntries.value ?? []).includes(tournamentId.value),
)

const { data: myBookings, refresh: refreshBookings } = await useMyBookings()
onMounted(() => {
  void refreshBookings()
  void refreshMine()
  void refreshTeam()
})
const eventBooking = computed(() =>
  (myBookings.value ?? []).find(
    (booking) =>
      booking.event_id === detail.value?.eventId &&
      ['confirmed', 'waitlisted'].includes(booking.status),
  ),
)
const needsEventBooking = computed(
  () =>
    Boolean(detail.value?.eventId) &&
    (detail.value?.status === 'registration_open' || isRegistered.value) &&
    !['completed', 'cancelled'].includes(detail.value?.status ?? '') &&
    eventBooking.value?.status !== 'confirmed',
)
const eventPage = computed(() => ({
  path: `/app/eventi/${detail.value?.eventId}`,
  query: { torneo: tournamentId.value },
}))

const isTeam = computed(() => (detail.value?.entrySize ?? 1) > 1)

// La mia squadra la leggo dalla tabella, non dalla view: il codice di invito
// e visibile solo a chi ne fa parte e la view pubblica non lo espone.
const { data: myTeam, refresh: refreshTeam } = await useAsyncData(
  () => `app-my-team-${tournamentId.value}`,
  async () => {
    const userId = user.value?.sub
    if (!userId || !isTeam.value) return null
    const { data } = await client
      .from('tournament_entries')
      .select(
        'id, display_name, status, visibility, join_code, tournament_entry_members(user_id, is_captain)',
      )
      .eq('tournament_id', tournamentId.value)
    return (
      (data ?? []).find(
        (entry) =>
          entry.status !== 'withdrawn' &&
          (entry.tournament_entry_members ?? []).some(
            (member) => member.user_id === userId,
          ),
      ) ?? null
    )
  },
  { watch: [isTeam] },
)

const iAmCaptain = computed(() =>
  (myTeam.value?.tournament_entry_members ?? []).some(
    (member) => member.user_id === user.value?.sub && member.is_captain,
  ),
)

const teams = computed(() =>
  (detail.value?.entries ?? []).filter((entry) => entry.status !== 'withdrawn'),
)

const isOpen = computed(() => detail.value?.status === 'registration_open')
const isCompleted = computed(() => detail.value?.status === 'completed')
const isFull = computed(() => {
  const max = detail.value?.maxEntries
  return Boolean(max && (detail.value?.entriesCount ?? 0) >= max)
})

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
  ...(isTeam.value
    ? [
        {
          value: 'squadre',
          label: 'Squadre',
          count: teams.value.length,
        },
      ]
    : []),
  { value: 'info', label: 'Info', count: null },
])

const pending = ref(false)
const message = ref('')

async function withdraw() {
  pending.value = true
  message.value = ''
  try {
    await withdrawTournamentEntry(tournamentId.value)
    message.value = 'Iscrizione annullata.'
    await Promise.all([refresh(), refreshMine(), refreshTeam()])
  } catch (error) {
    message.value = tournamentRegistrationError(error)
  } finally {
    pending.value = false
  }
}

async function leaveTeam() {
  const entryId = myTeam.value?.id
  if (!entryId) return
  pending.value = true
  message.value = ''
  try {
    await leaveTournamentTeam(entryId)
    message.value = 'Hai lasciato la squadra.'
    await Promise.all([refresh(), refreshMine(), refreshTeam()])
  } catch (error) {
    message.value = tournamentRegistrationError(error)
  } finally {
    pending.value = false
  }
}

usePageActions(
  computed(() => {
    if (needsEventBooking.value) {
      return [
        {
          label:
            eventBooking.value?.status === 'waitlisted'
              ? 'Vai all’evento'
              : 'Prenota prima l’evento',
          color: 'primary' as const,
          to: eventPage.value,
        },
      ]
    }
    if (isOpen.value && !isRegistered.value) {
      return [
        {
          label: isFull.value ? 'Posti esauriti' : 'Iscriviti al torneo',
          color: 'primary' as const,
          to: `/app/tornei/${tournamentId.value}/prenota`,
          disabled: isFull.value,
        },
      ]
    }
    if (isRegistered.value && !isCompleted.value) {
      if (isTeam.value && !isOpen.value) return []
      return [
        {
          label: isTeam.value ? 'Lascia la squadra' : 'Annulla iscrizione',
          color: 'neutral' as const,
          loading: pending.value,
          onClick: isTeam.value ? leaveTeam : withdraw,
        },
      ]
    }
    return []
  }),
)

useSeoMeta({
  title: () => `${detail.value?.name ?? 'Torneo'} — VRSUS`,
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div v-if="detail" class="space-y-6">
    <NuxtLink to="/app/tornei" class="text-sm text-white/45 hover:text-white">
      ← Tutti i tornei
    </NuxtLink>

    <TournamentSummary :tournament="detail" :highlight="isRegistered">
      <template #badges>
        <span
          v-if="isRegistered"
          class="rounded-full bg-green-500/15 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-green-300 uppercase"
          >Iscritto</span
        >
      </template>
      <template #actions>
        <UAlert
          v-if="needsEventBooking"
          class="mb-4"
          color="warning"
          variant="subtle"
          icon="i-lucide-ticket"
          :title="
            eventBooking?.status === 'waitlisted'
              ? 'Sei in lista d’attesa per l’evento'
              : 'Prima prenota l’evento'
          "
          :description="
            eventBooking?.status === 'waitlisted'
              ? `Potrai partecipare a ${detail.name} quando il tuo posto all’evento sarà confermato. Torna qui dopo la conferma.`
              : `Per partecipare a ${detail.name} serve prima un posto confermato a ${detail.eventTitle ?? 'questa giornata'}. Prenota l’evento, poi torna qui per iscriverti al torneo.`
          "
        />
        <UAlert
          v-if="message"
          class="mb-4"
          color="info"
          variant="subtle"
          :description="message"
        />
      </template>
    </TournamentSummary>

    <div class="sticky-tabs">
      <UiVrsusTabs v-model="activeTab" :items="tabs" />
    </div>

    <TournamentStandings
      v-if="activeTab === 'classifica'"
      :standings="detail.standings"
      :rules="detail"
    />

    <TournamentMatches
      v-else-if="activeTab === 'partite'"
      :matches="detail.matches"
      :entries="detail.entries"
      :rules="detail"
    />

    <!-- Squadre: solo dove si gioca in piu di uno. -->
    <section v-else-if="activeTab === 'squadre'" class="space-y-4">
      <div
        v-if="myTeam"
        class="rounded-2xl border border-green-500/40 bg-green-500/[0.06] p-5"
      >
        <p class="text-[11px] tracking-[0.18em] text-green-300 uppercase">
          La tua squadra
        </p>
        <p class="font-display mt-1 text-lg font-semibold text-white">
          {{ myTeam.display_name }}
        </p>
        <p class="mt-1 text-sm text-white/55">
          {{ (myTeam.tournament_entry_members ?? []).length }} /
          {{ detail.entrySize }} giocatori
        </p>

        <div
          v-if="iAmCaptain && myTeam.join_code"
          class="mt-4 rounded-xl border border-white/10 bg-black/25 px-4 py-3"
        >
          <p class="text-[11px] tracking-[0.16em] text-white/40 uppercase">
            Codice per entrare
          </p>
          <p
            class="font-display mt-1 text-2xl font-bold tracking-[0.3em] text-white"
          >
            {{ myTeam.join_code }}
          </p>
          <p class="mt-1 text-xs text-white/45">
            Passalo a chi vuoi in squadra: senza questo codice non puo entrare.
          </p>
        </div>
      </div>

      <ul class="space-y-2">
        <li
          v-for="team in teams"
          :key="team.id"
          class="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
        >
          <div class="flex items-center gap-3">
            <span class="min-w-0 flex-1 truncate font-medium text-white">{{
              team.displayName
            }}</span>
            <span
              class="shrink-0 rounded-full px-2 py-0.5 text-[11px]"
              :class="
                teamOpenSlots(team, detail.entrySize) > 0
                  ? 'bg-amber-500/15 text-amber-200'
                  : 'bg-white/10 text-white/50'
              "
            >
              {{ team.membersCount }}/{{ detail.entrySize }}
            </span>
          </div>
          <p
            v-if="team.members.length"
            class="mt-1 truncate text-xs text-white/45"
          >
            {{ team.members.map((member) => member.displayName).join(' · ') }}
          </p>
        </li>
      </ul>
    </section>

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
