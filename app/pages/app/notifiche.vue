<script setup lang="ts">
definePageMeta({
  layout: 'app',
  middleware: ['auth'],
})

const {
  data: notifications,
  status,
  error,
  refresh,
} = await useMyNotifications()
const push = usePushNotifications()
const pushPending = push.pending
const pushConfigured = push.configured
const pushEnabled = push.enabledOnThisDevice
const pending = ref<string | null>(null)
const allPending = ref(false)
const pushMessage = ref('')
const actualOrigin = ref('')
const configuredOrigin = computed(() => {
  try {
    return new URL(String(useRuntimeConfig().public.appBaseUrl)).origin
  } catch {
    return 'non valida'
  }
})
const originNotice = computed(() =>
  actualOrigin.value && configuredOrigin.value !== actualOrigin.value
    ? `La pagina è su ${actualOrigin.value}, mentre APP_BASE_URL è ${configuredOrigin.value}. Le push si possono attivare, ma i link nelle notifiche potrebbero aprire il dominio sbagliato: correggi la variabile nell’ambiente Cloudflare di questo deploy.`
    : '',
)
const { refresh: refreshUnreadCount } = useUnreadNotificationCount()

onMounted(() => {
  actualOrigin.value = window.location.origin
  void push.refreshDeviceStatus()
})

const unread = computed(() =>
  (notifications.value ?? []).filter((item) => !item.read_at),
)

async function markRead(notification: UserNotification) {
  if (notification.read_at) return
  pending.value = notification.id
  try {
    await markNotificationRead(notification.id)
    await Promise.all([refresh(), refreshUnreadCount()])
  } finally {
    pending.value = null
  }
}

async function markAllRead() {
  allPending.value = true
  try {
    await markAllNotificationsRead(unread.value.map((item) => item.id))
    await Promise.all([refresh(), refreshUnreadCount()])
  } finally {
    allPending.value = false
  }
}

async function enablePush() {
  pushMessage.value = ''
  try {
    await push.enable()
    pushMessage.value = 'Notifiche push abilitate su questo dispositivo.'
  } catch (caughtError) {
    window.reportError?.(caughtError)
    const code = String((caughtError as { message?: string }).message ?? '')
    const errors: Record<string, string> = {
      PUSH_NOT_CONFIGURED: 'App ID OneSignal non configurato.',
      AUTH_REQUIRED: 'Accedi di nuovo e riprova.',
      PUSH_UNSUPPORTED_BROWSER:
        'Questo browser non supporta le push web. Prova da Chrome o Edge su HTTPS.',
      PUSH_PERMISSION_DENIED:
        'Le notifiche sono bloccate nelle impostazioni del browser. Consenti le notifiche per questo sito e riprova.',
      PUSH_PERMISSION_NOT_GRANTED:
        'Permesso notifiche non concesso. Consenti la richiesta del browser e riprova.',
      PUSH_PERMISSION_REQUEST_FAILED:
        'Il browser non è riuscito a chiedere il permesso notifiche. Controlla le impostazioni del sito.',
      PUSH_SDK_LOAD_FAILED:
        'Il browser non riesce a caricare OneSignal. Controlla connessione, blocchi contenuti ed estensioni.',
      PUSH_SDK_INIT_FAILED:
        'OneSignal non si inizializza. Verifica che il Site URL dell’app OneSignal coincida con questo dominio e che il suo service worker sia raggiungibile.',
      PUSH_OPT_IN_FAILED:
        'OneSignal non riesce ad attivare il dispositivo. Verifica il service worker e la configurazione Web Push.',
      PUSH_SUBSCRIPTION_ID_MISSING:
        'OneSignal non ha registrato il dispositivo entro 30 secondi. Controlla il service worker e riprova.',
      PUSH_LOGIN_FAILED:
        'OneSignal non riesce a collegare il dispositivo al tuo account.',
      PUSH_DATABASE_MIGRATION_MISSING:
        'Manca la funzione di registrazione push nel database QUALITY. Applica le migration Supabase.',
      PUSH_SUBSCRIPTION_IN_USE:
        'Questo dispositivo è ancora associato a un altro account. Esci da quell’account e riprova.',
      PUSH_DATABASE_SAVE_FAILED:
        'Il dispositivo è attivo su OneSignal, ma il salvataggio su Supabase è fallito. Controlla la console del browser.',
    }
    pushMessage.value =
      errors[code] ??
      `Non è stato possibile abilitare le notifiche push (${code || 'errore sconosciuto'}).`
  }
}

async function disablePush() {
  pushMessage.value = ''
  try {
    await push.disable()
    pushMessage.value = 'Notifiche push disabilitate per questo account.'
  } catch {
    pushMessage.value = 'Non è stato possibile disabilitare le notifiche push.'
  }
}

usePageActions(
  computed(() =>
    unread.value.length
      ? [
          {
            label: 'Segna tutte come lette',
            onClick: markAllRead,
            loading: allPending.value,
            disabled: allPending.value,
          },
        ]
      : [],
  ),
)

useSeoMeta({ title: 'Notifiche — VRSUS', robots: 'noindex, nofollow' })
</script>

<template>
  <div>
    <div
      class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <p
          class="text-brand-blue-400 text-xs font-semibold tracking-[0.24em] uppercase"
        >
          Inbox
        </p>
        <h1 class="font-display mt-3 text-4xl font-semibold text-white">
          Le tue notifiche
        </h1>
        <p class="mt-4 text-white/55">
          Aggiornamenti sulle prenotazioni, sui tornei e sugli eventi.
        </p>
      </div>
    </div>
    <div class="mt-10 space-y-3">
      <UCard class="border border-white/10 bg-white/[0.04]">
        <div
          class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p class="font-medium text-white">Notifiche push</p>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-white/55">
              Ricevi sul dispositivo gli aggiornamenti urgenti su turni,
              prenotazioni e tornei. La richiesta viene mostrata solo da qui.
            </p>
          </div>
          <UButton
            v-if="!pushEnabled"
            :loading="pushPending"
            :disabled="!pushConfigured"
            color="secondary"
            label="Abilita push"
            @click="enablePush"
          />
          <UButton
            v-else
            :loading="pushPending"
            variant="outline"
            color="neutral"
            label="Disabilita push"
            @click="disablePush"
          />
        </div>
        <p v-if="!pushConfigured" class="mt-3 text-xs text-white/40">
          Provider push non configurato in questo ambiente.
        </p>
        <UAlert
          v-if="originNotice"
          class="mt-4"
          color="warning"
          variant="subtle"
          :description="originNotice"
        />
        <UAlert
          v-if="pushMessage"
          class="mt-4"
          color="neutral"
          variant="subtle"
          :description="pushMessage"
        />
      </UCard>
      <div
        v-if="status === 'pending'"
        class="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-white/50"
      >
        Caricamento notifiche…
      </div>
      <UAlert
        v-else-if="error"
        color="error"
        variant="subtle"
        description="Non è stato possibile caricare le notifiche."
      />
      <div
        v-else-if="!notifications?.length"
        class="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-white/50"
      >
        Non hai ancora notifiche.
      </div>
      <div v-else v-vrsus-motion="'rows'" class="space-y-3">
        <NuxtLink
          v-for="notification in notifications"
          :key="notification.id"
          :to="notification.action_url ?? '/app'"
          class="block rounded-2xl border p-5 transition-colors hover:border-white/25"
          :class="
            notification.read_at
              ? 'border-white/10 bg-white/[0.02]'
              : 'border-brand-blue-400/40 bg-brand-blue-400/10'
          "
          @click="markRead(notification)"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="font-medium text-white">{{ notification.title }}</p>
              <p class="mt-2 text-sm leading-6 text-white/60">
                {{ notification.message }}
              </p>
            </div>
            <span
              v-if="!notification.read_at"
              class="bg-brand-blue-400 mt-1 size-2 shrink-0 rounded-full"
              aria-label="Non letta"
            />
          </div>
          <p class="mt-3 text-xs text-white/35">
            {{ formatPublicContentDate(notification.created_at) }}
          </p>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
