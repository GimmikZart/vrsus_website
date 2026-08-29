<script setup lang="ts">
import {
  formatPublicEventDate,
  formatPublicEventPrice,
  type PublicEvent,
} from '~/composables/usePublicEvents'

const props = defineProps<{
  event: PublicEvent | null | undefined
}>()

const eventStatusLabel = computed(() => {
  if (props.event?.status === 'running') return 'In corso'
  if (props.event?.status === 'completed') return 'Concluso'
  return 'In programma'
})
</script>

<template>
  <article
    class="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 sm:p-8"
  >
    <div
      class="bg-brand-blue-500/15 absolute -top-16 -right-16 size-48 rounded-full blur-3xl"
      aria-hidden="true"
    />
    <div
      class="relative flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <div class="mb-5 flex items-center gap-3">
          <UBadge
            :color="event ? 'primary' : 'secondary'"
            variant="subtle"
            :label="event ? eventStatusLabel : 'In preparazione'"
          />
          <span class="text-xs tracking-[0.18em] text-white/40 uppercase"
            >Evento VRSUS</span
          >
        </div>
        <h3 class="font-display text-2xl font-semibold text-white sm:text-3xl">
          {{ event?.title ?? 'Il prossimo evento prende forma.' }}
        </h3>
        <p class="mt-3 max-w-xl text-sm leading-6 text-white/60">
          {{
            event?.short_description ??
            "Le informazioni dell'evento saranno pubblicate qui appena disponibili."
          }}
        </p>
        <div
          v-if="event"
          class="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/55"
        >
          <span v-if="event.starts_at">
            {{ formatPublicEventDate(event.starts_at, event.ends_at) }}
          </span>
          <span v-if="event.venue_name">{{ event.venue_name }}</span>
          <span>{{
            formatPublicEventPrice(event.price_cents, event.payment_required)
          }}</span>
        </div>
      </div>
      <UButton
        :to="event?.slug ? `/eventi/${event.slug}` : '/evento'"
        color="secondary"
        variant="soft"
        trailing-icon="i-lucide-arrow-up-right"
        :label="event ? 'Scopri l’evento' : 'Vai all’evento'"
      />
    </div>
  </article>
</template>
