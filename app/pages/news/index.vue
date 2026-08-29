<script setup lang="ts">
const { data: posts, status, error } = await usePublicNewsPosts()

useSeoMeta({
  title: 'News — VRSUS',
  description: 'Aggiornamenti e novità dal mondo VRSUS.',
  robots: publicEventsRobots(),
})
</script>

<template>
  <div class="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
    <header class="max-w-2xl">
      <p
        class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
      >
        News
      </p>
      <h1
        class="font-display mt-5 text-5xl font-semibold tracking-tight text-white sm:text-7xl"
      >
        Le storie di VRSUS<span class="text-brand-red-500">.</span>
      </h1>
      <p class="mt-6 text-lg leading-8 text-white/60">
        Aggiornamenti, comunicazioni e contenuti pubblicati dal team VRSUS.
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
        Non è stato possibile caricare le news. Riprova tra poco.
      </div>
      <div
        v-else-if="!posts?.length"
        class="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-white/60"
      >
        Non ci sono ancora news pubblicate.
      </div>
      <div v-else class="grid gap-5 md:grid-cols-2">
        <NuxtLink
          v-for="post in posts"
          :key="post.id || post.slug || post.title || 'post'"
          :to="post.slug ? `/news/${post.slug}` : '/news'"
          class="group rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition-colors hover:border-white/25 hover:bg-white/[0.07] sm:p-8"
        >
          <div class="flex items-center justify-between gap-4">
            <p class="text-xs tracking-[0.18em] text-white/40 uppercase">
              {{ formatPublicContentDate(post.published_at) }}
            </p>
            <UIcon
              name="i-lucide-arrow-up-right"
              class="size-5 text-white/40 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
            />
          </div>
          <h2 class="font-display mt-12 text-2xl font-semibold text-white">
            {{ post.title || 'News VRSUS' }}
          </h2>
          <p
            v-if="post.excerpt"
            class="mt-4 line-clamp-3 text-sm leading-7 text-white/60"
          >
            {{ post.excerpt }}
          </p>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
