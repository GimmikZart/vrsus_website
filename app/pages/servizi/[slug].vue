<script setup lang="ts">
import type { Database } from '~/types/database.types'

const route = useRoute()
const slug = String(route.params.slug)
const supabase = useSupabaseClient<Database>()

const {
  data: service,
  status,
  error,
} = await useAsyncData(`public-service-${slug}`, async () => {
  const { data, error: queryError } = await supabase
    .from('public_service_pages')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (queryError) throw new Error('Impossibile caricare il servizio.')
  return data
})

const pageTitle = computed(
  () => service.value?.seo_title || service.value?.title || 'Servizio VRSUS',
)
const pageDescription = computed(
  () =>
    service.value?.seo_description ||
    service.value?.excerpt ||
    'Scopri i servizi VRSUS.',
)
const config = useRuntimeConfig()

useSeoMeta({
  title: computed(() => `${pageTitle.value} — VRSUS`),
  description: pageDescription,
  robots: publicEventsRobots(),
})

useHead(() => ({
  link: [
    { rel: 'canonical', href: `${config.public.appBaseUrl}/servizi/${slug}` },
  ],
}))
</script>

<template>
  <div class="mx-auto max-w-4xl px-5 py-16 sm:px-8 lg:py-24">
    <div
      v-if="status === 'pending'"
      class="h-80 animate-pulse rounded-3xl bg-white/[0.04]"
    />
    <div
      v-else-if="error || !service"
      class="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center"
    >
      <p
        class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
      >
        {{ error ? 'Errore di caricamento' : 'Servizio non trovato' }}
      </p>
      <h1 class="font-display mt-5 text-4xl font-semibold text-white">
        {{ error ? 'Riprova tra poco.' : 'Questo servizio non è disponibile.' }}
      </h1>
      <UButton
        class="mt-8"
        to="/servizi"
        color="primary"
        label="Torna ai servizi"
      />
    </div>
    <article v-else>
      <NuxtLink
        to="/servizi"
        class="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
      >
        <UIcon name="i-lucide-arrow-left" class="size-4" /> Tutti i servizi
      </NuxtLink>
      <p
        class="text-brand-blue-300 mt-10 text-xs font-semibold tracking-[0.24em] uppercase"
      >
        Servizio VRSUS
      </p>
      <h1
        class="font-display mt-5 text-5xl font-semibold tracking-tight text-white sm:text-7xl"
      >
        {{ service.title }}<span class="text-brand-red-500">.</span>
      </h1>
      <p v-if="service.excerpt" class="mt-7 text-xl leading-8 text-white/65">
        {{ service.excerpt }}
      </p>
      <div
        class="mt-12 border-t border-white/10 pt-10 text-base leading-8 text-white/70"
      >
        <p class="whitespace-pre-line">{{ service.content }}</p>
      </div>
      <div
        class="mt-12 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-white/60"
      >
        Le richieste per questo servizio saranno disponibili in un prossimo
        aggiornamento.
      </div>
    </article>
  </div>
</template>
