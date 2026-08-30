<script setup lang="ts">
import {
  createEventBooking,
  getBookingErrorCode,
} from '~/composables/useBookings'

const props = defineProps<{
  eventId: string
  eventSlug: string
  bookingEnabled: boolean | null
  bookingOpensAt: string | null
  bookingClosesAt: string | null
}>()

const user = useSupabaseUser()
const pending = ref(false)
const errorMessage = ref('')

const bookingAvailable = computed(() => {
  if (!props.bookingEnabled) return false
  const now = Date.now()
  const opensAt = props.bookingOpensAt
    ? new Date(props.bookingOpensAt).getTime()
    : null
  const closesAt = props.bookingClosesAt
    ? new Date(props.bookingClosesAt).getTime()
    : null

  return (
    (opensAt === null || now >= opensAt) &&
    (closesAt === null || now <= closesAt)
  )
})

function redirectToLogin() {
  return navigateTo({
    path: '/login',
    query: { redirect: `/eventi/${props.eventSlug}` },
  })
}

function humanizeError(error: unknown) {
  const messages: Record<string, string> = {
    EVENT_NOT_BOOKABLE: 'Questo evento non accetta prenotazioni.',
    BOOKING_NOT_OPEN: 'Le prenotazioni non sono aperte in questo momento.',
    ALREADY_BOOKED: 'Hai già una prenotazione attiva per questo evento.',
    EVENT_FULL: 'L’evento è completo e la lista d’attesa non è attiva.',
    WAITLIST_DISABLED: 'L’evento è completo e la lista d’attesa non è attiva.',
  }

  return (
    messages[getBookingErrorCode(error)] ??
    'Non è stato possibile prenotare. Riprova.'
  )
}

async function book() {
  if (!user.value) {
    await redirectToLogin()
    return
  }

  pending.value = true
  errorMessage.value = ''

  try {
    const booking = await createEventBooking(props.eventId)
    await navigateTo(`/app/prenotazioni/${booking.booking_id}`)
  } catch (error) {
    errorMessage.value = humanizeError(error)
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="space-y-3">
    <UButton
      color="primary"
      size="lg"
      :loading="pending"
      :disabled="!bookingAvailable"
      trailing-icon="i-lucide-arrow-right"
      :label="bookingAvailable ? 'Prenota il tuo posto' : 'Prenotazioni chiuse'"
      @click="book"
    />
    <p v-if="errorMessage" class="max-w-sm text-sm leading-6 text-red-200">
      {{ errorMessage }}
    </p>
  </div>
</template>
