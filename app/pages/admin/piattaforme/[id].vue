<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { VrsusRole } from '~/composables/useVrsusAuth'
import { slugify } from '~/utils/slugify'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'super_admin'] satisfies VrsusRole[],
})

type Payload = {
  platform: Database['public']['Tables']['platforms']['Row']
  games: Database['public']['Tables']['games']['Row'][]
  categories: Database['public']['Tables']['platform_categories']['Row'][]
}

const route = useRoute()
const client = useSupabaseClient<Database>()
const platformId = computed(() => String(route.params.id))

const { data, refresh, error } = await useFetch<Payload>(
  () => `/api/admin/platforms/${platformId.value}`,
)

const saving = ref(false)
const message = ref('')
const errorMessage = ref('')

const form = reactive({
  name: '',
  code: '',
  slug: '',
  description: '',
  imagePath: '',
  categoryId: '',
  defaultCapacity: undefined as number | undefined,
  internal: false,
  active: true,
})

function syncForm() {
  const platform = data.value?.platform
  if (!platform) return
  Object.assign(form, {
    name: platform.name,
    code: platform.code,
    slug: platform.slug,
    description: platform.description ?? '',
    imagePath: platform.image_path ?? '',
    categoryId: platform.category_id ?? '',
    defaultCapacity: platform.default_capacity ?? undefined,
    internal: platform.internal,
    active: platform.active,
  })
}
syncForm()

async function save() {
  saving.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    await $fetch(`/api/admin/platforms/${platformId.value}`, {
      method: 'PATCH',
      body: {
        name: form.name,
        code: form.code,
        slug: form.slug,
        description: form.description,
        imagePath: form.imagePath,
        categoryId: form.categoryId || null,
        defaultCapacity: form.defaultCapacity ?? null,
        internal: form.internal,
        active: form.active,
      },
    })
    message.value = 'Postazione aggiornata.'
    await refresh()
    syncForm()
  } catch (err) {
    errorMessage.value =
      (err as { statusCode?: number })?.statusCode === 409
        ? 'Slug o codice già in uso.'
        : 'Salvataggio non riuscito.'
  } finally {
    saving.value = false
  }
}

// I giochi hanno grant e RLS: si scrivono direttamente col client Supabase.
const gameForm = reactive({
  name: '',
  genre: '',
  minPlayers: undefined as number | undefined,
  maxPlayers: undefined as number | undefined,
  description: '',
  imagePath: '',
  scoreDirection: 'desc' as 'asc' | 'desc',
})
const gameSaving = ref(false)
const gameError = ref('')
const showGameForm = ref(false)

async function createGame() {
  gameError.value = ''
  const name = gameForm.name.trim()
  const slug = slugify(name)
  if (!name || !slug) {
    gameError.value = 'Il nome del gioco è obbligatorio.'
    return
  }

  gameSaving.value = true

  const { data: siblings } = await client
    .from('games')
    .select('slug')
    .eq('platform_id', platformId.value)
    .like('slug', `${slug}%`)

  const { error: insertError } = await client.from('games').insert({
    platform_id: platformId.value,
    name,
    slug: uniqueSlug(
      slug,
      (siblings ?? []).map((row) => row.slug),
    ),
    genre: gameForm.genre.trim() || null,
    min_players: gameForm.minPlayers ?? null,
    max_players: gameForm.maxPlayers ?? null,
    description: gameForm.description.trim() || null,
    image_path: gameForm.imagePath.trim() || null,
    score_direction: gameForm.scoreDirection,
  })
  gameSaving.value = false

  if (insertError) {
    gameError.value =
      insertError.code === '23505'
        ? 'Esiste già un gioco con questo nome su questa postazione.'
        : 'Creazione non riuscita. Controlla i dati.'
    return
  }

  Object.assign(gameForm, {
    name: '',
    genre: '',
    minPlayers: undefined,
    maxPlayers: undefined,
    description: '',
    imagePath: '',
    scoreDirection: 'desc',
  })
  showGameForm.value = false
  await refresh()
}

useSeoMeta({
  title: () => `${data.value?.platform.name ?? 'Postazione'} — Admin VRSUS`,
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div>
    <NuxtLink
      to="/admin/piattaforme"
      class="text-sm text-white/45 hover:text-white"
    >
      ← Tutte le postazioni
    </NuxtLink>

    <UAlert
      v-if="error"
      class="mt-8"
      color="error"
      variant="subtle"
      title="Postazione non trovata"
      description="Il collegamento potrebbe non essere più valido."
    />

    <template v-else-if="data">
      <h1 class="font-display mt-6 text-3xl font-semibold text-white">
        {{ data.platform.name }}
      </h1>

      <section
        class="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
      >
        <h2 class="font-display text-lg font-semibold text-white">
          Dati postazione
        </h2>

        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <UFormField label="Nome"
            ><UInput v-model="form.name" class="w-full"
          /></UFormField>
          <UFormField label="Codice"
            ><UInput v-model="form.code" class="w-full"
          /></UFormField>
          <UFormField label="Categoria">
            <select v-model="form.categoryId" class="vrsus-select">
              <option value="">Nessuna</option>
              <option
                v-for="category in data.categories"
                :key="category.id"
                :value="category.id"
              >
                {{ category.name }}
              </option>
            </select>
          </UFormField>
          <UFormField label="Capienza standard">
            <UInput
              v-model.number="form.defaultCapacity"
              type="number"
              min="1"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Immagine">
            <AdminAssetUploader v-model="form.imagePath" />
          </UFormField>
        </div>

        <UFormField class="mt-4" label="Descrizione">
          <UInput v-model="form.description" class="w-full" />
        </UFormField>

        <div class="mt-4 flex flex-wrap gap-5 text-sm text-white/70">
          <label class="flex items-center gap-2">
            <input v-model="form.internal" type="checkbox" class="size-4" />
            Solo uso interno
          </label>
          <label class="flex items-center gap-2">
            <input v-model="form.active" type="checkbox" class="size-4" />
            Attiva
          </label>
        </div>

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

      <section class="mt-8">
        <div class="flex items-center justify-between">
          <h2 class="font-display text-lg font-semibold text-white">
            Giochi ({{ data.games.length }})
          </h2>
          <UButton
            :color="showGameForm ? 'neutral' : 'primary'"
            :variant="showGameForm ? 'outline' : 'solid'"
            size="sm"
            :label="showGameForm ? 'Chiudi' : 'Nuovo gioco'"
            @click="showGameForm = !showGameForm"
          />
        </div>

        <div
          v-if="showGameForm"
          class="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
        >
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Nome"
              ><UInput v-model="gameForm.name" class="w-full"
            /></UFormField>
            <UFormField label="Genere"
              ><UInput v-model="gameForm.genre" class="w-full"
            /></UFormField>
            <UFormField label="Giocatori minimi">
              <UInput
                v-model.number="gameForm.minPlayers"
                type="number"
                min="1"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Giocatori massimi">
              <UInput
                v-model.number="gameForm.maxPlayers"
                type="number"
                min="1"
                class="w-full"
              />
            </UFormField>
            <UFormField
              label="Punteggio migliore"
              help="Su un time attack vince il tempo più basso."
            >
              <select v-model="gameForm.scoreDirection" class="vrsus-select">
                <option value="desc">Il più alto</option>
                <option value="asc">Il più basso</option>
              </select>
            </UFormField>
            <UFormField label="Immagine">
              <AdminAssetUploader v-model="gameForm.imagePath" />
            </UFormField>
          </div>

          <UFormField class="mt-4" label="Descrizione">
            <UInput v-model="gameForm.description" class="w-full" />
          </UFormField>

          <UAlert
            v-if="gameError"
            class="mt-4"
            color="error"
            variant="subtle"
            :description="gameError"
          />

          <UButton
            class="mt-5"
            color="primary"
            :loading="gameSaving"
            label="Crea gioco"
            @click="createGame"
          />
        </div>

        <p v-if="!data.games.length" class="mt-4 text-sm text-white/45">
          Nessun gioco associato a questa postazione.
        </p>

        <div v-else class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <NuxtLink
            v-for="game in data.games"
            :key="game.id"
            :to="`/admin/giochi/${game.id}`"
            class="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/25"
          >
            <p class="font-medium text-white">{{ game.name }}</p>
            <p class="mt-1 text-xs text-white/40">
              {{ game.genre ?? 'Genere non indicato' }}
            </p>
            <p v-if="!game.active" class="mt-2 text-xs text-white/40">
              Disattivato
            </p>
          </NuxtLink>
        </div>
      </section>
    </template>
  </div>
</template>
