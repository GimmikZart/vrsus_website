<script setup lang="ts">
import type { Database } from '~/types/database.types'

const route = useRoute()
const slug = String(route.params.slug)
const supabase = useSupabaseClient<Database>()

const {
  data: detail,
  status,
  error,
} = await useAsyncData(`public-event-${slug}`, async () => {
  const { data: event, error: eventError } = await supabase
    .from('public_events')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (eventError) {
    throw new Error('Impossibile caricare il dettaglio dell’evento.')
  }

  if (!event?.id) {
    return null
  }

  const [stationsResult, activitiesResult] = await Promise.all([
    supabase
      .from('public_event_stations')
      .select('*')
      .eq('event_id', event.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('public_event_activities')
      .select('*')
      .eq('event_id', event.id)
      .order('starts_at', { ascending: true }),
  ])

  if (stationsResult.error || activitiesResult.error) {
    throw new Error('Impossibile caricare le esperienze dell’evento.')
  }

  return {
    event,
    stations: stationsResult.data ?? [],
    activities: activitiesResult.data ?? [],
  }
})

const event = computed(() => detail.value?.event ?? null)
const stations = computed(() => detail.value?.stations ?? [])
const activities = computed(() => detail.value?.activities ?? [])
const pageTitle = computed(() =>
  event.value?.seo_title || event.value?.title
    ? `${event.value?.seo_title || event.value?.title} — VRSUS`
    : 'Evento VRSUS',
)
const pageDescription = computed(
  () =>
    event.value?.seo_description ||
    event.value?.short_description ||
    'Scopri i dettagli dell’evento VRSUS.',
)
const config = useRuntimeConfig()

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
  robots: publicEventsRobots(),
})

useHead(() => ({
  link: [
    {
      rel: 'canonical',
      href: `${config.public.appBaseUrl}/eventi/${slug}`,
    },
  ],
  script: event.value
    ? [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Event',
            name: event.value.title,
            description: event.value.short_description,
            startDate: event.value.starts_at,
            endDate: event.value.ends_at,
            location: event.value.venue_name
              ? {
                  '@type': 'Place',
                  name: event.value.venue_name,
                  address: event.value.venue_address,
                }
              : undefined,
          }),
        },
      ]
    : [],
}))
</script>

<template>
  <div class="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
    <div v-if="status === 'pending'" class="mx-auto max-w-3xl">
      <div class="h-12 w-2/3 animate-pulse rounded bg-white/10" />
      <div class="mt-8 h-32 animate-pulse rounded-3xl bg-white/[0.04]" />
    </div>
    <div
      v-else-if="error || !event"
      class="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center"
    >
      <p
        class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
      >
        {{ error ? 'Errore di caricamento' : 'Evento non trovato' }}
      </p>
      <h1 class="font-display mt-5 text-4xl font-semibold text-white">
        {{ error ? 'Riprova tra poco.' : 'Questo evento non è disponibile.' }}
      </h1>
      <UButton
        class="mt-8"
        to="/eventi"
        color="primary"
        label="Torna agli eventi"
      />
    </div>
    <article v-else>
      <NuxtLink
        to="/eventi"
        class="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
      >
        <UIcon name="i-lucide-arrow-left" class="size-4" />
        Tutti gli eventi
      </NuxtLink>
      <header class="mt-10 max-w-4xl">
        <p
          class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
        >
          Evento VRSUS
        </p>
        <h1
          class="font-display mt-5 text-5xl font-semibold tracking-tight text-white sm:text-7xl"
        >
          {{ event.title }}<span class="text-brand-red-500">.</span>
        </h1>
        <p
          v-if="event.short_description"
          class="mt-7 max-w-2xl text-xl leading-8 text-white/65"
        >
          {{ event.short_description }}
        </p>
        <div class="mt-8 flex flex-wrap gap-3 text-sm text-white/60">
          <span
            v-if="event.starts_at"
            class="rounded-full border border-white/10 px-4 py-2"
          >
            {{ formatPublicEventDate(event.starts_at, event.ends_at) }}
          </span>
          <span
            v-if="event.venue_name"
            class="rounded-full border border-white/10 px-4 py-2"
          >
            {{ event.venue_name }}
          </span>
          <span class="rounded-full border border-white/10 px-4 py-2">
            {{
              formatPublicEventPrice(event.price_cents, event.payment_required)
            }}
          </span>
        </div>
      </header>

      <div class="mt-16 grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div
            v-if="event.description"
            class="prose prose-invert max-w-none text-white/70"
          >
            <p class="leading-8 whitespace-pre-line">{{ event.description }}</p>
          </div>
          <div
            v-else
            class="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-white/60"
          >
            I dettagli dell’evento saranno pubblicati qui appena disponibili.
          </div>
        </div>

        <aside class="space-y-5">
          <section
            v-if="stations.length"
            class="rounded-3xl border border-white/10 bg-white/[0.04] p-6"
          >
            <h2 class="font-display text-xl font-semibold text-white">
              Postazioni
            </h2>
            <ul class="mt-5 space-y-4">
              <li
                v-for="station in stations"
                :key="station.id || station.name || 'station'"
                class="border-t border-white/10 pt-4 first:border-0 first:pt-0"
              >
                <p class="font-medium text-white/85">{{ station.name }}</p>
                <p
                  v-if="station.description"
                  class="mt-1 text-sm leading-6 text-white/50"
                >
                  {{ station.description }}
                </p>
              </li>
            </ul>
          </section>
          <section
            v-if="activities.length"
            class="rounded-3xl border border-white/10 bg-white/[0.04] p-6"
          >
            <h2 class="font-display text-xl font-semibold text-white">
              Attività
            </h2>
            <ul class="mt-5 space-y-4">
              <li
                v-for="activity in activities"
                :key="activity.id || activity.name || 'activity'"
                class="border-t border-white/10 pt-4 first:border-0 first:pt-0"
              >
                <p class="font-medium text-white/85">{{ activity.name }}</p>
                <p
                  v-if="activity.category_name"
                  class="text-brand-blue-300 mt-1 text-xs tracking-wide uppercase"
                >
                  {{ activity.category_name }}
                </p>
                <p
                  v-if="activity.description"
                  class="mt-1 text-sm leading-6 text-white/50"
                >
                  {{ activity.description }}
                </p>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </article>
  </div>
</template>
