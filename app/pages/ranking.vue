<script setup lang="ts">
const client = useSupabaseClient()
const {
  data: ranking,
  status,
  error,
} = await useAsyncData('public-ranking', async () => {
  const { data, error } = await client
    .from('public_ranking')
    .select('*')
    .order('points', { ascending: false })
    .order('display_name')
  if (error) throw error
  return data ?? []
})
const { data: activityRanking } = await useAsyncData(
  'public-ranking-by-activity',
  async () => {
    const { data, error } = await client
      .from('public_ranking_by_activity')
      .select('*')
      .order('points', { ascending: false })
      .order('display_name')
    if (error) throw error
    return data ?? []
  },
)
const selectedActivity = ref('all')
const activityOptions = computed(() => [
  { label: 'Tutte le attività', value: 'all' },
  ...[
    ...new Set(
      (activityRanking.value ?? [])
        .map((row) => row.activity_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ].map((id) => ({
    label:
      activityRanking.value?.find((row) => row.activity_id === id)
        ?.activity_name ?? 'Attività',
    value: String(id),
  })),
])
const visibleActivityRanking = computed(() =>
  (activityRanking.value ?? []).filter(
    (row) =>
      selectedActivity.value === 'all' ||
      String(row.activity_id) === selectedActivity.value,
  ),
)

useSeoMeta({
  title: 'Ranking — VRSUS',
  description: 'La classifica pubblica VRSUS.',
  robots: publicEventsRobots(),
})
</script>

<template>
  <div class="mx-auto max-w-4xl px-5 py-16 sm:px-8 lg:py-24">
    <header>
      <p
        class="text-brand-blue-400 text-xs font-semibold tracking-[0.24em] uppercase"
      >
        Leaderboard
      </p>
      <h1
        class="font-display mt-5 text-5xl font-semibold tracking-tight text-white sm:text-7xl"
      >
        Chi sale in classifica<span class="text-brand-red-500">.</span>
      </h1>
      <p class="mt-6 text-lg leading-8 text-white/60">
        Punti assegnati dai tornei pubblici completati.
      </p>
    </header>
    <div
      class="mt-12 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]"
    >
      <div v-if="status === 'pending'" class="p-8 text-white/50">
        Caricamento ranking…
      </div>
      <div v-else-if="error" class="p-8 text-white/60" role="alert">
        Non è stato possibile caricare il ranking.
      </div>
      <div v-else-if="!ranking?.length" class="p-8 text-white/60">
        La classifica sarà disponibile dopo i primi tornei completati.
      </div>
      <ol v-else class="divide-y divide-white/10">
        <li
          v-for="(row, index) in ranking"
          :key="String(row.user_id)"
          class="flex items-center justify-between gap-4 px-5 py-5 sm:px-8"
        >
          <div class="flex items-center gap-4">
            <span class="font-display w-8 text-xl text-white/35">{{
              index + 1
            }}</span>
            <div>
              <p class="font-medium text-white">{{ row.display_name }}</p>
              <p class="text-xs text-white/40">
                {{ row.tournaments_played }} tornei
              </p>
            </div>
          </div>
          <p
            class="font-display text-brand-blue-300 text-xl font-semibold tabular-nums"
          >
            {{ row.points }} pt
          </p>
        </li>
      </ol>
    </div>
    <section class="mt-10">
      <div
        class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p class="text-sm text-white/45">Per attività</p>
          <h2 class="font-display mt-2 text-2xl font-semibold text-white">
            Le classifiche dei giochi
          </h2>
        </div>
        <USelect
          v-model="selectedActivity"
          :items="activityOptions"
          aria-label="Filtra ranking per attività"
        />
      </div>
      <div
        v-if="!visibleActivityRanking.length"
        class="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-sm text-white/50"
      >
        Nessun ranking per attività disponibile.
      </div>
      <div v-else class="mt-5 grid gap-3 md:grid-cols-2">
        <div
          v-for="row in visibleActivityRanking"
          :key="`${row.activity_id}-${row.user_id}`"
          class="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-5"
        >
          <div>
            <p class="font-medium text-white">{{ row.display_name }}</p>
            <p class="mt-1 text-xs text-white/40">
              {{ row.activity_name ?? 'Attività' }} ·
              {{ row.tournaments_played }} tornei
            </p>
          </div>
          <p
            class="font-display text-brand-blue-300 text-xl font-semibold tabular-nums"
          >
            {{ row.points }} pt
          </p>
        </div>
      </div>
    </section>
  </div>
</template>
