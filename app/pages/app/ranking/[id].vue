<script setup lang="ts">
import type { Database } from '~~/app/types/database.types'
import { formatRankingScore, sortRankingScores } from '~~/shared/utils/ranking'

definePageMeta({
  layout: 'app',
  middleware: ['auth'],
})

type GameRanking = Database['public']['Views']['public_game_rankings']['Row']
type PointsRanking = Database['public']['Views']['public_ranking']['Row']
type Standing = Database['public']['Views']['public_ranking_standings']['Row']

const route = useRoute()
const client = useSupabaseClient<Database>()
const user = useSupabaseUser()
const rankingId = computed(() => String(route.params.id))
const isVrsusPoints = computed(() => rankingId.value === 'punti-vrsus')
const rulesOpen = ref(false)

const { data: ranking } = await useAsyncData<GameRanking | null>(
  () => `app-ranking-${rankingId.value}`,
  async () => {
    if (isVrsusPoints.value) return null

    const { data, error } = await client
      .from('public_game_rankings')
      .select('*')
      .eq('id', rankingId.value)
      .maybeSingle()

    if (error) throw error
    return data
  },
)

if (!isVrsusPoints.value && !ranking.value) {
  throw createError({ statusCode: 404, statusMessage: 'Ranking non trovato' })
}

const { data: leaderboard, pending } = await useAsyncData(
  () => `app-ranking-leaderboard-${rankingId.value}`,
  async () => {
    if (isVrsusPoints.value) {
      const { data, error } = await client
        .from('public_ranking')
        .select('*')
        .order('points', { ascending: false })

      if (error) throw error

      return (data ?? []).map((entry: PointsRanking) => ({
        id: entry.user_id ?? `points-${entry.nickname ?? 'player'}`,
        nickname: entry.nickname,
        score: entry.points,
        scoreLabel: `${entry.points} pt`,
        secondaryLabel: `${entry.tournaments_played} tornei giocati`,
      }))
    }

    const currentRanking = ranking.value!
    const { data, error } = await client
      .from('public_ranking_standings')
      .select('*')
      .eq('ranking_id', currentRanking.id ?? '')

    if (error) throw error

    return sortRankingScores(
      data ?? [],
      currentRanking.score_direction ?? 'desc',
      (entry) => entry.best_score ?? 0,
    ).map((entry: Standing) => ({
      id: entry.user_id ?? `standing-${entry.last_recorded_at}`,
      nickname: entry.nickname,
      score: entry.best_score,
      scoreLabel: formatRankingScore(
        entry.best_score,
        currentRanking.score_kind ?? 'points',
      ),
      secondaryLabel:
        entry.attempts === 1 ? '1 risultato' : `${entry.attempts} risultati`,
    }))
  },
)

const title = computed(() =>
  isVrsusPoints.value ? 'Punti VRSUS' : (ranking.value?.name ?? 'Ranking'),
)
const platform = computed(() =>
  isVrsusPoints.value
    ? 'VRSUS'
    : (ranking.value?.platform_name ?? 'Piattaforma'),
)
const game = computed(() =>
  isVrsusPoints.value
    ? 'Classifica generale'
    : (ranking.value?.game_name ?? 'Gioco'),
)
const description = computed(() => {
  if (isVrsusPoints.value) {
    return 'La classifica generale raccoglie i punti ottenuti partecipando ai tornei VRSUS.'
  }

  return ranking.value?.rules || 'Regolamento non ancora indicato.'
})

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'long' }).format(
    new Date(value),
  )
}

const currentUserRow = computed(() =>
  leaderboard.value?.find((entry) => entry.id === user.value?.id),
)

useSeoMeta({
  title: () => `${title.value} · VRSUS`,
})
</script>

<template>
  <div class="space-y-3 pb-6">
    <NuxtLink
      to="/app/ranking"
      class="text-primary inline-flex items-center gap-1 text-sm font-semibold"
    >
      <UIcon name="i-lucide-arrow-left" class="size-4" />
      Tutti i ranking
    </NuxtLink>

    <section class="bg-elevated rounded-2xl px-4 py-3">
      <div class="mb-2 flex items-center gap-2">
        <span
          class="bg-default text-highlighted rounded-full px-2.5 py-1 text-xs font-bold"
        >
          {{ platform }}
        </span>
        <span class="text-muted text-xs font-medium">{{ game }}</span>
      </div>

      <h1 class="text-highlighted text-xl font-black tracking-tight">
        {{ title }}
      </h1>

      <p
        v-if="!isVrsusPoints && ranking?.ends_at"
        class="text-muted mt-1 text-xs"
      >
        Termine {{ formatLongDate(ranking.ends_at) }}
      </p>

      <button
        type="button"
        class="text-muted mx-auto mt-2 flex min-h-8 items-center gap-1.5 px-3 text-xs font-bold tracking-wide uppercase hover:text-white"
        :aria-expanded="rulesOpen"
        @click="rulesOpen = !rulesOpen"
      >
        Regole
        <UIcon
          name="i-lucide-chevron-down"
          class="size-4 transition-transform"
          :class="{ 'rotate-180': rulesOpen }"
        />
      </button>
      <UiVrsusCollapse :open="rulesOpen">
        <div class="pt-1 pb-1">
          <p class="text-toned text-sm leading-5 whitespace-pre-line">
            {{ description }}
          </p>
        </div>
      </UiVrsusCollapse>
    </section>

    <section aria-labelledby="leaderboard-title">
      <div class="mb-2 flex items-center justify-between">
        <h2 id="leaderboard-title" class="text-highlighted text-lg font-black">
          Classifica
        </h2>
        <span v-if="leaderboard?.length" class="text-muted text-sm"
          >{{ leaderboard.length }} giocatori</span
        >
      </div>

      <div v-if="pending" class="space-y-2">
        <USkeleton v-for="index in 5" :key="index" class="h-16 rounded-xl" />
      </div>

      <div
        v-else-if="!leaderboard?.length"
        class="border-default text-muted rounded-2xl border border-dashed p-5 text-center text-sm"
      >
        Non ci sono ancora punteggi registrati per questo ranking.
      </div>

      <ol v-else v-vrsus-motion="'rows'" class="space-y-2">
        <li
          v-for="(entry, index) in leaderboard"
          :key="entry.id"
          class="border-default bg-elevated flex items-center gap-3 rounded-xl border p-3"
          :class="{ 'border-primary/40 bg-primary/5': entry.id === user?.id }"
        >
          <RankingPositionBadge :position="index + 1" />
          <div class="min-w-0 flex-1">
            <p class="text-highlighted truncate font-bold">
              {{ entry.nickname || 'Giocatore VRSUS' }}
            </p>
            <p class="text-muted text-xs">{{ entry.secondaryLabel }}</p>
          </div>
          <p class="text-primary shrink-0 text-right text-base font-black">
            {{ entry.scoreLabel }}
          </p>
        </li>
      </ol>
    </section>

    <div
      v-if="currentUserRow"
      class="border-primary/30 bg-primary text-primary-foreground sticky bottom-0 rounded-xl border p-3 shadow-lg"
    >
      <p class="text-xs font-semibold opacity-80">Il tuo punteggio</p>
      <p class="text-lg font-black">{{ currentUserRow.scoreLabel }}</p>
    </div>
  </div>
</template>
