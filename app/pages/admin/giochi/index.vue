<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { VrsusRole } from '~/composables/useVrsusAuth'
import { slugify } from '~/utils/slugify'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
  requiredRoles: ['admin'] satisfies VrsusRole[],
})

type PlatformPayload = {
  platforms: (Database['public']['Tables']['platforms']['Row'] & {
    games_count: number
  })[]
}

const client = useSupabaseClient<Database>()

// I giochi sono leggibili col client (grant + RLS); le postazioni no, quindi il
// selettore arriva dall'endpoint.
const { data: platformPayload } = await useFetch<PlatformPayload>(
  '/api/admin/platforms',
)

const {
  data: games,
  refresh,
  status,
} = await useAsyncData('admin-games', async () => {
  const { data, error } = await client.from('games').select('*').order('name')
  if (error) throw new Error('Impossibile caricare i giochi.')
  return data ?? []
})

const filterPlatform = ref('')

const filteredGames = computed(() => {
  const list = games.value ?? []
  if (!filterPlatform.value) return list
  return list.filter((game) => game.platform_id === filterPlatform.value)
})

function platformCode(platformId: string) {
  return (
    (platformPayload.value?.platforms ?? []).find(
      (platform) => platform.id === platformId,
    )?.code ?? '—'
  )
}

const creating = ref(false)
const saving = ref(false)
const errorMessage = ref('')

const form = reactive({
  platformId: '',
  name: '',
  genre: '',
  minPlayers: undefined as number | undefined,
  maxPlayers: undefined as number | undefined,
  description: '',
  imagePath: '',
  scoreDirection: 'desc' as 'asc' | 'desc',
})

async function create() {
  errorMessage.value = ''
  const name = form.name.trim()
  const slug = slugify(name)

  if (!form.platformId) {
    errorMessage.value = 'Scegli la postazione a cui appartiene il gioco.'
    return
  }
  if (!name || !slug) {
    errorMessage.value = 'Il nome del gioco è obbligatorio.'
    return
  }
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

  const { data: siblings } = await client
    .from('games')
    .select('slug')
    .eq('platform_id', form.platformId)
    .like('slug', `${slug}%`)

  const { error } = await client.from('games').insert({
    platform_id: form.platformId,
    name,
    slug: uniqueSlug(
      slug,
      (siblings ?? []).map((row) => row.slug),
    ),
    genre: form.genre.trim() || null,
    min_players: form.minPlayers ?? null,
    max_players: form.maxPlayers ?? null,
    description: form.description.trim() || null,
    image_path: form.imagePath.trim() || null,
    score_direction: form.scoreDirection,
  })
  saving.value = false

  if (error) {
    errorMessage.value =
      error.code === '23505'
        ? 'Esiste già un gioco con questo nome su questa postazione.'
        : 'Creazione non riuscita. Controlla i dati.'
    return
  }

  Object.assign(form, {
    platformId: '',
    name: '',
    genre: '',
    minPlayers: undefined,
    maxPlayers: undefined,
    description: '',
    imagePath: '',
    scoreDirection: 'desc',
  })
  creating.value = false
  await refresh()
}

usePageActions(
  computed(() =>
    creating.value
      ? [
          {
            label: 'Chiudi',
            icon: 'i-lucide-x',
            onClick: () => {
              creating.value = false
            },
          },
          {
            label: 'Crea gioco',
            icon: 'i-lucide-plus',
            color: 'primary' as const,
            onClick: create,
            loading: saving.value,
            disabled: !form.name.trim() || !form.platformId || saving.value,
          },
        ]
      : [
          {
            label: 'Nuovo gioco',
            onClick: async () => {
              creating.value = true
              await nextTick()
              document
                .getElementById('new-game-form')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            },
          },
        ],
  ),
)

useSeoMeta({ title: 'Giochi — Admin VRSUS', robots: 'noindex, nofollow' })
</script>

<template>
  <div>
    <header
      class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <p
          class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
        >
          Catalogo
        </p>
        <h1 class="font-display mt-3 text-3xl font-semibold text-white">
          Giochi
        </h1>
        <p class="mt-2 max-w-2xl text-white/50">
          Ogni gioco appartiene a una sola postazione.
        </p>
      </div>
    </header>

    <section
      v-if="creating"
      id="new-game-form"
      class="mt-6 scroll-mt-20 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="Postazione">
          <select v-model="form.platformId" class="vrsus-select">
            <option value="">Scegli…</option>
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

      <UAlert
        v-if="errorMessage"
        class="mt-4"
        color="error"
        variant="subtle"
        :description="errorMessage"
      />
    </section>

    <div class="mt-8 max-w-xs">
      <label class="block">
        <span
          class="mb-1.5 block text-xs tracking-wide text-white/45 uppercase"
        >
          Filtra per postazione
        </span>
        <select v-model="filterPlatform" class="vrsus-select">
          <option value="">Tutte</option>
          <option
            v-for="platform in platformPayload?.platforms ?? []"
            :key="platform.id"
            :value="platform.id"
          >
            {{ platform.name }}
          </option>
        </select>
      </label>
    </div>

    <div
      v-if="status === 'pending'"
      class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5"
    >
      <div
        v-for="index in 10"
        :key="index"
        class="aspect-[3/4] animate-pulse rounded-2xl bg-white/[0.03]"
      />
    </div>

    <p v-else-if="!filteredGames.length" class="mt-6 text-sm text-white/45">
      Nessun gioco con questo filtro.
    </p>

    <!--
      La card e composta dalla sola immagine con la label della postazione in
      alto a destra. Senza immagine mostra il nome, cosi non resta mai vuota.
    -->
    <div
      v-else
      class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5"
    >
      <NuxtLink
        v-for="game in filteredGames"
        :key="game.id"
        :to="`/admin/giochi/${game.id}`"
        class="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-colors hover:border-white/25"
      >
        <div class="relative aspect-[3/4]">
          <NuxtImg
            v-if="game.image_path"
            :src="game.image_path"
            :alt="game.name"
            class="size-full object-cover"
            loading="lazy"
          />
          <div
            v-else
            class="grid size-full place-items-center px-3 text-center"
          >
            <span class="font-display text-sm font-semibold text-white/45">{{
              game.name
            }}</span>
          </div>

          <span
            class="absolute top-2 right-2 rounded-lg bg-black/75 px-2 py-1 text-[11px] font-semibold tracking-wider text-white backdrop-blur"
          >
            {{ platformCode(game.platform_id) }}
          </span>

          <span
            v-if="!game.active"
            class="absolute bottom-2 left-2 rounded-lg bg-black/75 px-2 py-1 text-[11px] text-white/70 backdrop-blur"
          >
            Disattivato
          </span>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
