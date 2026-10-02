<script setup lang="ts">
import type { Database } from '~/types/database.types'
import { isRankingOpen } from '~~/shared/utils/ranking'

definePageMeta({ layout: 'app', middleware: ['auth'] })

const client = useSupabaseClient<Database>()
const filterOpen = ref(false)
const platformFilter = ref('')
const gameFilter = ref('')
const draftPlatform = ref('')
const draftGame = ref('')

const { data: rankings } = await useAsyncData('app-game-rankings', async () => {
  const { data } = await client
    .from('public_game_rankings')
    .select('*')
    .order('created_at', { ascending: false })
  return data ?? []
})
const { data: games } = await useAsyncData('ranking-game-images', async () => {
  const { data } = await client.from('public_games').select('id,image_path')
  return data ?? []
})

const imageByGame = computed(
  () => new Map((games.value ?? []).map((game) => [game.id, game.image_path])),
)
const platforms = computed(() => {
  const map = new Map<string, string>()
  for (const ranking of rankings.value ?? []) {
    if (ranking.platform_id) {
      map.set(ranking.platform_id, ranking.platform_name ?? 'Postazione')
    }
  }
  return [...map].map(([id, name]) => ({ id, name }))
})
const gamesForDraftPlatform = computed(() => {
  const map = new Map<string, string>()
  for (const ranking of rankings.value ?? []) {
    if (draftPlatform.value && ranking.platform_id !== draftPlatform.value)
      continue
    if (ranking.game_id) map.set(ranking.game_id, ranking.game_name ?? 'Gioco')
  }
  return [...map].map(([id, name]) => ({ id, name }))
})
watch(draftPlatform, () => {
  if (
    !gamesForDraftPlatform.value.some((game) => game.id === draftGame.value)
  ) {
    draftGame.value = ''
  }
})

const visibleRankings = computed(() =>
  (rankings.value ?? [])
    .filter(
      (ranking) =>
        (!platformFilter.value ||
          ranking.platform_id === platformFilter.value) &&
        (!gameFilter.value || ranking.game_id === gameFilter.value),
    )
    .sort(
      (first, second) =>
        Number(isRankingOpen(second)) - Number(isRankingOpen(first)) ||
        new Date(second.created_at ?? 0).getTime() -
          new Date(first.created_at ?? 0).getTime(),
    ),
)

function openFilters() {
  draftPlatform.value = platformFilter.value
  draftGame.value = gameFilter.value
  filterOpen.value = true
}
function applyFilters() {
  platformFilter.value = draftPlatform.value
  gameFilter.value = draftGame.value
  filterOpen.value = false
}
function clearDraftFilters() {
  draftPlatform.value = ''
  draftGame.value = ''
}

usePageActions(
  computed(() => [
    {
      label:
        platformFilter.value || gameFilter.value ? 'Filtri attivi' : 'Filtri',
      icon: 'i-lucide-sliders-horizontal',
      onClick: openFilters,
    },
  ]),
)

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

    <div
      v-if="platformFilter || gameFilter"
      class="flex flex-wrap gap-2 text-xs text-white/60"
    >
      <span
        v-if="platformFilter"
        class="rounded-full border border-white/15 px-3 py-1.5"
      >
        {{ platforms.find((item) => item.id === platformFilter)?.name }}
      </span>
      <span
        v-if="gameFilter"
        class="rounded-full border border-white/15 px-3 py-1.5"
      >
        {{ gamesForDraftPlatform.find((item) => item.id === gameFilter)?.name }}
      </span>
    </div>

    <div class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      <NuxtLink
        to="/app/ranking/punti-vrsus"
        class="group relative isolate aspect-[3/4] overflow-hidden rounded-2xl border border-white/15 text-left transition-transform hover:-translate-y-0.5"
      >
        <div
          class="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_70%_15%,#672c3b,#1d1d2b_60%,#101219)]"
        >
          <UIcon name="i-lucide-trophy" class="size-14 text-white/20" />
        </div>
        <div
          class="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.96)_0%,rgba(0,0,0,0.75)_34%,transparent_78%)]"
        />
        <div class="absolute inset-x-0 bottom-0 space-y-1.5 p-3 text-white">
          <span
            class="inline-flex rounded-md bg-white px-2 py-1 text-[10px] font-bold tracking-wide text-black uppercase"
            >VRSUS</span
          >
          <p class="font-display text-sm leading-tight font-semibold">
            Punti VRSUS
          </p>
          <p class="text-xs leading-tight text-white/85">Classifica generale</p>
        </div>
      </NuxtLink>

      <NuxtLink
        v-for="ranking in visibleRankings"
        :key="String(ranking.id)"
        :to="`/app/ranking/${ranking.id}`"
        class="group relative isolate aspect-[3/4] overflow-hidden rounded-2xl border border-white/15 text-left transition-transform hover:-translate-y-0.5"
      >
        <NuxtImg
          v-if="ranking.game_id && imageByGame.get(ranking.game_id)"
          :src="imageByGame.get(ranking.game_id)!"
          :alt="ranking.game_name ?? ''"
          class="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div
          v-else
          class="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_70%_15%,#52323d,#1d1d2b_60%,#101219)]"
        >
          <UIcon name="i-lucide-gamepad-2" class="size-14 text-white/15" />
        </div>
        <div
          class="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.96)_0%,rgba(0,0,0,0.75)_34%,transparent_78%)]"
        />
        <div class="absolute inset-x-0 bottom-0 space-y-1.5 p-3 text-white">
          <span
            class="inline-flex rounded-md bg-white px-2 py-1 text-[10px] font-bold tracking-wide text-black uppercase"
            >{{
              ranking.platform_code ?? ranking.platform_name ?? 'Gioco'
            }}</span
          >
          <p
            class="font-display line-clamp-2 text-sm leading-tight font-semibold"
          >
            {{ ranking.game_name }}
          </p>
          <p class="line-clamp-2 text-xs leading-tight text-white/85">
            {{ ranking.name }}
          </p>
        </div>
      </NuxtLink>
    </div>

    <UiVrsusBottomSheet
      v-model="filterOpen"
      title="Filtra ranking"
      description="Scegli postazione e gioco."
    >
      <div class="space-y-4">
        <label class="block">
          <span class="mb-1.5 block text-xs font-medium text-white/60"
            >Postazione</span
          >
          <select v-model="draftPlatform" class="vrsus-select">
            <option value="">Tutte</option>
            <option
              v-for="platform in platforms"
              :key="platform.id"
              :value="platform.id"
            >
              {{ platform.name }}
            </option>
          </select>
        </label>
        <label class="block">
          <span class="mb-1.5 block text-xs font-medium text-white/60"
            >Gioco</span
          >
          <select v-model="draftGame" class="vrsus-select">
            <option value="">Tutti</option>
            <option
              v-for="game in gamesForDraftPlatform"
              :key="game.id"
              :value="game.id"
            >
              {{ game.name }}
            </option>
          </select>
        </label>
        <div class="flex gap-2">
          <UButton
            color="neutral"
            variant="outline"
            class="flex-1 justify-center"
            label="Azzera"
            @click="clearDraftFilters"
          />
          <UButton
            color="primary"
            class="flex-1 justify-center"
            label="Filtra"
            @click="applyFilters"
          />
        </div>
      </div>
    </UiVrsusBottomSheet>
  </div>
</template>
