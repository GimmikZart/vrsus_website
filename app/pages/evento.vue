<script setup lang="ts">
const { data: event, status, error } = await usePublicNextEvent()

useSeoMeta({
  title: 'Prossimo evento — VRSUS',
  description: 'Scopri data, luogo ed esperienze del prossimo evento VRSUS.',
  robots: publicEventsRobots(),
})
</script>

<template>
  <section
    class="mx-auto flex min-h-[620px] max-w-3xl flex-col justify-center px-5 py-20 text-center sm:px-8"
  >
    <p
      class="text-brand-blue-400 text-xs font-semibold tracking-[0.24em] uppercase"
    >
      {{
        status === 'pending'
          ? 'Caricamento'
          : event
            ? 'Prossimo evento'
            : 'Nessun evento pubblicato'
      }}
    </p>
    <h1
      class="font-display mt-5 text-4xl font-semibold tracking-tight text-white sm:text-6xl"
    >
      {{ event?.title ?? 'Stiamo preparando il prossimo appuntamento'
      }}<span class="text-brand-red-500">.</span>
    </h1>
    <p class="mx-auto mt-6 max-w-xl text-base leading-7 text-white/60">
      {{
        error
          ? 'Non è stato possibile caricare i dati. Riprova tra poco.'
          : event?.description ||
            "Le informazioni dell'evento saranno pubblicate qui appena disponibili."
      }}
    </p>
    <div
      v-if="event"
      class="mt-8 flex flex-wrap justify-center gap-3 text-sm text-white/60"
    >
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
    </div>
    <div class="mt-9">
      <UButton
        :to="event?.slug ? `/eventi/${event.slug}` : '/'"
        color="primary"
        leading-icon="i-lucide-arrow-left"
        :label="event ? 'Apri il dettaglio' : 'Torna alla home'"
      />
    </div>
  </section>
</template>
