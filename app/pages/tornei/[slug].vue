<script setup lang="ts">
const route = useRoute()
const client = useSupabaseClient()
const user = useSupabaseUser()
const pending = ref(false)
const message = ref('')
const errorMessage = ref('')

const { data: tournament, error } = await useAsyncData(
  `public-tournament-${route.params.slug}`,
  async () => {
    const { data, error } = await client
      .from('public_tournaments')
      .select('*')
      .eq('slug', String(route.params.slug))
      .maybeSingle()
    if (error) throw error
    return data
  },
)

if (error.value || !tournament.value) {
  throw createError({ statusCode: 404, statusMessage: 'Torneo non trovato' })
}

const [{ data: entries }, { data: matches }, { data: event }] =
  await Promise.all([
    useAsyncData(
      `tournament-entries-${String(tournament.value.id)}`,
      async () => {
        const { data, error } = await client
          .from('public_tournament_entries')
          .select('*')
          .eq('tournament_id', String(tournament.value!.id))
          .order('seed', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: true })
        if (error) throw error
        return data ?? []
      },
    ),
    useAsyncData(
      `tournament-matches-${String(tournament.value.id)}`,
      async () => {
        const { data, error } = await client
          .from('public_tournament_matches')
          .select('*')
          .eq('tournament_id', String(tournament.value!.id))
          .order('round_number', { ascending: true })
          .order('bracket_position', { ascending: true })
        if (error) throw error
        return data ?? []
      },
    ),
    useAsyncData(
      `tournament-event-${String(tournament.value.event_id)}`,
      async () => {
        const { data, error } = await client
          .from('public_events')
          .select('title,slug')
          .eq('id', String(tournament.value!.event_id))
          .maybeSingle()
        if (error) throw error
        return data
      },
    ),
  ])

const { data: myMembership } = await useAsyncData(
  `tournament-membership-${String(tournament.value.id)}-${user.value?.sub ?? 'anonymous'}`,
  async () => {
    if (!user.value || !entries.value?.length) return null

    const { data, error } = await client
      .from('tournament_entry_members')
      .select('entry_id')
      .eq('user_id', user.value.sub)
      .in(
        'entry_id',
        entries.value.map((entry) => String(entry.id)),
      )
      .maybeSingle()
    if (error) throw error
    return data
  },
)

const myEntry = computed(() => {
  if (!myMembership.value?.entry_id) return null
  return (
    entries.value?.find(
      (entry) =>
        String(entry.id) === String(myMembership.value?.entry_id) &&
        entry.status !== 'withdrawn',
    ) ?? null
  )
})

function entryName(entryId: string | null) {
  return (
    entries.value?.find((entry) => entry.id === entryId)?.display_name ??
    'In attesa'
  )
}

function matchesForRound(round: number) {
  return matches.value?.filter((match) => match.round_number === round) ?? []
}

const rounds = computed(() => [
  ...new Set((matches.value ?? []).map((match) => match.round_number)),
])

let realtimeChannel: ReturnType<typeof client.channel> | null = null

onMounted(() => {
  realtimeChannel = client
    .channel(`tournament-${String(tournament.value!.id)}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `tournament_id=eq.${String(tournament.value!.id)}`,
      },
      () =>
        refreshNuxtData(`tournament-matches-${String(tournament.value!.id)}`),
    )
    .subscribe()
})

onUnmounted(() => {
  if (realtimeChannel) client.removeChannel(realtimeChannel)
})

async function register() {
  if (!user.value) {
    await navigateTo({
      path: '/login',
      query: { redirect: `/tornei/${route.params.slug}` },
    })
    return
  }
  pending.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    await registerTournamentEntry(String(tournament.value!.id))
    message.value =
      'Iscrizione registrata. Presentati al check-in quando sarà disponibile.'
    await refreshNuxtData()
  } catch (caughtError) {
    const code = String((caughtError as { message?: string }).message ?? '')
    errorMessage.value = code.includes('ALREADY_REGISTERED')
      ? 'Sei già iscritto a questo torneo.'
      : code.includes('TOURNAMENT_FULL')
        ? 'Il torneo ha raggiunto il limite di partecipanti.'
        : 'Non è stato possibile completare l’iscrizione.'
  } finally {
    pending.value = false
  }
}

async function checkIn() {
  if (!myEntry.value) return
  pending.value = true
  try {
    await checkInTournamentEntry(String(myEntry.value.id))
    message.value = 'Check-in torneo registrato.'
    await refreshNuxtData()
  } catch {
    errorMessage.value = 'Non è stato possibile registrare il check-in.'
  } finally {
    pending.value = false
  }
}

async function withdraw() {
  if (!myEntry.value) return
  pending.value = true
  errorMessage.value = ''
  try {
    await withdrawTournamentEntry(String(tournament.value!.id))
    message.value = 'Iscrizione ritirata.'
    await refreshNuxtData()
  } catch {
    errorMessage.value =
      'Non è stato possibile ritirare l’iscrizione dopo l’avvio del bracket.'
  } finally {
    pending.value = false
  }
}

useSeoMeta({
  title: () => `${tournament.value?.name ?? 'Torneo'} — VRSUS`,
  description: () => tournament.value?.description ?? 'Torneo VRSUS.',
  robots: publicEventsRobots(),
})
</script>

<template>
  <div class="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
    <NuxtLink to="/tornei" class="text-sm text-white/50 hover:text-white"
      >← Tornei</NuxtLink
    >
    <header class="mt-8 max-w-3xl">
      <div class="flex flex-wrap items-center gap-3">
        <UBadge
          color="primary"
          variant="subtle"
          :label="tournamentStatusLabel(String(tournament!.status))"
        />
        <NuxtLink
          v-if="event"
          :to="`/eventi/${String(event.slug)}`"
          class="text-sm text-white/50 hover:text-white"
          >{{ event.title }}</NuxtLink
        >
      </div>
      <h1
        class="font-display mt-5 text-5xl font-semibold tracking-tight text-white sm:text-7xl"
      >
        {{ tournament!.name }}<span class="text-brand-red-500">.</span>
      </h1>
      <p
        v-if="tournament!.description"
        class="mt-6 max-w-2xl text-lg leading-8 text-white/60"
      >
        {{ tournament!.description }}
      </p>
      <p
        v-if="tournament!.rules"
        class="mt-5 text-sm leading-7 whitespace-pre-line text-white/50"
      >
        {{ tournament!.rules }}
      </p>
    </header>

    <div class="mt-10 flex flex-wrap items-center gap-3">
      <UButton
        v-if="!myEntry && tournament!.status === 'registration_open'"
        :loading="pending"
        label="Iscriviti al torneo"
        color="primary"
        @click="register"
      />
      <UButton
        v-else-if="
          myEntry &&
          tournament!.checkin_required &&
          myEntry.status === 'registered'
        "
        :loading="pending"
        label="Conferma check-in"
        color="secondary"
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
        variant="ghost"
        color="neutral"
        label="Ritira iscrizione"
        @click="withdraw"
      />
      <span v-if="tournament!.starts_at" class="text-sm text-white/50"
        >Inizio:
        {{ formatPublicEventDate(String(tournament!.starts_at)) }}</span
      >
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

    <section class="mt-16 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
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
              v-for="match in matchesForRound(round ?? 0)"
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
  </div>
</template>
