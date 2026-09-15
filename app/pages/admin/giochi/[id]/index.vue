<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { VrsusRole } from '~/composables/useVrsusAuth'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'super_admin'] satisfies VrsusRole[],
})

type PlatformPayload = {
  platforms: (Database['public']['Tables']['platforms']['Row'] & {
    games_count: number
  })[]
}

const route = useRoute()
const client = useSupabaseClient<Database>()
const { user } = useVrsusAuth()
const gameId = computed(() => String(route.params.id))

const { data: platformPayload } = await useFetch<PlatformPayload>(
  '/api/admin/platforms',
)

const { data: game, refresh } = await useAsyncData(
  () => `admin-game-${gameId.value}`,
  async () => {
    const { data } = await client
      .from('games')
      .select('*')
      .eq('id', gameId.value)
      .maybeSingle()
    return data
  },
)

if (!game.value) {
  throw createError({ statusCode: 404, statusMessage: 'Gioco non trovato' })
}

const form = reactive({
  platformId: '',
  name: '',
  slug: '',
  genre: '',
  minPlayers: undefined as number | undefined,
  maxPlayers: undefined as number | undefined,
  description: '',
  imagePath: '',
  scoreDirection: 'desc' as 'asc' | 'desc',
  active: true,
})

function syncForm() {
  if (!game.value) return
  Object.assign(form, {
    platformId: game.value.platform_id,
    name: game.value.name,
    slug: game.value.slug,
    genre: game.value.genre ?? '',
    minPlayers: game.value.min_players ?? undefined,
    maxPlayers: game.value.max_players ?? undefined,
    description: game.value.description ?? '',
    imagePath: game.value.image_path ?? '',
    scoreDirection: (game.value.score_direction as 'asc' | 'desc') ?? 'desc',
    active: game.value.active,
  })
}
syncForm()

const saving = ref(false)
const message = ref('')
const errorMessage = ref('')

// --- Ranking del gioco -----------------------------------------------------
// Un ranking e una sfida lunga: vive qui perche nasce dal gioco e dalla sua
// configurazione (mappa, pista, vettura), non dalla giornata (DEC-043).
const router = useRouter()

const { data: rankings } = await useAsyncData(
  () => `admin-game-rankings-${gameId.value}`,
  async () => {
    const { data } = await client
      .from('game_rankings')
      .select('*')
      .eq('game_id', gameId.value)
      .order('created_at', { ascending: false })
    return data ?? []
  },
)

const rankingFormOpen = ref(false)
const rankingPending = ref(false)
const rankingError = ref('')
const rankingForm = reactive({
  name: '',
  scoreKind: 'points' as 'points' | 'time',
  scoreDirection: 'desc' as 'asc' | 'desc',
  endsAt: '',
  rules: '',
})

// Su un tempo vince il piu basso, su un punteggio il piu alto: e il caso
// normale, e resta comunque modificabile.
watch(
  () => rankingForm.scoreKind,
  (kind) => {
    rankingForm.scoreDirection = kind === 'time' ? 'asc' : 'desc'
  },
)

async function createRanking() {
  const name = rankingForm.name.trim()
  if (!name) {
    rankingError.value = 'Dai un nome alla sfida.'
    return
  }

  rankingPending.value = true
  rankingError.value = ''

  const { data, error } = await client
    .from('game_rankings')
    .insert({
      game_id: gameId.value,
      name,
      rules: rankingForm.rules.trim() || null,
      score_kind: rankingForm.scoreKind,
      score_direction: rankingForm.scoreDirection,
      ends_at: rankingForm.endsAt
        ? new Date(rankingForm.endsAt).toISOString()
        : null,
      created_by: user.value?.sub ?? null,
    })
    .select('id')
    .single()

  rankingPending.value = false

  if (error || !data) {
    rankingError.value = 'Non e stato possibile creare la sfida.'
    return
  }

  await router.push(`/admin/giochi/${gameId.value}/rank/${data.id}`)
}

function rankingWindow(row: { ends_at: string | null }) {
  if (!row.ends_at) return 'Senza scadenza'
  const end = new Date(row.ends_at)
  if (Number.isNaN(end.getTime())) return 'Senza scadenza'
  const label = new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(end)
  return `Fino al ${label}`
}

async function save() {
  errorMessage.value = ''
  message.value = ''

  if (
    form.minPlayers !== undefined &&
    form.maxPlayers !== undefined &&
    form.maxPlayers < form.minPlayers
  ) {
    errorMessage.value =
      'Il numero massimo di giocatori non può essere inferiore al minimo.'
    return
  }

  saving.value = true
  const { error } = await client
    .from('games')
    .update({
      platform_id: form.platformId,
      name: form.name.trim(),
      slug: form.slug.trim(),
      genre: form.genre.trim() || null,
      min_players: form.minPlayers ?? null,
      max_players: form.maxPlayers ?? null,
      description: form.description.trim() || null,
      image_path: form.imagePath.trim() || null,
      score_direction: form.scoreDirection,
      active: form.active,
    })
    .eq('id', gameId.value)
  saving.value = false

  if (error) {
    errorMessage.value =
      error.code === '23505'
        ? 'Esiste già un gioco con questo slug su questa postazione.'
        : 'Salvataggio non riuscito.'
    return
  }

  message.value = 'Gioco aggiornato.'
  await refresh()
  syncForm()
}

useSeoMeta({
  title: () => `${game.value?.name ?? 'Gioco'} — Admin VRSUS`,
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div>
    <template v-if="game">
      <NuxtLink
        to="/admin/giochi"
        class="text-sm text-white/45 hover:text-white"
      >
        ← Tutti i giochi
      </NuxtLink>

      <h1 class="font-display mt-6 text-3xl font-semibold text-white">
        {{ game.name }}
      </h1>

      <div class="mt-8 grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div
          class="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
        >
          <div class="relative aspect-[3/4]">
            <NuxtImg
              v-if="form.imagePath"
              :src="form.imagePath"
              :alt="game.name"
              class="size-full object-cover"
            />
            <div
              v-else
              class="grid size-full place-items-center px-4 text-center"
            >
              <span class="font-display text-sm font-semibold text-white/40">{{
                game.name
              }}</span>
            </div>
          </div>
        </div>

        <section class="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Postazione">
              <select v-model="form.platformId" class="vrsus-select">
                <option
                  v-for="platform in platformPayload?.platforms ?? []"
                  :key="platform.id"
                  :value="platform.id"
                >
                  {{ platform.name }}
                </option>
              </select>
            </UFormField>
            <UFormField label="Nome"
              ><UInput v-model="form.name" class="w-full"
            /></UFormField>
            <UFormField label="Genere"
              ><UInput v-model="form.genre" class="w-full"
            /></UFormField>
            <UFormField label="Giocatori minimi">
              <UInput
                v-model.number="form.minPlayers"
                type="number"
                min="1"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Giocatori massimi">
              <UInput
                v-model.number="form.maxPlayers"
                type="number"
                min="1"
                class="w-full"
              />
            </UFormField>
            <UFormField
              label="Punteggio migliore"
              help="Su un time attack vince il tempo più basso."
            >
              <select v-model="form.scoreDirection" class="vrsus-select">
                <option value="desc">Il più alto</option>
                <option value="asc">Il più basso</option>
              </select>
            </UFormField>
            <UFormField label="Immagine">
              <AdminAssetUploader v-model="form.imagePath" />
            </UFormField>
          </div>

          <UFormField class="mt-4" label="Descrizione">
            <UInput v-model="form.description" class="w-full" />
          </UFormField>

          <label class="mt-4 flex items-center gap-2 text-sm text-white/70">
            <input v-model="form.active" type="checkbox" class="size-4" />
            Attivo
          </label>

          <UAlert
            v-if="message"
            class="mt-4"
            color="success"
            variant="subtle"
            :description="message"
          />
          <UAlert
            v-if="errorMessage"
            class="mt-4"
            color="error"
            variant="subtle"
            :description="errorMessage"
          />

          <UButton
            class="mt-5"
            color="primary"
            :loading="saving"
            label="Salva"
            @click="save"
          />
        </section>
      </div>

      <!--
        Le sfide del gioco. Stanno sotto la scheda perche si creano una volta e
        poi si vive dentro la singola sfida, dove si registrano i punteggi.
      -->
      <section
        class="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="font-display text-xl font-semibold text-white">
              Ranking
            </h2>
            <p class="mt-1 max-w-2xl text-sm text-white/50">
              Sfide lunghe su questo gioco: una mappa, una pista, una
              configurazione. Chi vuole prova a battere il record durante gli
              eventi, lo staff registra il punteggio.
            </p>
          </div>
          <UButton
            color="primary"
            icon="i-lucide-plus"
            :label="rankingFormOpen ? 'Chiudi' : 'Nuovo ranking'"
            @click="rankingFormOpen = !rankingFormOpen"
          />
        </div>

        <div
          v-if="rankingFormOpen"
          class="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
        >
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Nome della sfida">
              <UInput
                v-model="rankingForm.name"
                class="w-full"
                placeholder="Es. Nordschleife - giro secco"
              />
            </UFormField>
            <UFormField label="Scadenza" hint="Vuoto: sfida senza fine.">
              <UInput
                v-model="rankingForm.endsAt"
                type="datetime-local"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Cosa si registra">
              <select
                v-model="rankingForm.scoreKind"
                class="vrsus-select w-full"
              >
                <option value="points">Punteggio</option>
                <option value="time">Tempo</option>
              </select>
            </UFormField>
            <UFormField label="Vince">
              <select
                v-model="rankingForm.scoreDirection"
                class="vrsus-select w-full"
              >
                <option value="desc">Il valore piu alto</option>
                <option value="asc">Il valore piu basso</option>
              </select>
            </UFormField>
          </div>

          <UFormField
            class="mt-4"
            label="Regolamento"
            help="Mappa, pista, vettura, impostazioni: lo leggono anche i clienti."
          >
            <textarea
              v-model="rankingForm.rules"
              rows="3"
              class="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white"
            />
          </UFormField>

          <p v-if="rankingError" class="mt-3 text-sm text-red-300">
            {{ rankingError }}
          </p>

          <UButton
            class="mt-4"
            color="primary"
            :loading="rankingPending"
            label="Crea la sfida"
            @click="createRanking"
          />
        </div>

        <ul v-if="rankings?.length" class="mt-5 space-y-2">
          <li v-for="ranking in rankings" :key="ranking.id">
            <NuxtLink
              :to="`/admin/giochi/${gameId}/rank/${ranking.id}`"
              class="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/25"
            >
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="truncate font-medium text-white">
                    {{ ranking.name }}
                  </p>
                  <span
                    class="rounded-full px-2 py-0.5 text-[11px] tracking-wide uppercase"
                    :class="
                      ranking.status === 'open'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-white/10 text-white/50'
                    "
                    >{{ ranking.status === 'open' ? 'Aperta' : 'Chiusa' }}</span
                  >
                  <span
                    v-if="!ranking.is_public"
                    class="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/50"
                    >Nascosta</span
                  >
                </div>
                <p class="mt-0.5 text-xs text-white/45">
                  {{ ranking.score_kind === 'time' ? 'Tempo' : 'Punteggio' }} ·
                  {{ rankingWindow(ranking) }}
                </p>
              </div>
              <UIcon
                name="i-lucide-chevron-right"
                class="size-5 shrink-0 text-white/25"
              />
            </NuxtLink>
          </li>
        </ul>
        <p v-else class="mt-5 text-sm text-white/45">
          Nessuna sfida su questo gioco. Senza ranking il gioco non compare
          nella classifica dell app.
        </p>
      </section>
    </template>
  </div>
</template>
