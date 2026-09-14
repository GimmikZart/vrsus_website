<script setup lang="ts">
import type { Database } from '~/types/database.types'
import {
  formatRankingScore,
  isRankingOpen,
  sortRankingScores,
} from '~~/shared/utils/ranking'

definePageMeta({ layout: 'app', middleware: ['auth'] })

// Le classifiche del circolo, in due letture (DEC-023, DEC-043).
//
// I punti VRSUS sono la classifica generale: si accumulano partecipando. Le
// altre sono sfide vere, legate a un gioco e a una configurazione precisa: si
// sceglie la postazione, poi il gioco, poi quale sfida. Nelle tende compaiono
// solo postazioni e giochi che una sfida ce l'hanno davvero: "tutti" non
// vorrebbe dire niente, perche ogni sfida ha il suo metro.
const client = useSupabaseClient<Database>()
const user = useSupabaseUser()

const VRSUS_POINTS = 'vrsus-points'

const { data: rankings } = await useAsyncData('app-game-rankings', async () => {
  const { data } = await client
    .from('public_game_rankings')
    .select('*')
    .order('created_at', { ascending: false })
  return data ?? []
})

const selectedPlatform = ref<string>(VRSUS_POINTS)
const selectedGame = ref<string>('')
const selectedRanking = ref<string>('')

/** Solo le postazioni che hanno almeno una sfida. */
const platforms = computed(() => {
  const map = new Map<string, string>()
  for (const row of rankings.value ?? []) {
    if (row.platform_id) {
      map.set(String(row.platform_id), row.platform_name ?? 'Postazione')
    }
  }
  return [...map.entries()].map(([id, name]) => ({ id, name }))
})

const gamesForPlatform = computed(() => {
  const map = new Map<string, string>()
  for (const row of rankings.value ?? []) {
    if (String(row.platform_id) !== selectedPlatform.value) continue
    if (row.game_id) map.set(String(row.game_id), row.game_name ?? 'Gioco')
  }
  return [...map.entries()].map(([id, name]) => ({ id, name }))
})

/** Le sfide del gioco: prima le aperte, poi le piu recenti. */
const rankingsForGame = computed(() =>
  (rankings.value ?? [])
    .filter((row) => String(row.game_id) === selectedGame.value)
    .sort((first, second) => {
      const openFirst =
        Number(isRankingOpen(second)) - Number(isRankingOpen(first))
      if (openFirst !== 0) return openFirst
      return (
        new Date(second.created_at ?? 0).getTime() -
        new Date(first.created_at ?? 0).getTime()
      )
    }),
)

const currentRanking = computed(
  () =>
    (rankings.value ?? []).find(
      (row) => String(row.id) === selectedRanking.value,
    ) ?? null,
)

// Cambiando postazione si entra sempre su qualcosa di leggibile: primo gioco,
// ultima sfida aperta.
watch(selectedPlatform, () => {
  selectedGame.value = gamesForPlatform.value[0]?.id ?? ''
})

watch(selectedGame, () => {
  selectedRanking.value = rankingsForGame.value[0]?.id
    ? String(rankingsForGame.value[0]?.id)
    : ''
})

type Row = {
  userId: string
  nickname: string
  value: string
  detail: string
}

const {
  data: rows,
  status,
  refresh,
} = await useAsyncData<Row[]>(
  'app-ranking-rows',
  async () => {
    // Punti VRSUS: la classifica generale del circolo.
    if (selectedPlatform.value === VRSUS_POINTS) {
      const { data } = await client.from('public_ranking').select('*')
      return (data ?? [])
        .sort((first, second) => (second.points ?? 0) - (first.points ?? 0))
        .map((row) => ({
          userId: String(row.user_id),
          nickname: row.nickname ?? 'Giocatore',
          value: `${row.points ?? 0} pt`,
          detail: `${row.tournaments_played ?? 0} tornei`,
        }))
    }

    if (!selectedRanking.value) return []

    const { data } = await client
      .from('public_ranking_standings')
      .select('*')
      .eq('ranking_id', selectedRanking.value)

    const kind = String(currentRanking.value?.score_kind ?? 'points')

    return sortRankingScores(
      (data ?? []).filter((row) => row.best_score !== null),
      String(currentRanking.value?.score_direction ?? 'desc'),
      (row) => Number(row.best_score),
    ).map((row) => ({
      userId: String(row.user_id),
      nickname: row.nickname ?? 'Giocatore',
      value: formatRankingScore(Number(row.best_score), kind),
      detail: `${row.attempts ?? 0} ${row.attempts === 1 ? 'tentativo' : 'tentativi'}`,
    }))
  },
  { watch: [selectedPlatform, selectedRanking] },
)

const myRow = computed(() => {
  const uid = user.value?.sub
  if (!uid) return null
  const index = (rows.value ?? []).findIndex((row) => row.userId === uid)
  if (index < 0) return null
  return { position: index + 1, ...(rows.value ?? [])[index]! }
})

const deadlineLabel = computed(() => {
  const endsAt = currentRanking.value?.ends_at
  if (!endsAt) return 'Senza scadenza'
  const end = new Date(endsAt)
  if (Number.isNaN(end.getTime())) return 'Senza scadenza'
  const label = new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(end)
  return end.getTime() > Date.now()
    ? `Si chiude il ${label}`
    : `Chiusa il ${label}`
})

useSeoMeta({ title: 'Ranking — VRSUS', robots: 'noindex, nofollow' })
</script>

<template>
  <div class="space-y-6">
    <header>
      <p
        class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
      >
        Classifica
      </p>
      <h1
        class="font-display mt-2 text-2xl font-semibold text-white sm:text-3xl"
      >
        Ranking
      </h1>
    </header>

    <!--
      Postazione e gioco sulla stessa riga, la sfida sotto: e l'ordine in cui
      si restringe il campo.
    -->
    <div class="space-y-3">
      <div
        class="grid gap-3"
        :class="selectedPlatform === VRSUS_POINTS ? '' : 'grid-cols-2'"
      >
        <label class="block">
          <span
            class="mb-1.5 block text-xs tracking-wide text-white/45 uppercase"
          >
            Postazione
          </span>
          <select v-model="selectedPlatform" class="vrsus-select">
            <option :value="VRSUS_POINTS">Punti VRSUS</option>
            <option
              v-for="platform in platforms"
              :key="platform.id"
              :value="platform.id"
            >
              {{ platform.name }}
            </option>
          </select>
        </label>

        <label v-if="selectedPlatform !== VRSUS_POINTS" class="block">
          <span
            class="mb-1.5 block text-xs tracking-wide text-white/45 uppercase"
          >
            Gioco
          </span>
          <select v-model="selectedGame" class="vrsus-select">
            <option
              v-for="game in gamesForPlatform"
              :key="game.id"
              :value="game.id"
            >
              {{ game.name }}
            </option>
          </select>
        </label>
      </div>

      <label v-if="selectedPlatform !== VRSUS_POINTS" class="block">
        <span
          class="mb-1.5 block text-xs tracking-wide text-white/45 uppercase"
        >
          Sfida
        </span>
        <select v-model="selectedRanking" class="vrsus-select">
          <option
            v-for="ranking in rankingsForGame"
            :key="String(ranking.id)"
            :value="String(ranking.id)"
          >
            {{ ranking.name }}{{ isRankingOpen(ranking) ? '' : ' (chiusa)' }}
          </option>
        </select>
      </label>
    </div>

    <!-- Il regolamento della sfida: chi vuole provarci deve sapere come. -->
    <section
      v-if="selectedPlatform === VRSUS_POINTS"
      class="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
    >
      <p class="font-display text-base font-semibold text-white">Punti VRSUS</p>
      <p class="mt-1 text-sm text-white/55">
        La classifica generale del circolo: si accumulano punti partecipando
        agli eventi e ai tornei.
      </p>
    </section>

    <section
      v-else-if="currentRanking"
      class="rounded-2xl border p-4"
      :class="
        isRankingOpen(currentRanking)
          ? 'border-brand-red-500/30 bg-brand-red-500/[0.06]'
          : 'border-white/10 bg-white/[0.03]'
      "
    >
      <div class="flex flex-wrap items-center gap-2">
        <span
          class="rounded-full px-2 py-0.5 text-[11px] tracking-wide uppercase"
          :class="
            isRankingOpen(currentRanking)
              ? 'bg-emerald-500/15 text-emerald-300'
              : 'bg-white/10 text-white/50'
          "
          >{{
            isRankingOpen(currentRanking) ? 'Sfida aperta' : 'Sfida chiusa'
          }}</span
        >
        <span class="text-xs text-white/40">{{ deadlineLabel }}</span>
      </div>

      <p class="font-display mt-2 text-base font-semibold text-white">
        {{ currentRanking.name }}
      </p>
      <p
        v-if="currentRanking.rules"
        class="mt-1 text-sm leading-6 whitespace-pre-line text-white/55"
      >
        {{ currentRanking.rules }}
      </p>
      <p
        v-if="isRankingOpen(currentRanking)"
        class="mt-2 text-xs text-white/40"
      >
        Vuoi provarci? Durante l’evento chiedi a un operatore di registrare il
        tuo tentativo.
      </p>
    </section>

    <div v-if="status === 'pending'" class="space-y-2">
      <div
        v-for="index in 6"
        :key="index"
        class="h-14 animate-pulse rounded-xl border border-white/10 bg-white/[0.03]"
      />
    </div>

    <div
      v-else-if="!rows?.length"
      class="rounded-2xl border border-dashed border-white/15 p-10 text-center text-white/50"
    >
      {{
        selectedPlatform === VRSUS_POINTS
          ? 'Nessun punto assegnato finora.'
          : 'Nessun record registrato su questa sfida: il primo posto è libero.'
      }}
    </div>

    <ol v-else class="space-y-2">
      <li
        v-for="(row, index) in rows"
        :key="row.userId"
        class="flex items-center gap-4 rounded-xl border px-4 py-3"
        :class="
          row.userId === user?.sub
            ? 'border-brand-red-500/40 bg-brand-red-500/[0.08]'
            : 'border-white/10 bg-white/[0.03]'
        "
      >
        <span
          class="w-7 shrink-0 text-center font-semibold"
          :class="index < 3 ? 'text-brand-red-400' : 'text-white/40'"
          >{{ index + 1 }}</span
        >
        <div class="min-w-0 flex-1">
          <p class="truncate font-medium text-white">{{ row.nickname }}</p>
          <p class="text-xs text-white/40">{{ row.detail }}</p>
        </div>
        <span class="font-display shrink-0 font-semibold text-white">{{
          row.value
        }}</span>
      </li>
    </ol>

    <!-- La propria posizione resta raggiungibile anche se fuori schermo. -->
    <div
      v-if="myRow && myRow.position > 10"
      class="border-brand-red-500/40 bg-brand-red-500/[0.08] sticky bottom-20 rounded-xl border px-4 py-3 lg:bottom-4"
    >
      <div class="flex items-center gap-4">
        <span class="text-brand-red-400 w-7 shrink-0 text-center font-semibold">
          {{ myRow.position }}
        </span>
        <p class="min-w-0 flex-1 truncate font-medium text-white">
          {{ myRow.nickname }}
        </p>
        <span class="font-display shrink-0 font-semibold text-white">{{
          myRow.value
        }}</span>
      </div>
    </div>

    <UButton
      color="neutral"
      variant="ghost"
      size="sm"
      label="Aggiorna"
      @click="refresh()"
    />
  </div>
</template>
