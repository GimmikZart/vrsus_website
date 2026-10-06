<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { VrsusRole } from '~/composables/useVrsusAuth'
import {
  formatRankingScore,
  isRankingOpen,
  parseRankingScoreInput,
  rankingScoreHint,
  sortRankingScores,
} from '~~/shared/utils/ranking'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
  requiredRoles: ['staff', 'admin'] satisfies VrsusRole[],
})

type GameRanking = Database['public']['Views']['public_game_rankings']['Row']
type PointsRanking = Database['public']['Views']['public_ranking']['Row']
type Standing = Database['public']['Views']['public_ranking_standings']['Row']
type RankingUser = {
  id: string
  display_name: string
  nickname: string | null
}

const route = useRoute()
const client = useSupabaseClient<Database>()
const rankingId = computed(() => String(route.params.id))
const isVrsusPoints = computed(() => rankingId.value === 'punti-vrsus')
const rulesOpen = ref(false)
const selectedUserId = computed(() => String(route.query.userId ?? ''))
const selectedUserName = computed(() => String(route.query.userName ?? ''))

const { data: ranking } = await useAsyncData<GameRanking | null>(
  () => `admin-ranking-${rankingId.value}`,
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

const {
  data: leaderboard,
  pending,
  refresh: refreshLeaderboard,
} = await useAsyncData(
  () => `admin-ranking-leaderboard-${rankingId.value}`,
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
      scoreLabel: formatRankingScore(
        entry.best_score,
        currentRanking.score_kind ?? 'points',
      ),
      secondaryLabel:
        entry.attempts === 1 ? '1 risultato' : `${entry.attempts} risultati`,
    }))
  },
)

const { data: people } = await useFetch<RankingUser[]>(
  '/api/admin/ranking-users',
  { default: () => [] },
)

const title = computed(() =>
  isVrsusPoints.value ? 'Punti VRSUS' : (ranking.value?.name ?? 'Ranking'),
)
const platform = computed(() =>
  isVrsusPoints.value
    ? 'VRSUS'
    : (ranking.value?.platform_name ?? 'Postazione'),
)
const game = computed(() =>
  isVrsusPoints.value
    ? 'Classifica generale'
    : (ranking.value?.game_name ?? 'Gioco'),
)
const description = computed(() =>
  isVrsusPoints.value
    ? 'La classifica generale raccoglie i punti ottenuti partecipando ai tornei VRSUS.'
    : ranking.value?.rules || 'Regolamento non ancora indicato.',
)
const scoreKind = computed(() => ranking.value?.score_kind ?? 'points')

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'long' }).format(
    new Date(value),
  )
}

const scoreSheetOpen = ref(false)
const playerSearch = ref('')
const scoreForm = reactive({ userId: selectedUserId.value, value: '' })
const scorePending = ref(false)
const scoreError = ref('')
const scoreMessage = ref('')

watch(selectedUserId, (value) => {
  if (value) scoreForm.userId = value
})

const selectedPerson = computed(() =>
  (people.value ?? []).find((person) => person.id === scoreForm.userId),
)
const selectedPersonLabel = computed(
  () =>
    selectedPerson.value?.nickname ??
    selectedPerson.value?.display_name ??
    selectedUserName.value,
)
const filteredPeople = computed(() => {
  const query = playerSearch.value.trim().toLocaleLowerCase('it-IT')
  if (!query) return (people.value ?? []).slice(0, 12)
  return (people.value ?? [])
    .filter((person) =>
      `${person.nickname ?? ''} ${person.display_name}`
        .toLocaleLowerCase('it-IT')
        .includes(query),
    )
    .slice(0, 12)
})
const parsedScore = computed(() =>
  parseRankingScoreInput(scoreForm.value, scoreKind.value),
)

function openScoreSheet() {
  scoreError.value = ''
  scoreSheetOpen.value = true
}

async function recordScore() {
  if (!scoreForm.userId) {
    scoreError.value = 'Scegli un utente.'
    return
  }
  if (parsedScore.value === null) {
    scoreError.value =
      scoreKind.value === 'time'
        ? 'Inserisci un tempo valido, per esempio 1:42.380.'
        : 'Inserisci un punteggio valido.'
    return
  }

  scorePending.value = true
  scoreError.value = ''
  scoreMessage.value = ''
  try {
    await $fetch(`/api/admin/rankings/${rankingId.value}/scores`, {
      method: 'POST',
      body: {
        userId: scoreForm.userId,
        score: parsedScore.value,
      },
    })
    scoreMessage.value = `Risultato assegnato a ${selectedPersonLabel.value}.`
    scoreForm.value = ''
    scoreSheetOpen.value = false
    await refreshLeaderboard()
  } catch (requestError) {
    const statusMessage = (
      requestError as { data?: { statusMessage?: string } }
    ).data?.statusMessage
    scoreError.value =
      statusMessage === 'RANKING_CLOSED'
        ? 'Questo ranking è chiuso e non accetta nuovi risultati.'
        : 'Non è stato possibile assegnare il risultato.'
  } finally {
    scorePending.value = false
  }
}

usePageActions(
  computed(() => {
    if (
      isVrsusPoints.value ||
      !ranking.value ||
      !isRankingOpen(ranking.value)
    ) {
      return []
    }
    return [
      {
        label: selectedUserId.value
          ? `Assegna punti a ${selectedUserName.value}`
          : 'Assegna punti',
        icon: 'i-lucide-plus',
        onClick: openScoreSheet,
      },
    ]
  }),
)

useSeoMeta({
  title: () => `${title.value} · VRSUS`,
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div class="space-y-3 pb-6">
    <NuxtLink
      :to="{
        path: '/admin/ranking',
        query: selectedUserId
          ? { userId: selectedUserId, userName: selectedUserName }
          : undefined,
      }"
      class="text-primary inline-flex items-center gap-1 text-sm font-semibold"
    >
      <UIcon name="i-lucide-arrow-left" class="size-4" />
      Tutti i ranking
    </NuxtLink>

    <UAlert
      v-if="scoreMessage"
      color="success"
      variant="subtle"
      :description="scoreMessage"
    />

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
      <div v-show="rulesOpen" class="pt-1 pb-1">
        <p class="text-toned text-sm leading-5 whitespace-pre-line">
          {{ description }}
        </p>
      </div>
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
      <ol v-else class="space-y-2">
        <li
          v-for="(entry, index) in leaderboard"
          :key="entry.id"
          class="border-default bg-elevated flex items-center gap-3 rounded-xl border p-3"
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

    <p
      v-if="isVrsusPoints && selectedUserId"
      class="border-default text-muted rounded-2xl border border-dashed p-4 text-sm"
    >
      I Punti VRSUS derivano da tornei e rettifiche auditabili. Scegli una sfida
      dalla griglia per registrare un risultato per
      {{ selectedUserName }}.
    </p>

    <UiVrsusBottomSheet
      v-model="scoreSheetOpen"
      :title="
        selectedUserId ? `Assegna punti a ${selectedUserName}` : 'Assegna punti'
      "
      :description="`${title} · ${game}`"
      :pending="scorePending"
    >
      <form class="space-y-4" @submit.prevent="recordScore">
        <div v-if="selectedUserId" class="rounded-2xl bg-white/[0.05] p-4">
          <p class="text-xs tracking-wide text-white/40 uppercase">Utente</p>
          <p class="mt-1 font-semibold text-white">{{ selectedUserName }}</p>
        </div>

        <template v-else>
          <UFormField label="Cerca utente" name="player-search">
            <UInput
              v-model="playerSearch"
              icon="i-lucide-search"
              placeholder="Cerca per nickname"
              class="w-full"
            />
          </UFormField>
          <div class="max-h-48 space-y-1 overflow-y-auto">
            <button
              v-for="person in filteredPeople"
              :key="person.id"
              type="button"
              class="flex min-h-11 w-full items-center justify-between rounded-xl px-3 py-2 text-left"
              :class="
                scoreForm.userId === person.id
                  ? 'bg-brand-red-500/15 text-white'
                  : 'bg-white/[0.04] text-white/70 hover:bg-white/[0.08]'
              "
              @click="scoreForm.userId = person.id"
            >
              <span class="font-medium">{{
                person.nickname ?? person.display_name
              }}</span>
              <UIcon
                v-if="scoreForm.userId === person.id"
                name="i-lucide-check"
                class="size-4"
              />
            </button>
            <p v-if="!filteredPeople.length" class="py-3 text-sm text-white/45">
              Nessun utente trovato.
            </p>
          </div>
        </template>

        <UFormField
          :label="scoreKind === 'time' ? 'Tempo' : 'Punteggio'"
          :help="rankingScoreHint(scoreKind)"
        >
          <UInput
            v-model="scoreForm.value"
            inputmode="decimal"
            class="w-full"
            :placeholder="scoreKind === 'time' ? '1:42.380' : '0'"
          />
        </UFormField>

        <p v-if="parsedScore !== null" class="text-sm text-white/50">
          Valore registrato:
          <strong class="text-white">{{
            formatRankingScore(parsedScore, scoreKind)
          }}</strong>
        </p>
        <p v-if="scoreError" class="text-sm text-red-300">{{ scoreError }}</p>

        <UButton
          type="submit"
          color="primary"
          class="w-full justify-center"
          label="Registra risultato"
          :loading="scorePending"
          :disabled="!scoreForm.userId || parsedScore === null || scorePending"
        />
      </form>
    </UiVrsusBottomSheet>
  </div>
</template>
