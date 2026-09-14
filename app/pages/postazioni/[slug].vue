<script setup lang="ts">
import {
  fetchPublicPlatformDetail,
  formatPlayerRange,
} from '~/composables/usePublicCatalog'
import { publicEventsRobots } from '~/composables/usePublicEvents'

definePageMeta({ layout: 'site' })

const route = useRoute()
const slug = computed(() => String(route.params.slug))

const { data, error } = await useAsyncData(
  () => `public-platform-${slug.value}`,
  () => fetchPublicPlatformDetail(slug.value),
)

if (!data.value && !error.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Postazione non trovata',
  })
}

useSeoMeta({
  title: () => `${data.value?.platform.name ?? 'Postazione'} — VRSUS`,
  description: () => data.value?.platform.description ?? undefined,
  robots: publicEventsRobots(),
})
</script>

<template>
  <div class="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
    <template v-if="data">
      <NuxtLink to="/postazioni" class="text-sm text-white/45 hover:text-white">
        ← Tutte le postazioni
      </NuxtLink>

      <div class="mt-8 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div
          class="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]"
        >
          <div class="relative aspect-[16/10]">
            <NuxtImg
              v-if="data.platform.image_path"
              :src="data.platform.image_path"
              :alt="data.platform.name ?? 'Postazione'"
              class="size-full object-cover"
            />
            <div v-else class="grid size-full place-items-center">
              <UIcon name="i-lucide-monitor" class="size-12 text-white/15" />
            </div>
          </div>
        </div>

        <div>
          <span
            class="inline-flex rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold tracking-wider text-white/70"
            >{{ data.platform.code }}</span
          >
          <h1
            class="font-display mt-4 text-3xl font-semibold text-white sm:text-4xl"
          >
            {{ data.platform.name }}
          </h1>
          <p
            v-if="data.platform.description"
            class="mt-4 text-base leading-7 text-white/60"
          >
            {{ data.platform.description }}
          </p>
        </div>
      </div>

      <section class="mt-14">
        <h2 class="font-display text-2xl font-semibold text-white">
          Giochi disponibili
        </h2>

        <p v-if="!data.games.length" class="mt-4 text-white/50">
          Nessun gioco pubblicato per questa postazione.
        </p>

        <div v-else class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="game in data.games"
            :key="String(game.id ?? game.slug)"
            class="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
          >
            <div class="relative aspect-[3/4] bg-white/[0.02]">
              <NuxtImg
                v-if="game.image_path"
                :src="game.image_path"
                :alt="game.name ?? 'Gioco'"
                class="size-full object-cover"
                loading="lazy"
              />
              <div
                v-else
                class="grid size-full place-items-center px-4 text-center"
              >
                <span class="font-display text-sm font-semibold text-white/40">
                  {{ game.name }}
                </span>
              </div>
              <span
                class="absolute top-3 right-3 rounded-lg bg-black/70 px-2 py-1 text-[11px] font-semibold tracking-wider text-white backdrop-blur"
                >{{ game.platform_code }}</span
              >
            </div>
            <div class="p-4">
              <h3 class="font-display text-base font-semibold text-white">
                {{ game.name }}
              </h3>
              <p class="mt-1 text-xs text-white/45">
                {{ game.genre ?? 'Genere non indicato' }} ·
                {{ formatPlayerRange(game.min_players, game.max_players) }}
              </p>
            </div>
          </article>
        </div>
      </section>
    </template>
  </div>
</template>
