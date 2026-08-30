<script setup lang="ts">
const client = useSupabaseClient()
const {
  data: tournaments,
  status,
  error,
} = await useAsyncData('public-tournaments', async () => {
  const { data, error } = await client
    .from('public_tournaments')
    .select('*')
    .order('starts_at', { ascending: true })
  if (error) throw error
  return data ?? []
})

useSeoMeta({
  title: 'Tornei — VRSUS',
  description: 'Scopri i tornei VRSUS e iscriviti alle prossime sfide.',
  robots: publicEventsRobots(),
})
</script>

<template>
  <div class="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
    <header class="max-w-2xl">
      <p
        class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
      >
        VRSUS Arena
      </p>
      <h1
        class="font-display mt-5 text-5xl font-semibold tracking-tight text-white sm:text-7xl"
      >
        Sfide, bracket, vittorie<span class="text-brand-red-500">.</span>
      </h1>
      <p class="mt-6 text-lg leading-8 text-white/60">
        Iscriviti ai tornei pubblicati e segui il percorso fino alla finale.
      </p>
    </header>

    <div class="mt-14">
      <div v-if="status === 'pending'" class="grid gap-5 md:grid-cols-2">
        <div
          v-for="item in 2"
          :key="item"
          class="h-56 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]"
        />
      </div>
      <div
        v-else-if="error"
        class="border-brand-red-500/30 bg-brand-red-500/10 rounded-3xl border p-6 text-white/75"
        role="alert"
      >
        Non è stato possibile caricare i tornei. Riprova tra poco.
      </div>
      <div
        v-else-if="!tournaments?.length"
        class="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-white/60"
      >
        Non ci sono ancora tornei pubblicati.
      </div>
      <div v-else class="grid gap-5 md:grid-cols-2">
        <NuxtLink
          v-for="tournament in tournaments"
          :key="String(tournament.id)"
          :to="`/tornei/${String(tournament.slug)}`"
          class="group rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition-colors hover:border-white/25 hover:bg-white/[0.07] sm:p-8"
        >
          <div class="flex items-center justify-between gap-4">
            <UBadge
              color="primary"
              variant="subtle"
              :label="tournamentStatusLabel(String(tournament.status))"
            />
            <UIcon
              name="i-lucide-arrow-up-right"
              class="size-5 text-white/40 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
            />
          </div>
          <h2 class="font-display mt-12 text-2xl font-semibold text-white">
            {{ tournament.name }}
          </h2>
          <p
            v-if="tournament.description"
            class="mt-3 line-clamp-3 text-sm leading-6 text-white/60"
          >
            {{ tournament.description }}
          </p>
          <div
            class="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/50"
          >
            <span v-if="tournament.starts_at">{{
              formatPublicEventDate(String(tournament.starts_at))
            }}</span>
            <span v-if="tournament.max_entries"
              >Max {{ tournament.max_entries }} partecipanti</span
            >
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
