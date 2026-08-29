<script setup lang="ts">
import type { Database } from '~/types/database.types'

const route = useRoute()
const slug = String(route.params.slug)
const supabase = useSupabaseClient<Database>()

const {
  data: post,
  status,
  error,
} = await useAsyncData(`public-news-${slug}`, async () => {
  const { data, error: queryError } = await supabase
    .from('public_news_posts')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (queryError) throw new Error('Impossibile caricare la news.')
  return data
})

const pageTitle = computed(
  () => post.value?.seo_title || post.value?.title || 'News VRSUS',
)
const pageDescription = computed(
  () =>
    post.value?.seo_description ||
    post.value?.excerpt ||
    'Aggiornamenti dal mondo VRSUS.',
)
const config = useRuntimeConfig()

useSeoMeta({
  title: computed(() => `${pageTitle.value} — VRSUS`),
  description: pageDescription,
  robots: publicEventsRobots(),
})

useHead(() => ({
  link: [
    { rel: 'canonical', href: `${config.public.appBaseUrl}/news/${slug}` },
  ],
  script: post.value
    ? [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            headline: post.value.title,
            description: post.value.excerpt,
            datePublished: post.value.published_at,
          }),
        },
      ]
    : [],
}))
</script>

<template>
  <div class="mx-auto max-w-4xl px-5 py-16 sm:px-8 lg:py-24">
    <div
      v-if="status === 'pending'"
      class="h-80 animate-pulse rounded-3xl bg-white/[0.04]"
    />
    <div
      v-else-if="error || !post"
      class="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center"
    >
      <p
        class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
      >
        {{ error ? 'Errore di caricamento' : 'News non trovata' }}
      </p>
      <h1 class="font-display mt-5 text-4xl font-semibold text-white">
        {{
          error ? 'Riprova tra poco.' : 'Questo contenuto non è disponibile.'
        }}
      </h1>
      <UButton
        class="mt-8"
        to="/news"
        color="primary"
        label="Torna alle news"
      />
    </div>
    <article v-else>
      <NuxtLink
        to="/news"
        class="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
      >
        <UIcon name="i-lucide-arrow-left" class="size-4" /> Tutte le news
      </NuxtLink>
      <p
        class="text-brand-red-400 mt-10 text-xs font-semibold tracking-[0.24em] uppercase"
      >
        {{ formatPublicContentDate(post.published_at) }}
      </p>
      <h1
        class="font-display mt-5 text-5xl font-semibold tracking-tight text-white sm:text-7xl"
      >
        {{ post.title }}<span class="text-brand-red-500">.</span>
      </h1>
      <p v-if="post.excerpt" class="mt-7 text-xl leading-8 text-white/65">
        {{ post.excerpt }}
      </p>
      <div
        class="mt-12 border-t border-white/10 pt-10 text-base leading-8 text-white/70"
      >
        <p class="whitespace-pre-line">{{ post.content }}</p>
      </div>
    </article>
  </div>
</template>
