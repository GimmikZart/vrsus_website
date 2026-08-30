<script setup lang="ts">
import {
  getBookingErrorCode,
  markBookingNoShow,
} from '~/composables/useBookings'
import type { VrsusRole } from '~/composables/useVrsusAuth'

type LiveBooking = {
  id: string
  status: string
  payment_status: string
  checked_in_at: string | null
  created_at: string
  display_name: string
}

type LiveResponse = {
  events: {
    id: string
    title: string
    starts_at: string
    status: string
    max_capacity: number | null
  }[]
  selectedEvent: {
    id: string
    title: string
    starts_at: string
    status: string
    max_capacity: number | null
  } | null
  bookings: LiveBooking[]
  metrics: {
    confirmed: number
    waitlisted: number
    checkedIn: number
    paid: number
  } | null
}

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['staff', 'admin', 'super_admin'] satisfies VrsusRole[],
})

const route = useRoute()
const selectedEventId = ref(
  typeof route.query.eventId === 'string' ? route.query.eventId : '',
)
const refreshing = ref(false)
const noShowPending = ref<string | null>(null)
const noShowMessage = ref('')
const { data, error, refresh } = await useFetch<LiveResponse>(
  '/api/admin/live',
  {
    query: computed(() => ({ eventId: selectedEventId.value || undefined })),
    watch: false,
  },
)

useSeoMeta({ title: 'Live evento â€” VRSUS', robots: 'noindex, nofollow' })

async function selectEvent() {
  await refresh()
}

async function refreshLive() {
  refreshing.value = true
  await refresh()
  refreshing.value = false
}

function statusLabel(status: string) {
  return status === 'waitlisted'
    ? 'Lista d’attesa'
    : status === 'confirmed'
      ? 'Confermata'
      : status
}

async function markNoShow(bookingId: string) {
  noShowPending.value = bookingId
  noShowMessage.value = ''

  try {
    await markBookingNoShow(bookingId)
    noShowMessage.value = 'Prenotazione registrata come non presentata.'
    await refresh()
  } catch (error) {
    const code = getBookingErrorCode(error)
    noShowMessage.value =
      code === 'EVENT_NOT_CLOSED'
        ? 'Il non-show è disponibile durante o dopo l’evento.'
        : code === 'BOOKING_NOT_MARKABLE'
          ? 'La prenotazione è già stata gestita o il partecipante è presente.'
          : 'Non è stato possibile aggiornare la prenotazione.'
  } finally {
    noShowPending.value = null
  }
}
</script>

<template>
  <main
    class="mx-auto min-h-[calc(100vh-9rem)] max-w-7xl px-5 py-12 sm:px-8 lg:py-20"
  >
    <div
      class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <p
          class="text-brand-blue-300 text-xs font-semibold tracking-[0.24em] uppercase"
        >
          Operazioni
        </p>
        <h1 class="font-display mt-3 text-4xl font-semibold text-white">
          Live evento.
        </h1>
        <p class="mt-3 text-sm text-white/55">
          Conteggi operativi e prenotazioni. Questi dati non sono esposti al
          sito pubblico.
        </p>
      </div>
      <div class="flex gap-2">
        <UButton
          to="/admin/checkin"
          color="primary"
          variant="soft"
          label="Apri check-in"
        />
        <UButton
          :loading="refreshing"
          color="neutral"
          variant="outline"
          label="Aggiorna"
          @click="refreshLive"
        />
      </div>
    </div>

    <UAlert
      v-if="error"
      class="mt-8"
      color="error"
      variant="subtle"
      title="Dati live non disponibili"
      description="Riprova tra poco."
    />
    <UAlert
      v-if="noShowMessage"
      class="mt-8"
      color="secondary"
      variant="subtle"
      :description="noShowMessage"
    />

    <template v-else-if="data">
      <div
        class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <label class="text-sm text-white/55" for="live-event">Evento</label>
        <select
          id="live-event"
          v-model="selectedEventId"
          class="vrsus-select w-full sm:max-w-md"
          @change="selectEvent"
        >
          <option
            v-for="event in data.events"
            :key="event.id"
            :value="event.id"
          >
            {{ event.title }}
          </option>
        </select>
      </div>

      <div
        v-if="data.selectedEvent && data.metrics"
        class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <UCard
          v-for="metric in [
            {
              label: 'Confermati',
              value: data.metrics.confirmed,
              icon: 'i-lucide-ticket-check',
            },
            {
              label: 'Presenti',
              value: data.metrics.checkedIn,
              icon: 'i-lucide-log-in',
            },
            {
              label: 'Pagamenti',
              value: data.metrics.paid,
              icon: 'i-lucide-wallet-cards',
            },
            {
              label: 'Waiting list',
              value: data.metrics.waitlisted,
              icon: 'i-lucide-hourglass',
            },
          ]"
          :key="metric.label"
          class="border border-white/10 bg-white/[0.04]"
        >
          <UIcon :name="metric.icon" class="text-brand-blue-300 size-5" />
          <p class="mt-4 text-sm text-white/45">{{ metric.label }}</p>
          <p class="font-display mt-1 text-3xl font-semibold text-white">
            {{ metric.value }}
          </p>
        </UCard>
      </div>

      <section
        v-if="data.selectedEvent"
        class="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]"
      >
        <div class="border-b border-white/10 px-5 py-5 sm:px-6">
          <h2 class="font-display text-xl font-semibold text-white">
            Prenotazioni
          </h2>
          <p class="mt-1 text-sm text-white/45">
            {{ data.selectedEvent.title }}
          </p>
        </div>
        <div v-if="data.bookings.length" class="divide-y divide-white/10">
          <div
            v-for="booking in data.bookings"
            :key="booking.id"
            class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
          >
            <div>
              <p class="font-medium text-white">{{ booking.display_name }}</p>
              <p class="mt-1 font-mono text-xs text-white/35">
                {{ booking.id }}
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2 text-xs">
              <UBadge
                :color="
                  booking.status === 'confirmed' ? 'success' : 'secondary'
                "
                variant="subtle"
                :label="statusLabel(booking.status)"
              />
              <UBadge
                :color="
                  booking.payment_status === 'unpaid' ? 'warning' : 'success'
                "
                variant="subtle"
                :label="booking.payment_status"
              />
              <UBadge
                v-if="booking.checked_in_at"
                color="primary"
                variant="subtle"
                label="Presente"
              />
              <UButton
                v-if="booking.status === 'confirmed' && !booking.checked_in_at"
                size="xs"
                color="neutral"
                variant="outline"
                :loading="noShowPending === booking.id"
                label="Non presentato"
                @click="markNoShow(booking.id)"
              />
            </div>
          </div>
        </div>
        <p v-else class="px-5 py-8 text-sm text-white/45 sm:px-6">
          Nessuna prenotazione per questo evento.
        </p>
      </section>
    </template>
  </main>
</template>
