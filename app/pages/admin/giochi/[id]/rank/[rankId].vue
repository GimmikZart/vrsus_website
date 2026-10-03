<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { VrsusRole } from '~/composables/useVrsusAuth'
import {
  formatRankingScore,
  isRankingOpen,
  rankingScoreHint,
  sortRankingScores,
} from '~~/shared/utils/ranking'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
  requiredRoles: ['staff', 'admin'] satisfies VrsusRole[],
})

// Una sfida aperta: la classifica di adesso e il modulo per registrare il
// record che qualcuno ha appena fatto davanti a un operatore (DEC-043).
type RankingPayload = {
  ranking: Database['public']['Tables']['game_rankings']['Row']
  game: { id: string; name: string; platform_id: string } | null
  scores: {
    id: string
    userId: string
    nickname: string
    fullName: string | null
    score: number
    notes: string | null
    recordedAt: string
  }[]
}

const route = useRoute()
const client = useSupabaseClient<Database>()
const { isAdmin } = useVrsusAuth()
const gameId = computed(() => String(route.params.id))
const rankingId = computed(() => String(route.params.rankId))

const {
  data: payload,
  error,
  refresh,
} = await useFetch<RankingPayload>(
  () => `/api/admin/rankings/${rankingId.value}`,
)

if (error.value || !payload.value?.ranking) {
  throw createError({ statusCode: 404, statusMessage: 'Sfida non trovata' })
}

const ranking = computed(() => payload.value?.ranking ?? null)
const scoreKind = computed(() => String(ranking.value?.score_kind ?? 'points'))

// Classifica: il miglior risultato di ognuno, non tutti i tentativi.
const standings = computed(() => {
  const best = new Map<
    string,
    {
      userId: string
      nickname: string
      fullName: string | null
      score: number
      attempts: number
    }
  >()

  for (const row of payload.value?.scores ?? []) {
    const current = best.get(row.userId)
    const better =
      !current ||
      (ranking.value?.score_direction === 'asc'
        ? row.score < current.score
        : row.score > current.score)

    best.set(row.userId, {
      userId: row.userId,
      nickname: row.nickname,
      fullName: row.fullName,
      score: better ? row.score : (current?.score ?? row.score),
      attempts: (current?.attempts ?? 0) + 1,
    })
  }

  return sortRankingScores(
    [...best.values()],
    String(ranking.value?.score_direction ?? 'desc'),
    (row) => row.score,
  )
})

// --- Registrazione di un punteggio ----------------------------------------

const { data: people } = await useFetch<{ id: string; display_name: string }[]>(
  '/api/admin/ranking-users',
  { default: () => [] },
)

const scoreForm = reactive({ userId: '', value: '', notes: '' })
const scorePending = ref(false)
const scoreError = ref('')
const scoreMessage = ref('')

async function recordScore() {
  const value = Number(String(scoreForm.value).replace(',', '.'))

  if (!scoreForm.userId) {
    scoreError.value = 'Scegli il giocatore.'
    return
  }
  if (!Number.isFinite(value)) {
    scoreError.value = 'Il punteggio deve essere un numero.'
    return
  }

  scorePending.value = true
  scoreError.value = ''
  scoreMessage.value = ''

  // `game_scores` non ha grant per il browser: la scrittura passa
  // dall'endpoint service-role (DEC-005).
  try {
    await $fetch(`/api/admin/rankings/${rankingId.value}/scores`, {
      method: 'POST',
      body: {
        userId: scoreForm.userId,
        score: value,
        notes: scoreForm.notes.trim() || null,
      },
    })
  } catch (requestError) {
    const statusMessage =
      (requestError as { data?: { statusMessage?: string } })?.data
        ?.statusMessage ?? ''
    scoreError.value =
      statusMessage === 'RANKING_CLOSED'
        ? 'La sfida e chiusa: non accetta piu punteggi.'
        : 'Registrazione non riuscita.'
    return
  } finally {
    scorePending.value = false
  }

  scoreForm.value = ''
  scoreForm.notes = ''
  scoreMessage.value = 'Punteggio registrato.'
  await refresh()
}

const removingId = ref<string | null>(null)

async function removeScore(id: string) {
  removingId.value = id
  scoreError.value = ''

  try {
    await $fetch(`/api/admin/rankings/${rankingId.value}/scores/${id}`, {
      method: 'DELETE',
    })
  } catch {
    scoreError.value = 'Non e stato possibile eliminare il punteggio.'
    return
  } finally {
    removingId.value = null
  }

  await refresh()
}

// --- Configurazione della sfida -------------------------------------------

const settingsOpen = ref(false)
const settings = reactive({
  name: '',
  rules: '',
  scoreKind: 'points' as 'points' | 'time',
  scoreDirection: 'desc' as 'asc' | 'desc',
  endsAt: '',
  status: 'open' as 'open' | 'closed',
  isPublic: true,
})
const settingsPending = ref(false)
const settingsMessage = ref('')

function toDateTimeInput(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function syncSettings() {
  const row = ranking.value
  if (!row) return
  Object.assign(settings, {
    name: row.name,
    rules: row.rules ?? '',
    scoreKind: (row.score_kind as 'points' | 'time') ?? 'points',
    scoreDirection: (row.score_direction as 'asc' | 'desc') ?? 'desc',
    endsAt: toDateTimeInput(row.ends_at),
    status: (row.status as 'open' | 'closed') ?? 'open',
    isPublic: row.is_public,
  })
}
syncSettings()

async function saveSettings() {
  settingsPending.value = true
  settingsMessage.value = ''

  const { error: updateError } = await client
    .from('game_rankings')
    .update({
      name: settings.name.trim(),
      rules: settings.rules.trim() || null,
      score_kind: settings.scoreKind,
      score_direction: settings.scoreDirection,
      ends_at: settings.endsAt ? new Date(settings.endsAt).toISOString() : null,
      status: settings.status,
      is_public: settings.isPublic,
    })
    .eq('id', rankingId.value)

  settingsPending.value = false

  if (updateError) {
    settingsMessage.value = 'Salvataggio non riuscito.'
    return
  }

  settingsMessage.value = 'Sfida aggiornata.'
  await refresh()
  syncSettings()
}

const windowLabel = computed(() => {
  const row = ranking.value
  if (!row?.ends_at) return 'Senza scadenza'
  const end = new Date(row.ends_at)
  if (Number.isNaN(end.getTime())) return 'Senza scadenza'
  return `Fino al ${new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(end)}`
})

function formatMoment(value: string) {
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

usePageActions(
  computed(() => [
    {
      label: 'Registra',
      icon: 'i-lucide-plus',
      color: 'primary' as const,
      onClick: recordScore,
      loading: scorePending.value,
      disabled:
        !ranking.value ||
        !isRankingOpen(ranking.value) ||
        !scoreForm.userId ||
        !String(scoreForm.value).trim() ||
        !Number.isFinite(Number(String(scoreForm.value).replace(',', '.'))) ||
        scorePending.value,
    },
    ...(isAdmin.value && settingsOpen.value
      ? [
          {
            label: 'Salva sfida',
            icon: 'i-lucide-save',
            onClick: saveSettings,
            loading: settingsPending.value,
            disabled: !settings.name.trim() || settingsPending.value,
          },
        ]
      : []),
  ]),
)

useSeoMeta({
  title: () => `${ranking.value?.name ?? 'Sfida'} — Admin VRSUS`,
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div v-if="ranking" class="space-y-6">
    <NuxtLink
      :to="`/admin/giochi/${gameId}`"
      class="text-sm text-white/45 hover:text-white"
    >
      ← {{ payload?.game?.name ?? 'Gioco' }}
    </NuxtLink>

    <header>
      <div class="flex flex-wrap items-center gap-2">
        <span
          class="rounded-full px-2.5 py-0.5 text-[11px] tracking-wide uppercase"
          :class="
            isRankingOpen(ranking)
              ? 'bg-emerald-500/15 text-emerald-300'
              : 'bg-white/10 text-white/50'
          "
          >{{ isRankingOpen(ranking) ? 'Aperta' : 'Chiusa' }}</span
        >
        <span
          class="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] text-white/60"
        >
          {{ scoreKind === 'time' ? 'A tempo' : 'A punteggio' }}
        </span>
        <span class="text-xs text-white/35">{{ windowLabel }}</span>
      </div>

      <h1
        class="font-display mt-3 text-2xl font-semibold text-white sm:text-3xl"
      >
        {{ ranking.name }}
      </h1>
      <p
        v-if="ranking.rules"
        class="mt-2 max-w-2xl text-sm leading-6 whitespace-pre-line text-white/55"
      >
        {{ ranking.rules }}
      </p>
    </header>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section>
        <h2 class="font-display text-lg font-semibold text-white">
          Classifica
        </h2>

        <p v-if="!standings.length" class="mt-3 text-sm text-white/45">
          Nessun punteggio registrato su questa sfida.
        </p>

        <ol v-else class="mt-3 space-y-2">
          <li
            v-for="(row, index) in standings"
            :key="row.userId"
            class="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
          >
            <span
              class="w-7 shrink-0 text-center font-semibold"
              :class="index < 3 ? 'text-brand-red-400' : 'text-white/40'"
              >{{ index + 1 }}</span
            >
            <div class="min-w-0 flex-1">
              <NuxtLink
                :to="`/admin/utenti/${row.userId}`"
                class="truncate font-medium text-white hover:underline"
                >{{ row.fullName ?? row.nickname }}</NuxtLink
              >
              <p class="text-xs text-white/40">
                {{ row.nickname }} ·
                {{ row.attempts }}
                {{ row.attempts === 1 ? 'tentativo' : 'tentativi' }}
              </p>
            </div>
            <span class="font-display shrink-0 font-semibold text-white">{{
              formatRankingScore(row.score, scoreKind)
            }}</span>
          </li>
        </ol>

        <h3 class="font-display mt-8 text-base font-semibold text-white">
          Punteggi registrati
        </h3>
        <ul class="mt-3 space-y-2">
          <li
            v-for="score in payload?.scores ?? []"
            :key="score.id"
            class="flex items-center gap-3 rounded-xl border border-white/[0.07] px-4 py-2.5 text-sm"
          >
            <span class="min-w-0 flex-1 truncate text-white/80">{{
              score.fullName ?? score.nickname
            }}</span>
            <span class="shrink-0 font-medium text-white">{{
              formatRankingScore(score.score, scoreKind)
            }}</span>
            <span class="shrink-0 text-xs text-white/35">{{
              formatMoment(score.recordedAt)
            }}</span>
            <UButton
              color="error"
              variant="ghost"
              size="xs"
              icon="i-lucide-trash-2"
              :loading="removingId === score.id"
              aria-label="Elimina punteggio"
              @click="removeScore(score.id)"
            />
          </li>
          <li v-if="!payload?.scores.length" class="text-sm text-white/45">
            Ancora nessun tentativo.
          </li>
        </ul>
      </section>

      <aside class="space-y-5">
        <section class="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <h2 class="font-display text-base font-semibold text-white">
            Registra un punteggio
          </h2>
          <p class="mt-1 text-sm text-white/50">
            Si registra quando lo si vede: il record vale perche c era un
            operatore a guardarlo.
          </p>

          <div class="mt-4 space-y-4">
            <UFormField label="Giocatore">
              <select v-model="scoreForm.userId" class="vrsus-select w-full">
                <option value="">Scegli…</option>
                <option
                  v-for="person in people"
                  :key="person.id"
                  :value="person.id"
                >
                  {{ person.display_name }}
                </option>
              </select>
            </UFormField>

            <UFormField
              :label="scoreKind === 'time' ? 'Tempo' : 'Punteggio'"
              :help="rankingScoreHint(scoreKind)"
            >
              <UInput
                v-model="scoreForm.value"
                inputmode="decimal"
                class="w-full"
                placeholder="0"
              />
            </UFormField>

            <UFormField label="Nota" hint="Facoltativa.">
              <UInput v-model="scoreForm.notes" class="w-full" />
            </UFormField>

            <p v-if="scoreError" class="text-sm text-red-300">
              {{ scoreError }}
            </p>
            <p v-if="scoreMessage" class="text-sm text-green-400">
              {{ scoreMessage }}
            </p>

            <p v-if="!isRankingOpen(ranking)" class="text-xs text-white/40">
              La sfida e chiusa: riaprila dalle impostazioni per registrare
              ancora.
            </p>
          </div>
        </section>

        <section
          v-if="isAdmin"
          class="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
        >
          <button
            type="button"
            class="flex w-full items-center justify-between gap-2 text-left"
            :aria-expanded="settingsOpen"
            @click="settingsOpen = !settingsOpen"
          >
            <span class="font-display text-base font-semibold text-white"
              >Impostazioni della sfida</span
            >
            <UIcon
              name="i-lucide-chevron-down"
              class="size-4 text-white/40 transition-transform"
              :class="settingsOpen ? 'rotate-180' : ''"
            />
          </button>

          <div v-if="settingsOpen" class="mt-4 space-y-4">
            <UFormField label="Nome">
              <UInput v-model="settings.name" class="w-full" />
            </UFormField>
            <UFormField label="Regolamento">
              <textarea
                v-model="settings.rules"
                rows="3"
                class="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white"
              />
            </UFormField>
            <UFormField label="Cosa si registra">
              <select v-model="settings.scoreKind" class="vrsus-select w-full">
                <option value="points">Punteggio</option>
                <option value="time">Tempo</option>
              </select>
            </UFormField>
            <UFormField label="Vince">
              <select
                v-model="settings.scoreDirection"
                class="vrsus-select w-full"
              >
                <option value="desc">Il valore piu alto</option>
                <option value="asc">Il valore piu basso</option>
              </select>
            </UFormField>
            <UFormField label="Scadenza" hint="Vuoto: sfida senza fine.">
              <UInput
                v-model="settings.endsAt"
                type="datetime-local"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Stato">
              <select v-model="settings.status" class="vrsus-select w-full">
                <option value="open">Aperta</option>
                <option value="closed">Chiusa</option>
              </select>
            </UFormField>
            <UCheckbox v-model="settings.isPublic" label="Visibile in app" />

            <p v-if="settingsMessage" class="text-sm text-white/70">
              {{ settingsMessage }}
            </p>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>
