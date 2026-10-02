<script setup lang="ts">
import { formatPublicEventPrice } from '~/composables/usePublicEvents'
import {
  cancelEventBooking,
  formatBookingStatus,
  getBookingErrorCode,
  getMyBookingDisplay,
  getMyBookingQr,
  getMyBookingTournaments,
  type BookingDisplay,
  type BookingQr,
  type BookingTournament,
  type MyBooking,
} from '~/composables/useBookings'

definePageMeta({ layout: 'app', middleware: ['auth'] })

const route = useRoute()
const bookingId = String(route.params.id)
const client = useSupabaseClient()
const config = useRuntimeConfig()
const booking = ref<MyBooking | null>(null)
const display = ref<BookingDisplay | null>(null)
const qr = ref<BookingQr | null>(null)
const qrImage = ref('')
const pending = ref(true)
const errorMessage = ref('')
const cancelMessage = ref('')
const askCancel = ref(false)
const cancelPending = ref(false)
const impactLoading = ref(false)
const impactError = ref('')
const affectedTournaments = ref<BookingTournament[]>([])
const qrFullscreen = ref(false)

const canCancel = computed(
  () =>
    booking.value?.status === 'confirmed' ||
    booking.value?.status === 'waitlisted',
)
const priceLabel = computed(() =>
  formatPublicEventPrice(
    display.value?.price_cents ?? null,
    display.value?.payment_required ?? null,
  ),
)
const paymentLabel = computed(() => {
  if (!display.value) return 'Da verificare'
  if (display.value?.payment_required === false) return 'Non richiesto'
  switch (booking.value?.payment_status) {
    case 'paid_on_site':
      return 'Pagato sul posto'
    case 'complimentary':
      return 'Omaggio'
    case 'not_required':
      return 'Non richiesto'
    default:
      return 'Da pagare sul posto'
  }
})

useSeoMeta({ title: 'Biglietto — VRSUS', robots: 'noindex, nofollow' })

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

  try {
    display.value = await getMyBookingDisplay(bookingId)
    if (booking.value.status === 'confirmed') {
      qr.value = await getMyBookingQr(bookingId)
      if (qr.value?.qr_token) {
        const { default: QRCode } = await import('qrcode')
        qrImage.value = await QRCode.toDataURL(
          `${config.public.appBaseUrl}/checkin/${qr.value.qr_token}`,
          {
            margin: 2,
            width: 480,
            color: { dark: '#08090d', light: '#ffffff' },
          },
        )
      }
    }
  } catch (loadError) {
    errorMessage.value =
      getBookingErrorCode(loadError) === 'BOOKING_NOT_CONFIRMED'
        ? 'Il QR sarà disponibile quando il posto sarà confermato.'
        : 'Alcuni dettagli del biglietto non sono disponibili. Riprova fra poco.'
  } finally {
    pending.value = false
  }
}

async function openCancelSheet() {
  if (!canCancel.value) return
  askCancel.value = true
  impactLoading.value = true
  impactError.value = ''
  affectedTournaments.value = []
  try {
    affectedTournaments.value = await getMyBookingTournaments(bookingId)
  } catch {
    impactError.value =
      'Non riesco a verificare i tornei collegati. Riprova fra poco.'
  } finally {
    impactLoading.value = false
  }
}

async function confirmCancel() {
  if (!canCancel.value || impactLoading.value || impactError.value) return
  cancelPending.value = true
  cancelMessage.value = ''
  try {
    await cancelEventBooking(bookingId)
    askCancel.value = false
    qrFullscreen.value = false
    cancelMessage.value = 'Prenotazione e iscrizioni ai tornei annullate.'
    await loadBooking()
    await refreshNuxtData('my-bookings')
  } catch (cancelError) {
    const code = getBookingErrorCode(cancelError)
    cancelMessage.value =
      code === 'TOURNAMENT_ALREADY_STARTED' ||
      code === 'BRACKET_STARTED' ||
      code === 'TOURNAMENT_STARTED'
        ? 'Un torneo è già iniziato: chiedi al personale di gestire la rinuncia.'
        : code === 'BOOKING_NOT_CANCELLABLE'
          ? 'Questa prenotazione non può più essere annullata.'
          : 'Non è stato possibile annullare la prenotazione. Nessuna iscrizione è stata modificata.'
    askCancel.value = false
  } finally {
    cancelPending.value = false
  }
}

usePageActions(
  computed(() =>
    canCancel.value
      ? [
          {
            label: 'Annulla prenotazione',
            color: 'error' as const,
            onClick: openCancelSheet,
          },
        ]
      : [],
  ),
)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') qrFullscreen.value = false
}
watch(qrFullscreen, (value) => {
  if (import.meta.server) return
  if (value) window.addEventListener('keydown', onKeydown)
  else window.removeEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  if (!import.meta.server) window.removeEventListener('keydown', onKeydown)
})

await loadBooking()
</script>

<template>
  <div class="text-white">
    <div class="mx-auto flex w-full max-w-lg flex-col gap-3 py-2 sm:py-8">
      <div class="flex items-center justify-between gap-3">
        <NuxtLink
          to="/app/eventi"
          class="inline-flex min-h-9 items-center gap-1 text-sm text-white/60 hover:text-white"
        >
          <UIcon name="i-lucide-arrow-left" class="size-4" /> Eventi
        </NuxtLink>
        <span
          class="text-brand-blue-300 text-[11px] font-semibold tracking-[0.18em] uppercase"
          >Il tuo biglietto</span
        >
      </div>

      <div
        v-if="pending"
        class="grid flex-1 place-items-center text-sm text-white/55"
      >
        Caricamento biglietto…
      </div>
      <UAlert
        v-else-if="!booking"
        color="error"
        variant="subtle"
        title="Biglietto non disponibile"
        :description="errorMessage"
      />

      <template v-else>
        <h1
          class="font-display line-clamp-2 text-center text-xl leading-tight font-semibold sm:text-2xl"
        >
          {{ display?.event_title ?? qr?.event_title ?? 'Evento VRSUS' }}
        </h1>

        <button
          v-if="qrImage"
          type="button"
          class="focus-visible:outline-brand-blue-300 mx-auto rounded-2xl bg-white p-2 shadow-[0_0_32px_rgb(255_255_255/14%)] focus-visible:outline-2"
          aria-label="Apri QR a schermo intero"
          @click="qrFullscreen = true"
        >
          <img
            :src="qrImage"
            alt="QR del biglietto"
            class="block aspect-square object-contain"
            style="width: min(55vw, 32dvh, 240px)"
          />
        </button>
        <div
          v-else
          class="mx-auto grid size-[min(55vw,32dvh,240px)] place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-center"
        >
          <div>
            <UIcon
              :name="
                booking.status === 'waitlisted'
                  ? 'i-lucide-hourglass'
                  : 'i-lucide-ticket-x'
              "
              class="mx-auto size-10 text-white/45"
            />
            <p class="mt-2 px-3 text-xs text-white/55">
              {{
                booking.status === 'waitlisted'
                  ? 'QR disponibile dopo la conferma'
                  : booking.status === 'confirmed'
                    ? 'QR temporaneamente non disponibile'
                    : 'Biglietto non attivo'
              }}
            </p>
          </div>
        </div>

        <p v-if="qrImage" class="text-center text-xs text-white/40">
          Tocca il QR per ingrandirlo
        </p>

        <div
          class="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm"
        >
          <div>
            <p class="text-[11px] text-white/45">Stato</p>
            <p
              class="mt-0.5 font-semibold"
              :class="
                booking.status === 'confirmed'
                  ? 'text-emerald-300'
                  : 'text-amber-200'
              "
            >
              {{ formatBookingStatus(booking.status) }}
            </p>
          </div>
          <div>
            <p class="text-[11px] text-white/45">Ingresso</p>
            <p class="mt-0.5 font-semibold text-white">{{ priceLabel }}</p>
          </div>
          <div class="col-span-2 border-t border-white/10 pt-2">
            <p class="text-[11px] text-white/45">Pagamento</p>
            <p class="mt-0.5 font-medium text-white/85">{{ paymentLabel }}</p>
          </div>
        </div>

        <UAlert
          v-if="errorMessage"
          color="warning"
          variant="subtle"
          :description="errorMessage"
        />
        <UAlert
          v-if="cancelMessage"
          color="info"
          variant="subtle"
          :description="cancelMessage"
        />
      </template>
    </div>

    <UiVrsusBottomSheet
      v-model="askCancel"
      title="Annullare la prenotazione?"
      description="Il tuo posto all’evento verrà liberato. Questa azione non si può annullare."
      :pending="cancelPending"
    >
      <div class="space-y-4">
        <p v-if="impactLoading" class="text-sm text-white/55">
          Controllo i tornei collegati…
        </p>
        <UAlert
          v-else-if="impactError"
          color="error"
          variant="subtle"
          :description="impactError"
        />
        <div
          v-else-if="affectedTournaments.length"
          class="rounded-xl border border-amber-400/25 bg-amber-400/[0.08] p-3 text-sm text-amber-100"
        >
          <p class="font-semibold">Rinunci anche a questi tornei:</p>
          <ul class="mt-2 list-inside list-disc space-y-1">
            <li
              v-for="tournament in affectedTournaments"
              :key="tournament.tournament_id"
            >
              {{ tournament.tournament_name }}
            </li>
          </ul>
        </div>
        <p v-else class="text-sm text-white/55">
          Non risultano tornei collegati a questa prenotazione.
        </p>
        <div class="grid grid-cols-2 gap-2">
          <UButton
            color="neutral"
            variant="outline"
            size="lg"
            class="justify-center"
            label="Torna al biglietto"
            :disabled="cancelPending"
            @click="askCancel = false"
          />
          <UButton
            color="error"
            size="lg"
            class="justify-center"
            label="Sì, rinuncio"
            :loading="cancelPending"
            :disabled="impactLoading || Boolean(impactError)"
            @click="confirmCancel"
          />
        </div>
      </div>
    </UiVrsusBottomSheet>

    <Teleport to="body">
      <div
        v-if="qrFullscreen && qrImage"
        role="dialog"
        aria-modal="true"
        aria-label="QR del biglietto ingrandito"
        class="fixed inset-0 z-[70] flex flex-col items-center justify-between bg-[#08090d] px-5 text-white"
        style="
          padding-top: max(1rem, env(safe-area-inset-top));
          padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
        "
      >
        <button
          type="button"
          class="self-end rounded-full bg-white/10 p-3"
          aria-label="Chiudi QR ingrandito"
          @click="qrFullscreen = false"
        >
          <UIcon name="i-lucide-x" class="size-5" />
        </button>
        <img
          :src="qrImage"
          alt="QR del biglietto ingrandito"
          class="max-h-[65dvh] w-[min(85vw,460px)] rounded-2xl bg-white object-contain p-3"
        />
        <div class="text-center">
          <p class="text-xs tracking-[0.14em] text-white/45 uppercase">
            Codice prenotazione
          </p>
          <p
            class="mt-2 font-mono text-base font-semibold tracking-wider break-all text-white"
          >
            {{ bookingId }}
          </p>
        </div>
      </div>
    </Teleport>
  </div>
</template>
