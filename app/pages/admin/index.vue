<script setup lang="ts">
import type { VrsusRole } from '~/composables/useVrsusAuth'
import type { EventOverviewPayload } from '~~/shared/types/event-overview'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
  requiredRoles: ['admin'] satisfies VrsusRole[],
})

const { data, status, refresh } = await useFetch<EventOverviewPayload>(
  '/api/admin/dashboard',
)

const isLive = computed(() => data.value?.mode === 'live')

const askStart = ref(false)
const starting = ref(false)
const feedback = ref('')
const feedbackTone = ref<'success' | 'error'>('success')

async function startEvent() {
  const eventId = data.value?.event?.id
  if (!eventId) return

  starting.value = true
  feedback.value = ''

  try {
    const result = await $fetch<{ notified: number }>(
      `/api/admin/events/${eventId}/start`,
      { method: 'POST' },
    )
    feedbackTone.value = 'success'
    feedback.value = `Evento avviato. Avviso inviato a ${result.notified} iscritti.`
    askStart.value = false
    // La tab bar legge lo stato live dalla sua chiave: senza questo la voce
    // Live resterebbe spenta fino al ricaricamento della console.
    await Promise.all([refresh(), refreshNuxtData(ADMIN_LIVE_STATE_KEY)])
  } catch (error) {
    const statusMessage =
      (error as { data?: { statusMessage?: string } })?.data?.statusMessage ??
      ''
    feedbackTone.value = 'error'
    feedback.value =
      statusMessage === 'EVENT_ALREADY_LIVE'
        ? 'L evento risulta gia in corso.'
        : statusMessage === 'EVENT_NOT_SCHEDULED'
          ? 'Solo un evento programmato puo essere avviato.'
          : 'Non e stato possibile avviare l evento.'
  } finally {
    starting.value = false
  }
}

usePageActions(
  computed(() => {
    const event = data.value?.event
    if (!event) return [{ label: 'Crea un evento', to: '/admin/eventi/nuovo' }]
    const actions = [
      {
        label: 'Modifica',
        icon: 'i-lucide-pencil',
        to: `/admin/eventi/${event.id}/modifica`,
      },
    ]
    if (isLive.value) {
      return [
        ...actions,
        { label: 'Check-in', icon: 'i-lucide-qr-code', to: '/admin/checkin' },
      ]
    }
    if (event.status === 'scheduled') {
      return [
        ...actions,
        {
          label: 'Start evento',
          icon: 'i-lucide-play',
          onClick: () => {
            askStart.value = true
          },
        },
      ]
    }
    return actions
  }),
)

useSeoMeta({ title: 'Console — Admin VRSUS', robots: 'noindex, nofollow' })
</script>

<template>
  <div>
    <header>
      <!--
        A evento avviato l'intestazione dice solo "Live", con il pallino che
        lampeggia: si deve capire dallo schermo acceso in sala, non leggendo.
      -->
      <p
        class="flex items-center gap-2 text-xs font-semibold tracking-[0.24em] uppercase"
        :class="isLive ? 'text-brand-red-400' : 'text-brand-blue-300'"
      >
        {{ isLive ? 'Live' : 'Prossimo evento' }}
        <UiVrsusLiveDot v-if="isLive" size="0.5rem" />
      </p>
      <h1
        class="font-display mt-2 text-2xl font-semibold text-white sm:text-3xl"
      >
        {{ data?.event?.title ?? 'Dashboard' }}
      </h1>
    </header>

    <div
      v-if="status === 'pending' && !data"
      class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div
        v-for="index in 4"
        :key="index"
        class="h-28 animate-pulse rounded-2xl bg-white/[0.03]"
      />
    </div>

    <template v-else-if="data">
      <UAlert
        v-if="feedback"
        class="mt-5"
        :color="feedbackTone === 'success' ? 'success' : 'error'"
        variant="subtle"
        :description="feedback"
      />

      <!-- Nessun evento programmato: la console resta utile ma non finge. -->
      <section
        v-if="!data.event"
        class="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5"
      >
        <h2 class="font-display text-lg font-semibold text-white">
          Nessun evento in programma
        </h2>
        <p class="mt-2 max-w-xl text-sm text-white/50">
          La dashboard mostra l evento in corso o il prossimo evento
          programmato. Crea un evento e pubblicalo per vederlo qui.
        </p>
      </section>

      <AdminEventOverview v-else class="mt-5" :data="data" />

      <UiVrsusConfirmDialog
        v-model="askStart"
        title="Avviare l’evento?"
        description="Gli iscritti riceveranno un avviso."
        confirm-label="Avvia evento"
        :pending="starting"
        @confirm="startEvent"
      />
    </template>
  </div>
</template>
