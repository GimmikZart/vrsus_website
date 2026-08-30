<script setup lang="ts">
import type { Database } from '~/types/database.types'

const route = useRoute()
const slug = String(route.params.slug)
const client = useSupabaseClient<Database>()

const {
  data: activity,
  status,
  error,
} = await useAsyncData(`public-activity-${slug}`, async () => {
  const { data, error: queryError } = await client
    .from('public_activities')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (queryError) throw new Error('Impossibile caricare l’esperienza.')
  return data
})

const pageTitle = computed(
  () => activity.value?.seo_title || activity.value?.name || 'Esperienza VRSUS',
)
const pageDescription = computed(
  () =>
    activity.value?.seo_description ||
    activity.value?.short_description ||
    'Scopri un’esperienza VRSUS.',
)
const config = useRuntimeConfig()

useSeoMeta({
  title: computed(() => `${pageTitle.value} — VRSUS`),
  description: pageDescription,
  robots: publicEventsRobots(),
})

useHead(() => ({
  link: [
    {
      rel: 'canonical',
      href: `${config.public.appBaseUrl}/esperienze/${slug}`,
    },
  ],
}))
</script>

<template>
  <main class="mx-auto max-w-5xl px-5 py-16 sm:px-8 lg:py-24">
    <div
      v-if="status === 'pending'"
      class="h-96 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]"
    />
    <div
      v-else-if="error || !activity"
      class="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center"
    >
      <p
        class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
      >
        {{ error ? 'Errore di caricamento' : 'Esperienza non trovata' }}
      </p>
      <h1 class="font-display mt-5 text-4xl font-semibold text-white">
        {{
          error ? 'Riprova tra poco.' : 'Questa esperienza non è disponibile.'
        }}
      </h1>
      <UButton
        class="mt-8"
        to="/esperienze"
        color="primary"
        label="Torna alle esperienze"
      />
    </div>
    <article v-else>
      <NuxtLink
        to="/esperienze"
        class="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
      >
        <UIcon name="i-lucide-arrow-left" class="size-4" />
        Tutte le esperienze
      </NuxtLink>

      <div class="mt-10 grid gap-10 lg:grid-cols-[1fr_0.8fr] lg:items-start">
        <header>
          <p
            v-if="activity.category_name"
            class="text-brand-blue-300 text-xs font-semibold tracking-[0.24em] uppercase"
          >
            {{ activity.category_name }}
          </p>
          <h1
            class="font-display mt-5 text-5xl font-semibold tracking-tight text-white sm:text-7xl"
          >
            {{ activity.name }}<span class="text-brand-red-500">.</span>
          </h1>
          <p
            v-if="activity.short_description"
            class="mt-7 max-w-2xl text-xl leading-8 text-white/65"
          >
            {{ activity.short_description }}
          </p>
        </header>

        <div
          v-if="activity.image_path"
          class="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]"
        >
          <img
            :src="
              client.storage
                .from('vrsus-assets')
                .getPublicUrl(activity.image_path).data.publicUrl
            "
            :alt="activity.name || 'Immagine esperienza VRSUS'"
            class="aspect-[4/3] w-full object-cover"
          />
        </div>
        <div
          v-else
          class="flex aspect-[4/3] items-center justify-center rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_50%_40%,rgb(47_128_237/18%),transparent_42%),linear-gradient(145deg,#171a24,#0c0e14)]"
          aria-hidden="true"
        >
          <span class="font-display text-7xl font-bold text-white/80"
            >V<span class="text-brand-red-500">/</span></span
          >
        </div>
      </div>

      <div
        v-if="activity.description"
        class="mt-14 max-w-3xl border-t border-white/10 pt-10 text-base leading-8 text-white/70"
      >
        <p class="whitespace-pre-line">{{ activity.description }}</p>
      </div>
    </article>
  </main>
</template>
