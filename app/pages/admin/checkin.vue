<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { VrsusRole } from '~/composables/useVrsusAuth'
import { getBookingErrorCode } from '~/composables/useBookings'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
  requiredRoles: ['staff', 'admin'] satisfies VrsusRole[],
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

// Tessera ARCI: alla porta si vede subito se la giornata la richiede e se il
// socio ce l ha. Se manca, la si registra da qui appena la mostra.
const arciPending = ref(false)
const arciError = ref('')

async function registerArciCard() {
  const userId = result.value?.user_id
  if (!userId) return

  arciPending.value = true
  arciError.value = ''

  const { error } = await client.rpc('set_arci_card', {
    p_user_id: userId,
    p_valid: true,
  })

  arciPending.value = false

  if (error) {
    arciError.value = 'Non e stato possibile registrare la tessera.'
    return
  }

  if (result.value) result.value = { ...result.value, arci_card_valid: true }
}

useSeoMeta({
  title: 'Check-in — VRSUS',
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
  arciError.value = ''
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

usePageActions(
  computed(() => [
    {
      label: 'Scansiona QR',
      icon: 'i-lucide-camera',
      onClick: startScanner,
      loading: scannerPending.value,
    },
    {
      label: 'Conferma check-in',
      icon: 'i-lucide-check',
      color: 'primary' as const,
      onClick: checkIn,
      loading: pending.value,
      disabled: !extractToken(tokenInput.value) || pending.value,
    },
  ]),
)
</script>

<template>
  <div>
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
        </form>
      </UCard>
    </div>

    <template v-if="result">
      <UAlert
        class="mt-6"
        color="success"
        variant="subtle"
        title="Check-in completato"
        :description="`${result.event_title} · Pagamento: ${result.payment_status}`"
      />

      <!--
        La tessera e il secondo controllo della porta: senza, per le serate
        pubbliche la persona non puo entrare finche non la fa.
      -->
      <div
        v-if="result.arci_required"
        class="mt-4 flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between"
        :class="
          result.arci_card_valid
            ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
            : 'border-amber-500/40 bg-amber-500/[0.07]'
        "
      >
        <div class="flex items-start gap-3">
          <UIcon
            name="i-lucide-id-card"
            class="mt-0.5 size-5 shrink-0"
            :class="
              result.arci_card_valid ? 'text-emerald-300' : 'text-amber-300'
            "
          />
          <div>
            <p class="font-medium text-white">
              {{
                result.arci_card_valid
                  ? 'Tessera ARCI valida'
                  : 'Tessera ARCI mancante'
              }}
            </p>
            <p class="mt-1 text-sm text-white/55">
              {{
                result.arci_card_valid
                  ? 'Il socio risulta tesserato per la stagione in corso.'
                  : 'Questa giornata richiede la tessera. Registrala quando la persona la mostra.'
              }}
            </p>
            <p v-if="arciError" class="mt-2 text-sm text-red-300">
              {{ arciError }}
            </p>
          </div>
        </div>
        <UButton
          v-if="!result.arci_card_valid"
          color="primary"
          size="lg"
          class="shrink-0"
          :loading="arciPending"
          label="Tessera vista"
          @click="registerArciCard"
        />
      </div>

      <p v-else class="mt-4 text-sm text-white/40">
        Questa giornata non richiede la tessera ARCI.
      </p>
    </template>
  </div>
</template>
