<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { VrsusRole } from '~/composables/useVrsusAuth'
import { getBookingErrorCode } from '~/composables/useBookings'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['staff', 'admin', 'super_admin'] satisfies VrsusRole[],
})

const client = useSupabaseClient<Database>()
const config = useRuntimeConfig()
const video = ref<HTMLVideoElement | null>(null)
const tokenInput = ref('')
const paymentStatus = ref('unpaid')
const pending = ref(false)
const scannerPending = ref(false)
const result = ref<
  Database['public']['Functions']['check_in_booking']['Returns'][number] | null
>(null)
const errorMessage = ref('')
let scannerControls: { stop: () => void } | undefined

useSeoMeta({
  title: 'Check-in â€” VRSUS',
  robots: 'noindex, nofollow',
})

function extractToken(value: string) {
  const raw = value.trim()
  if (!raw) return ''

  try {
    const url = new URL(raw, config.public.appBaseUrl)
    const marker = '/checkin/'
    const markerIndex = url.pathname.indexOf(marker)
    if (markerIndex >= 0) {
      return decodeURIComponent(url.pathname.slice(markerIndex + marker.length))
    }
  } catch {
    // Treat non-URL input as a raw opaque token.
  }

  return raw
}

async function checkIn() {
  const token = extractToken(tokenInput.value)
  if (!token) {
    errorMessage.value = 'Inserisci o scansiona un codice valido.'
    return
  }

  pending.value = true
  errorMessage.value = ''
  result.value = null

  const { data, error } = await client.rpc('check_in_booking', {
    p_qr_token: token,
    p_payment_status: paymentStatus.value,
  })

  if (error) {
    const messages: Record<string, string> = {
      QR_INVALID: 'QR non valido o revocato.',
      BOOKING_NOT_CONFIRMED: 'La prenotazione non è confermata.',
      ALREADY_CHECKED_IN: 'Questa prenotazione è già stata registrata.',
      PAYMENT_STATUS_INVALID: 'Stato pagamento non valido.',
    }
    errorMessage.value =
      messages[getBookingErrorCode(error)] ?? 'Check-in non riuscito.'
  } else {
    result.value = data?.[0] ?? null
    tokenInput.value = ''
  }

  pending.value = false
}

async function startScanner() {
  if (!video.value || scannerPending.value) return
  scannerPending.value = true
  errorMessage.value = ''

  try {
    const { BrowserQRCodeReader } = await import('@zxing/browser')
    const reader = new BrowserQRCodeReader()
    scannerControls = await reader.decodeFromVideoDevice(
      undefined,
      video.value,
      (scanResult) => {
        if (!scanResult) return
        tokenInput.value = scanResult.getText()
        void checkIn()
        scannerControls?.stop()
        scannerControls = undefined
      },
    )
  } catch {
    errorMessage.value =
      'Impossibile aprire la fotocamera. Usa il codice manuale.'
  } finally {
    scannerPending.value = false
  }
}

onBeforeUnmount(() => scannerControls?.stop())
</script>

<template>
  <main
    class="mx-auto min-h-[calc(100vh-9rem)] max-w-3xl px-5 py-12 sm:px-8 lg:py-20"
  >
    <div
      class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <p
          class="text-brand-blue-300 text-xs font-semibold tracking-[0.24em] uppercase"
        >
          Ingresso evento
        </p>
        <h1 class="font-display mt-3 text-4xl font-semibold text-white">
          Check-in VRSUS.
        </h1>
        <p class="mt-3 max-w-xl text-sm leading-6 text-white/55">
          Scansiona il QR oppure inserisci il codice manualmente. Il pagamento
          resta registrabile sul posto.
        </p>
      </div>
      <UButton
        to="/app"
        color="neutral"
        variant="outline"
        label="Area personale"
      />
    </div>

    <div class="mt-10 grid gap-6 md:grid-cols-[1.05fr_0.95fr]">
      <UCard class="border border-white/10 bg-white/[0.04]">
        <div
          class="overflow-hidden rounded-2xl border border-white/10 bg-black"
        >
          <video
            ref="video"
            class="aspect-video w-full object-cover"
            muted
            playsinline
            aria-label="Fotocamera per scansione QR"
          />
        </div>
        <UButton
          class="mt-4"
          block
          :loading="scannerPending"
          label="Apri fotocamera e scansiona"
          @click="startScanner"
        />
        <p class="mt-3 text-center text-xs leading-5 text-white/40">
          La fotocamera viene attivata solo dopo la tua azione.
        </p>
      </UCard>

      <UCard class="border border-white/10 bg-white/[0.04]">
        <form class="space-y-5" @submit.prevent="checkIn">
          <UFormField label="Codice o URL QR" name="token">
            <UInput
              v-model="tokenInput"
              autocomplete="off"
              placeholder="Incolla il codice"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Pagamento" name="paymentStatus">
            <select v-model="paymentStatus" class="vrsus-select w-full">
              <option value="unpaid">Da registrare</option>
              <option value="paid_on_site">Pagato sul posto</option>
              <option value="complimentary">Omaggio</option>
              <option value="not_required">Non richiesto</option>
            </select>
          </UFormField>
          <UAlert
            v-if="errorMessage"
            color="error"
            variant="subtle"
            title="Check-in non riuscito"
            :description="errorMessage"
          />
          <UButton
            type="submit"
            block
            size="lg"
            :loading="pending"
            label="Conferma check-in"
          />
        </form>
      </UCard>
    </div>

    <UAlert
      v-if="result"
      class="mt-6"
      color="success"
      variant="subtle"
      title="Check-in completato"
      :description="`${result.event_title} · Pagamento: ${result.payment_status}`"
    />
  </main>
</template>
