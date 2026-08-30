<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const {
  data: notifications,
  status,
  error,
  refresh,
} = await useMyNotifications()
const { data: preferences, refresh: refreshPreferences } =
  await useNotificationPreferences()
const push = usePushNotifications()
const pushPending = push.pending
const pushConfigured = push.configured
const pending = ref<string | null>(null)
const allPending = ref(false)
const pushMessage = ref('')

const unread = computed(() =>
  (notifications.value ?? []).filter((item) => !item.read_at),
)

async function markRead(notification: UserNotification) {
  if (notification.read_at) return
  pending.value = notification.id
  try {
    await markNotificationRead(notification.id)
    await refresh()
  } finally {
    pending.value = null
  }
}

async function markAllRead() {
  allPending.value = true
  try {
    await markAllNotificationsRead(unread.value.map((item) => item.id))
    await refresh()
  } finally {
    allPending.value = false
  }
}

async function enablePush() {
  pushMessage.value = ''
  try {
    await push.enable()
    pushMessage.value = 'Notifiche push abilitate su questo dispositivo.'
    await refreshPreferences()
  } catch (caughtError) {
    const code = String((caughtError as { message?: string }).message ?? '')
    pushMessage.value = code.includes('PUSH_NOT_CONFIGURED')
      ? 'Le notifiche push saranno disponibili dopo la configurazione OneSignal.'
      : 'Non è stato possibile abilitare le notifiche push.'
  }
}

async function disablePush() {
  pushMessage.value = ''
  try {
    await push.disable()
    pushMessage.value = 'Notifiche push disabilitate su questo dispositivo.'
    await refreshPreferences()
  } catch {
    pushMessage.value = 'Non è stato possibile disabilitare le notifiche push.'
  }
}

useSeoMeta({ title: 'Notifiche — VRSUS', robots: 'noindex, nofollow' })
</script>

<template>
  <main
    class="mx-auto min-h-[calc(100vh-9rem)] max-w-4xl px-5 py-16 sm:px-8 lg:py-24"
  >
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
      <UButton
        v-if="unread.length"
        :loading="allPending"
        variant="outline"
        color="neutral"
        label="Segna tutte come lette"
        @click="markAllRead"
      />
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
            v-if="!preferences?.push_enabled"
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
      <NuxtLink
        v-for="notification in notifications"
        v-else
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
  </main>
</template>
