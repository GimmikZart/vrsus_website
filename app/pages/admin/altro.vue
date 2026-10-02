<script setup lang="ts">
import type { VrsusRole } from '~/composables/useVrsusAuth'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
  requiredRoles: [
    'staff',
    'tournament_admin',
    'admin',
    'super_admin',
  ] satisfies VrsusRole[],
})

// Le voci sono le stesse della colonna di sinistra: su schermo largo si
// leggono direttamente li, qui servono al telefono, dove la barra in basso non
// ha spazio per tutto (DEC-040).
const { groups } = useAdminMenu()

const { isAdmin } = useVrsusAuth()
type Audience = {
  allUsers: number
  liveEvents: {
    id: string
    title: string
    starts_at: string
    participants: number
  }[]
}
const {
  data: audience,
  status: audienceStatus,
  refresh: refreshAudience,
} = await useFetch<Audience>('/api/admin/manual-notifications', {
  immediate: false,
})
const scope = ref<'all' | 'live_event'>('all')
const eventId = ref('')
const notificationText = ref('')
const sending = ref(false)
const sendError = ref('')
const sendSuccess = ref('')
const dispatchId = ref('')
const textLength = computed(() => [...notificationText.value].length)
const selectedEvent = computed(() =>
  audience.value?.liveEvents.find((item) => item.id === eventId.value),
)
const recipientCount = computed(() =>
  scope.value === 'all'
    ? (audience.value?.allUsers ?? 0)
    : (selectedEvent.value?.participants ?? 0),
)
const canSend = computed(
  () =>
    !sending.value &&
    audienceStatus.value === 'success' &&
    textLength.value > 0 &&
    textLength.value <= 300 &&
    notificationText.value.trim().length > 0 &&
    recipientCount.value > 0 &&
    (scope.value === 'all' || Boolean(selectedEvent.value)),
)

watch([scope, eventId, notificationText], () => {
  dispatchId.value = ''
  sendError.value = ''
  sendSuccess.value = ''
})

onMounted(() => {
  if (isAdmin.value) void refreshAudience()
})

async function sendNotification() {
  if (!canSend.value) return
  const audienceLabel =
    scope.value === 'all'
      ? 'tutti gli utenti dell’app'
      : `i partecipanti presenti a ${selectedEvent.value?.title}`
  if (
    !window.confirm(
      `Inviare questa notifica a ${recipientCount.value} utenti (${audienceLabel})?\n\n${notificationText.value.trim()}`,
    )
  )
    return

  dispatchId.value ||= crypto.randomUUID()
  sending.value = true
  sendError.value = ''
  sendSuccess.value = ''
  try {
    const result = await $fetch<{
      notified: number
      push: {
        attemptedDevices: number
        acceptedDevices: number
        errors: string[]
      }
    }>('/api/admin/manual-notifications', {
      method: 'POST',
      body: {
        scope: scope.value,
        eventId: scope.value === 'live_event' ? eventId.value : null,
        message: notificationText.value.trim(),
        dispatchId: dispatchId.value,
      },
    })
    if (result.push.errors.length) {
      sendError.value = `Notifica creata per ${result.notified} utenti, ma la push non è riuscita (${result.push.errors[0]}). Riprova per ritentare la push senza creare doppioni.`
    } else {
      notificationText.value = ''
      dispatchId.value = ''
      await nextTick()
      sendSuccess.value = `Notifica inviata a ${result.notified} utenti. OneSignal ha accettato la push per ${result.push.acceptedDevices} dispositivi.`
    }
  } catch (error) {
    sendError.value =
      (error as { statusCode?: number })?.statusCode === 409
        ? 'L’evento non è più in corso. Aggiorna i destinatari.'
        : 'Invio non riuscito. Puoi riprovare senza duplicare la notifica.'
    void refreshAudience()
  } finally {
    sending.value = false
  }
}

useSeoMeta({ title: 'Altro — Admin VRSUS', robots: 'noindex, nofollow' })
</script>

<template>
  <div>
    <header>
      <p
        class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
      >
        Console
      </p>
      <h1 class="font-display mt-3 text-3xl font-semibold text-white">Altro</h1>
      <p class="mt-2 max-w-2xl text-white/50">
        Le sezioni che si usano di rado, raccolte in un posto solo.
      </p>
    </header>

    <section v-if="isAdmin" class="mt-10 max-w-2xl">
      <h2 class="font-display text-lg font-semibold text-white">
        Invia notifica
      </h2>
      <p class="mt-1 text-sm text-white/50">
        Il messaggio appare nelle notifiche personali dei destinatari. Chi ha
        abilitato le push lo riceve anche sul dispositivo.
      </p>
      <div
        class="mt-4 space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
      >
        <UFormField label="Destinatari">
          <select v-model="scope" class="vrsus-select w-full">
            <option value="all">Tutti gli utenti dell’app</option>
            <option value="live_event">
              Partecipanti a un evento in corso
            </option>
          </select>
        </UFormField>
        <UFormField v-if="scope === 'live_event'" label="Evento in corso">
          <select v-model="eventId" class="vrsus-select w-full">
            <option value="">Seleziona un evento</option>
            <option
              v-for="liveEvent in audience?.liveEvents ?? []"
              :key="liveEvent.id"
              :value="liveEvent.id"
            >
              {{ liveEvent.title }} ({{ liveEvent.participants }} presenti)
            </option>
          </select>
          <p
            v-if="!audience?.liveEvents.length"
            class="mt-2 text-sm text-white/50"
          >
            Nessun evento in corso.
          </p>
        </UFormField>
        <UFormField label="Testo della notifica">
          <UTextarea
            v-model="notificationText"
            :rows="4"
            :maxlength="300"
            class="w-full"
            placeholder="Scrivi il messaggio da inviare"
          />
          <p class="mt-1 text-right text-xs text-white/50">
            {{ textLength }}/300 caratteri
          </p>
        </UFormField>
        <p class="text-sm text-white/60">
          Destinatari attuali:
          <strong class="text-white">{{ recipientCount }}</strong>
          <span v-if="scope === 'live_event'">
            (utenti con check-in effettuato)</span
          >
        </p>
        <UAlert
          v-if="sendError"
          color="error"
          variant="subtle"
          :description="sendError"
        />
        <UAlert
          v-if="sendSuccess"
          color="success"
          variant="subtle"
          :description="sendSuccess"
        />
        <UButton
          :disabled="!canSend"
          :loading="sending"
          @click="sendNotification"
        >
          Invia notifica
        </UButton>
      </div>
    </section>

    <section v-for="group in groups" :key="group.title" class="mt-10">
      <h2 class="font-display text-lg font-semibold text-white">
        {{ group.title }}
      </h2>

      <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          class="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-white/25"
        >
          <UIcon :name="item.icon" class="text-brand-red-400 size-5" />
          <p class="font-display mt-3 font-semibold text-white">
            {{ item.label }}
          </p>
          <p class="mt-1 text-sm text-white/50">{{ item.description }}</p>
        </NuxtLink>
      </div>
    </section>

    <!--
      L uscita sta qui perche e l unico posto della console che il telefono
      raggiunge sempre: la plancia Live e le schede sono piene di comandi
      operativi e un logout in mezzo sarebbe un incidente in attesa.
    -->
    <section class="mt-10 max-w-md">
      <h2 class="font-display text-lg font-semibold text-white">Sessione</h2>
      <div
        class="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center sm:text-left"
      >
        <UiVrsusSessionCard />
      </div>
    </section>
  </div>
</template>
