<script setup lang="ts">
import { PLATFORMS_INTRO } from '~~/shared/constants/site-content'
import { usePublicPlatforms } from '~/composables/usePublicCatalog'
import { publicEventsRobots } from '~/composables/usePublicEvents'

definePageMeta({ layout: 'site' })

const { data: platforms, status, error } = await usePublicPlatforms()

useSeoMeta({
  title: 'Postazioni — VRSUS',
  description: PLATFORMS_INTRO.description,
  robots: publicEventsRobots(),
})
</script>

<template>
  <div class="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
    <PublicSectionHeading
      :eyebrow="PLATFORMS_INTRO.eyebrow"
      :title="PLATFORMS_INTRO.title"
      :description="PLATFORMS_INTRO.description"
    />

    <!--
      Due colonne gia da mobile: le card hanno una locandina e un titolo corto,
      in colonna singola si perdeva mezzo schermo per postazione.
    -->
    <div
      v-if="status === 'pending'"
      class="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3"
    >
      <div
        v-for="index in 6"
        :key="index"
        class="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"
      />
    </div>

    <UAlert
      v-else-if="error"
      class="mt-10"
      color="error"
      variant="subtle"
      title="Impossibile caricare le postazioni"
      description="Riprova fra qualche istante."
    />

    <div
      v-else-if="!platforms?.length"
      class="mt-10 rounded-2xl border border-dashed border-white/15 p-10 text-center text-white/50"
    >
      Nessuna postazione pubblicata al momento.
    </div>

    <div v-else class="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      <NuxtLink
        v-for="platform in platforms"
        :key="String(platform.id ?? platform.slug)"
        :to="`/postazioni/${platform.slug}`"
        class="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-colors hover:border-white/25"
      >
        <div class="relative aspect-[16/10] bg-white/[0.02]">
          <NuxtImg
            v-if="platform.image_path"
            :src="platform.image_path"
            :alt="platform.name ?? 'Postazione'"
            class="size-full object-cover"
            loading="lazy"
          />
          <div v-else class="grid size-full place-items-center">
            <UIcon name="i-lucide-monitor" class="size-10 text-white/15" />
          </div>
          <span
            class="absolute top-3 right-3 rounded-lg bg-black/70 px-2 py-1 text-[11px] font-semibold tracking-wider text-white backdrop-blur"
            >{{ platform.code }}</span
          >
        </div>
        <div class="p-3.5 sm:p-5">
          <h2
            class="font-display text-base leading-tight font-semibold text-white sm:text-lg"
          >
            {{ platform.name }}
          </h2>
          <p
            v-if="platform.category_name"
            class="mt-1 text-[11px] tracking-wide text-white/40 uppercase sm:text-xs"
          >
            {{ platform.category_name }}
          </p>
          <p
            v-if="platform.description"
            class="mt-2.5 line-clamp-2 text-[13px] text-white/55 sm:mt-3 sm:text-sm"
          >
            {{ platform.description }}
          </p>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
