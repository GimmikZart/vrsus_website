<script setup lang="ts">
const { data: activities, status, error } = await usePublicActivities()

useSeoMeta({
  title: 'Esperienze — VRSUS',
  description: 'Scopri le esperienze di gioco disponibili nel mondo VRSUS.',
  robots: publicEventsRobots(),
})
</script>

<template>
  <div class="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
    <header class="max-w-2xl">
      <p
        class="text-brand-blue-300 text-xs font-semibold tracking-[0.24em] uppercase"
      >
        Catalogo VRSUS
      </p>
      <h1
        class="font-display mt-5 text-5xl font-semibold tracking-tight text-white sm:text-7xl"
      >
        Gioca come vuoi<span class="text-brand-red-500">.</span>
      </h1>
      <p class="mt-6 text-lg leading-8 text-white/60">
        Un catalogo di esperienze da scoprire e vivere durante gli appuntamenti
        VRSUS.
      </p>
    </header>

    <div class="mt-14">
      <div
        v-if="status === 'pending'"
        class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        <div
          v-for="item in 3"
          :key="item"
          class="h-52 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]"
        />
      </div>
      <div
        v-else-if="error"
        class="border-brand-red-500/30 bg-brand-red-500/10 rounded-3xl border p-6 text-white/75"
        role="alert"
      >
        Non è stato possibile caricare le esperienze. Riprova tra poco.
      </div>
      <div
        v-else-if="!activities?.length"
        class="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-white/60"
      >
        Non ci sono ancora esperienze pubblicate.
      </div>
      <div v-else class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="activity in activities"
          :key="activity.id || activity.slug || activity.name || 'activity'"
          class="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8"
        >
          <p
            v-if="activity.category_name"
            class="text-brand-blue-300 text-xs font-semibold tracking-[0.18em] uppercase"
          >
            {{ activity.category_name }}
          </p>
          <h2 class="font-display mt-8 text-2xl font-semibold text-white">
            {{ activity.name || 'Esperienza VRSUS' }}
          </h2>
          <p
            v-if="activity.short_description || activity.description"
            class="mt-4 text-sm leading-7 text-white/60"
          >
            {{ activity.short_description || activity.description }}
          </p>
        </article>
      </div>
    </div>
  </div>
</template>
