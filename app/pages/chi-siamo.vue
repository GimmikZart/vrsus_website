<script setup lang="ts">
import { ABOUT_CONTENT } from '~~/shared/constants/site-content'
import { publicEventsRobots } from '~/composables/usePublicEvents'

definePageMeta({ layout: 'site' })

useSeoMeta({
  title: 'Chi siamo — VRSUS',
  description: ABOUT_CONTENT.hero.body,
  robots: publicEventsRobots(),
})
</script>

<template>
  <div class="mx-auto max-w-4xl px-5 py-12 sm:px-8 lg:py-20">
    <p
      class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
    >
      {{ ABOUT_CONTENT.hero.eyebrow }}
    </p>
    <h1
      class="font-display mt-4 text-4xl leading-tight font-semibold tracking-tight text-white sm:text-5xl"
    >
      {{ ABOUT_CONTENT.hero.title }}
    </h1>
    <p class="mt-5 text-lg leading-8 text-white/60">
      {{ ABOUT_CONTENT.hero.body }}
    </p>

    <div class="mt-12 space-y-10">
      <section v-for="section in ABOUT_CONTENT.sections" :key="section.title">
        <h2 class="font-display text-xl font-semibold text-white sm:text-2xl">
          {{ section.title }}
        </h2>
        <p class="mt-3 leading-7 text-white/60">{{ section.body }}</p>
      </section>
    </div>

    <div class="mt-14 grid gap-4 sm:grid-cols-3">
      <div
        v-for="value in ABOUT_CONTENT.values"
        :key="value.title"
        class="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
      >
        <h3 class="font-display text-base font-semibold text-white">
          {{ value.title }}
        </h3>
        <p class="mt-2 text-sm text-white/55">{{ value.body }}</p>
      </div>
    </div>

    <div class="mt-14 flex flex-col gap-3 sm:flex-row">
      <UButton
        to="/postazioni"
        color="primary"
        size="lg"
        label="Guarda le postazioni"
      />
      <UButton
        to="/servizi"
        color="neutral"
        variant="outline"
        size="lg"
        label="Scopri i servizi"
      />
    </div>
  </div>
</template>
