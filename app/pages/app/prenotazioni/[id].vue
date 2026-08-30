<script setup lang="ts">
import {
  cancelEventBooking,
  formatBookingStatus,
  formatPaymentStatus,
  getBookingErrorCode,
  getMyBookingQr,
  type BookingQr,
  type MyBooking,
} from '~/composables/useBookings'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const bookingId = String(route.params.id)
const client = useSupabaseClient()
const config = useRuntimeConfig()
const booking = ref<MyBooking | null>(null)
const qr = ref<BookingQr | null>(null)
const qrImage = ref('')
const pending = ref(true)
const cancelPending = ref(false)
const errorMessage = ref('')
const cancelMessage = ref('')

useSeoMeta({
  title: 'Prenotazione â€” VRSUS',
  robots: 'noindex, nofollow',
})

async function loadBooking() {
  pending.value = true
  errorMessage.value = ''
  qr.value = null
  qrImage.value = ''

  const { data, error } = await client.rpc('get_my_bookings')
  if (error) {
    errorMessage.value = 'Non è stato possibile caricare la prenotazione.'
    pending.value = false
    return
  }

  booking.value = (data ?? []).find((item) => item.id === bookingId) ?? null

  if (!booking.value) {
    errorMessage.value = 'Prenotazione non trovata o non disponibile.'
    pending.value = false
    return
  }

  if (booking.value.status === 'confirmed') {
    try {
      qr.value = await getMyBookingQr(bookingId)
      if (qr.value?.qr_token) {
        const { default: QRCode } = await import('qrcode')
        qrImage.value = await QRCode.toDataURL(
          `${config.public.appBaseUrl}/checkin/${qr.value.qr_token}`,
          {
            margin: 2,
            width: 360,
            color: { dark: '#08090d', light: '#ffffff' },
          },
        )
      }
    } catch (error) {
      errorMessage.value =
        getBookingErrorCode(error) === 'BOOKING_NOT_CONFIRMED'
          ? 'Il QR sarà disponibile quando la prenotazione sarà confermata.'
          : 'Non è stato possibile generare il QR.'
    }
  }

  pending.value = false
}

async function cancelBooking() {
  if (!booking.value || booking.value.status === 'cancelled') return
  cancelPending.value = true
  cancelMessage.value = ''

  try {
    await cancelEventBooking(booking.value.id)
    cancelMessage.value = 'Prenotazione annullata.'
    await loadBooking()
  } catch (error) {
    cancelMessage.value =
      getBookingErrorCode(error) === 'BOOKING_NOT_CANCELLABLE'
        ? 'Questa prenotazione non può più essere annullata.'
        : 'Non è stato possibile annullare la prenotazione.'
  } finally {
    cancelPending.value = false
  }
}

await loadBooking()
</script>

<template>
  <main
    class="mx-auto min-h-[calc(100vh-9rem)] max-w-4xl px-5 py-16 sm:px-8 lg:py-24"
  >
    <NuxtLink to="/app" class="text-sm text-white/55 hover:text-white">
      <UIcon name="i-lucide-arrow-left" class="mr-1 inline size-4" />
      Area personale
    </NuxtLink>

    <div v-if="pending" class="mt-10 space-y-4">
      <div class="h-10 w-2/3 animate-pulse rounded bg-white/10" />
      <div class="h-48 animate-pulse rounded-3xl bg-white/[0.04]" />
    </div>

    <UAlert
      v-else-if="errorMessage && !booking"
      class="mt-10"
      color="error"
      variant="subtle"
      title="Prenotazione non disponibile"
      :description="errorMessage"
    />

    <section v-else-if="booking" class="mt-10 space-y-6">
      <header>
        <p
          class="text-brand-blue-400 text-xs font-semibold tracking-[0.24em] uppercase"
        >
          La tua prenotazione
        </p>
        <h1
          class="font-display mt-3 text-4xl font-semibold text-white sm:text-5xl"
        >
          {{ qr?.event_title ?? 'Evento VRSUS'
          }}<span class="text-brand-red-500">.</span>
        </h1>
        <p class="mt-3 text-white/55">
          Stato:
          <strong class="text-white">{{
            formatBookingStatus(booking.status)
          }}</strong>
        </p>
      </header>

      <UAlert
        v-if="errorMessage"
        color="warning"
        variant="subtle"
        :description="errorMessage"
      />
      <UAlert
        v-if="cancelMessage"
        color="secondary"
        variant="subtle"
        :description="cancelMessage"
      />

      <div class="grid gap-6 md:grid-cols-[1fr_260px]">
        <UCard class="border border-white/10 bg-white/[0.04]">
          <div class="grid gap-5 sm:grid-cols-2">
            <div>
              <p class="text-xs tracking-[0.16em] text-white/40 uppercase">
                Pagamento
              </p>
              <p class="mt-2 font-medium text-white">
                {{ formatPaymentStatus(booking.payment_status) }}
              </p>
            </div>
            <div>
              <p class="text-xs tracking-[0.16em] text-white/40 uppercase">
                Codice prenotazione
              </p>
              <p class="mt-2 truncate font-mono text-sm text-white/75">
                {{ booking.id }}
              </p>
            </div>
          </div>

          <div
            v-if="booking.status === 'waitlisted'"
            class="border-brand-blue-400/25 bg-brand-blue-400/10 mt-8 rounded-2xl border p-5 text-sm leading-6 text-blue-100"
          >
            Sei in lista d’attesa. Se si libera un posto, la prenotazione verrà
            promossa automaticamente e riceverai una notifica nell’app.
          </div>
          <div
            v-else-if="booking.checked_in_at"
            class="mt-8 rounded-2xl border border-green-400/25 bg-green-400/10 p-5 text-sm leading-6 text-green-100"
          >
            Check-in completato. Ti aspettiamo all’evento.
          </div>

          <UButton
            v-if="
              booking.status === 'confirmed' || booking.status === 'waitlisted'
            "
            class="mt-8"
            color="neutral"
            variant="outline"
            :loading="cancelPending"
            label="Annulla prenotazione"
            @click="cancelBooking"
          />
        </UCard>

        <UCard
          v-if="qrImage"
          class="border border-white/10 bg-white p-4 text-center"
        >
          <img
            :src="qrImage"
            alt="QR della prenotazione"
            class="mx-auto aspect-square w-full max-w-[220px]"
          />
          <p
            class="mt-3 text-xs font-semibold tracking-[0.14em] text-black/60 uppercase"
          >
            Mostralo all’ingresso
          </p>
        </UCard>
      </div>
    </section>
  </main>
</template>
