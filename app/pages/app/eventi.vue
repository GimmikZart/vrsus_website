<script setup lang="ts">
import type { MyBooking } from '~/composables/useBookings'

definePageMeta({ middleware: ['auth'] })

const { data: events, status, error } = await usePublicEvents()
const { data: bookings } = await useMyBookings()

const bookingByEvent = computed(() => {
  const result = new Map<string, MyBooking>()
  for (const booking of bookings.value ?? []) {
    if (['confirmed', 'waitlisted'].includes(booking.status)) {
      result.set(booking.event_id, booking)
    }
  }
  return result
})

function bookingFor(eventId: string | null) {
  return eventId ? bookingByEvent.value.get(eventId) : undefined
}

useSeoMeta({ title: 'I miei eventi — VRSUS', robots: 'noindex, nofollow' })
</script>

<template>
  <main
    class="mx-auto min-h-[calc(100vh-9rem)] max-w-7xl px-5 py-16 sm:px-8 lg:py-24"
  >
    <NuxtLink to="/app" class="text-sm text-white/50 hover:text-white"
      >← Area personale</NuxtLink
    >
    <header class="mt-8 max-w-2xl">
      <p
        class="text-brand-blue-400 text-xs font-semibold tracking-[0.24em] uppercase"
      >
        Area personale
      </p>
      <h1 class="font-display mt-3 text-4xl font-semibold text-white">
        I miei eventi<span class="text-brand-red-500">.</span>
      </h1>
      <p class="mt-4 text-white/55">
        Scopri gli appuntamenti pubblicati e gestisci la tua partecipazione.
      </p>
    </header>

    <div class="mt-10">
      <div v-if="status === 'pending'" class="grid gap-5 md:grid-cols-2">
        <div
          v-for="item in 2"
          :key="item"
          class="h-56 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]"
        />
      </div>
      <UAlert
        v-else-if="error"
        color="error"
        variant="subtle"
        description="Non è stato possibile caricare gli eventi."
      />
      <div
        v-else-if="!events?.length"
        class="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-white/55"
      >
        Non ci sono ancora eventi pubblicati.
      </div>
      <div v-else class="grid gap-5 md:grid-cols-2">
        <article
          v-for="event in events"
          :key="String(event.id ?? event.slug)"
          class="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8"
        >
          <div class="flex items-start justify-between gap-4">
            <UBadge
              color="primary"
              variant="subtle"
              :label="event.status === 'running' ? 'In corso' : 'In programma'"
            />
            <UBadge
              v-if="bookingFor(event.id)"
              color="success"
              variant="subtle"
              :label="formatBookingStatus(bookingFor(event.id)!.status)"
            />
          </div>
          <h2 class="font-display mt-8 text-2xl font-semibold text-white">
            {{ event.title }}
          </h2>
          <p
            v-if="event.short_description"
            class="mt-3 text-sm leading-6 text-white/60"
          >
            {{ event.short_description }}
          </p>
          <div class="mt-6 space-y-2 text-sm text-white/50">
            <p v-if="event.starts_at">
              {{ formatPublicEventDate(event.starts_at, event.ends_at) }}
            </p>
            <p v-if="event.venue_name">{{ event.venue_name }}</p>
            <p>
              {{
                formatPublicEventPrice(
                  event.price_cents,
                  event.payment_required,
                )
              }}
            </p>
          </div>
          <div class="mt-7 flex flex-wrap gap-3">
            <UButton
              v-if="bookingFor(event.id)"
              :to="`/app/prenotazioni/${bookingFor(event.id)!.id}`"
              color="secondary"
              variant="soft"
              label="Apri prenotazione"
            />
            <UButton
              v-if="event.slug"
              :to="`/eventi/${event.slug}`"
              color="neutral"
              variant="outline"
              label="Dettagli evento"
            />
          </div>
        </article>
      </div>
    </div>
  </main>
</template>
