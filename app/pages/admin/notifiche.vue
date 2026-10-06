<script setup lang="ts">
import type { VrsusRole } from '~/composables/useVrsusAuth'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
  requiredRoles: ['staff', 'admin'] satisfies VrsusRole[],
})

type NotificationUser = {
  id: string
  display_name: string
  nickname: string | null
}

type Audience = {
  allUsers: number
  users: NotificationUser[]
  liveEvents: {
    id: string
    title: string
    starts_at: string
    participants: number
  }[]
}

const route = useRoute()
const { isAdmin } = useVrsusAuth()
const initialUserId = String(route.query.userId ?? '')
const initialUserName = String(route.query.userName ?? '')
const {
  data: audience,
  status,
  refresh,
} = await useFetch<Audience>('/api/admin/manual-notifications')

const scope = ref<'all' | 'live_event' | 'user'>(
  initialUserId || !isAdmin.value ? 'user' : 'all',
)
const eventId = ref('')
const userId = ref(initialUserId)
const userSearch = ref(initialUserName)
const notificationText = ref('')
const sending = ref(false)
const sendError = ref('')
const sendSuccess = ref('')
const dispatchId = ref('')

const textLength = computed(() => [...notificationText.value].length)
const selectedEvent = computed(() =>
  audience.value?.liveEvents.find((item) => item.id === eventId.value),
)
const selectedUser = computed(() =>
  audience.value?.users.find((item) => item.id === userId.value),
)
const filteredUsers = computed(() => {
  const query = userSearch.value.trim().toLocaleLowerCase('it-IT')
  return (audience.value?.users ?? [])
    .filter((person) =>
      `${person.nickname ?? ''} ${person.display_name}`
        .toLocaleLowerCase('it-IT')
        .includes(query),
    )
    .slice(0, 20)
})
const recipientCount = computed(() => {
  if (scope.value === 'all') return audience.value?.allUsers ?? 0
  if (scope.value === 'live_event')
    return selectedEvent.value?.participants ?? 0
  return selectedUser.value ? 1 : 0
})
const canSend = computed(
  () =>
    !sending.value &&
    status.value === 'success' &&
    textLength.value > 0 &&
    textLength.value <= 300 &&
    notificationText.value.trim().length > 0 &&
    recipientCount.value > 0,
)

watch([scope, eventId, userId, notificationText], () => {
  dispatchId.value = ''
  sendError.value = ''
  sendSuccess.value = ''
})

watch(scope, (value) => {
  if (value !== 'live_event') eventId.value = ''
  if (value !== 'user') {
    userId.value = ''
    userSearch.value = ''
  }
})

function selectUser(person: NotificationUser) {
  userId.value = person.id
  userSearch.value = person.nickname ?? person.display_name
}

async function sendNotification() {
  if (!canSend.value) return
  const audienceLabel =
    scope.value === 'all'
      ? 'tutti gli utenti dell’app'
      : scope.value === 'live_event'
        ? `i partecipanti presenti a ${selectedEvent.value?.title}`
        : (selectedUser.value?.nickname ??
          selectedUser.value?.display_name ??
          'l’utente selezionato')

  if (
    !window.confirm(
      `Inviare questa notifica a ${recipientCount.value} destinatari (${audienceLabel})?\n\n${notificationText.value.trim()}`,
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
      push: { acceptedDevices: number; errors: string[] }
    }>('/api/admin/manual-notifications', {
      method: 'POST',
      body: {
        scope: scope.value,
        eventId: scope.value === 'live_event' ? eventId.value : null,
        targetUserId: scope.value === 'user' ? userId.value : null,
        message: notificationText.value.trim(),
        dispatchId: dispatchId.value,
      },
    })

    if (result.push.errors.length) {
      sendError.value = `Notifica creata per ${result.notified} utenti, ma la push non è riuscita (${result.push.errors[0]}). Riprova per ritentare la push senza creare doppioni.`
    } else {
      notificationText.value = ''
      dispatchId.value = ''
      sendSuccess.value = `Notifica inviata a ${result.notified} utenti. OneSignal ha accettato la push per ${result.push.acceptedDevices} dispositivi.`
    }
  } catch (error) {
    const statusCode = (error as { statusCode?: number })?.statusCode
    sendError.value =
      statusCode === 409
        ? 'L’evento non è più in corso. Aggiorna i destinatari.'
        : statusCode === 404
          ? 'L’utente selezionato non è più disponibile.'
          : 'Invio non riuscito. Puoi riprovare senza duplicare la notifica.'
    void refresh()
  } finally {
    sending.value = false
  }
}

usePageActions(
  computed(() => [
    {
      label: 'Invia',
      icon: 'i-lucide-send',
      onClick: sendNotification,
      loading: sending.value,
      disabled: !canSend.value,
    },
  ]),
)

useSeoMeta({
  title: 'Invia notifica — Admin VRSUS',
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div class="max-w-2xl space-y-6">
    <header>
      <p
        class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
      >
        Comunicazioni
      </p>
      <h1 class="font-display mt-2 text-3xl font-semibold text-white">
        Invia notifica
      </h1>
      <p class="mt-2 text-sm text-white/50">
        Il messaggio apparirà nell’inbox e, se attive, nelle notifiche push.
      </p>
    </header>

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

    <div class="space-y-5">
      <UFormField label="Destinatari">
        <select v-model="scope" class="vrsus-select w-full">
          <option v-if="isAdmin" value="all">Tutti gli utenti dell’app</option>
          <option v-if="isAdmin" value="live_event">
            Partecipanti a un evento in corso
          </option>
          <option value="user">Singolo utente</option>
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
      </UFormField>

      <UFormField v-if="scope === 'user'" label="Utente">
        <UInput
          v-model="userSearch"
          icon="i-lucide-search"
          placeholder="Filtra per nickname"
          class="w-full"
          @update:model-value="userId = ''"
        />
        <div class="mt-2 max-h-52 space-y-1 overflow-y-auto">
          <button
            v-for="person in filteredUsers"
            :key="person.id"
            type="button"
            class="flex min-h-11 w-full items-center justify-between rounded-xl px-3 py-2 text-left"
            :class="
              userId === person.id
                ? 'bg-brand-red-500/15 text-white'
                : 'bg-white/[0.04] text-white/70 hover:bg-white/[0.08]'
            "
            @click="selectUser(person)"
          >
            <span>{{ person.nickname ?? person.display_name }}</span>
            <UIcon
              v-if="userId === person.id"
              name="i-lucide-check"
              class="size-4"
            />
          </button>
          <p v-if="!filteredUsers.length" class="py-3 text-sm text-white/45">
            Nessun utente trovato.
          </p>
        </div>
      </UFormField>

      <p class="text-sm text-white/60">
        Destinatari previsti:
        <strong class="text-white">{{ recipientCount }}</strong>
      </p>

      <UFormField label="Testo della notifica">
        <UTextarea
          v-model="notificationText"
          :rows="5"
          :maxlength="300"
          class="w-full"
          placeholder="Scrivi il messaggio da inviare"
        />
        <p class="mt-1 text-right text-xs text-white/45">
          {{ textLength }}/300 caratteri
        </p>
      </UFormField>
    </div>
  </div>
</template>
