<script setup lang="ts">
import type { VrsusRole } from '~/composables/useVrsusAuth'
import type { EventOverviewPayload } from '~~/shared/types/event-overview'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
  requiredRoles: ['staff', 'admin', 'super_admin'] satisfies VrsusRole[],
})

const route = useRoute()
const eventId = String(route.params.id)

// Scheda di un evento: la stessa lettura della dashboard, su un evento scelto.
// Qui non ci sono comandi: modifica, avvio e check-in vivono sulla dashboard e
// sul wizard, dove l'operatore sa di stare cambiando qualcosa.
const { data, error } = await useFetch<EventOverviewPayload>(
  `/api/admin/events/${eventId}/overview`,
)

if (error.value || !data.value?.event) {
  throw createError({ statusCode: 404, statusMessage: 'Evento non trovato' })
}

useSeoMeta({
  title: () => `${data.value?.event?.title ?? 'Evento'} — Admin VRSUS`,
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div v-if="data?.event">
    <NuxtLink to="/admin/eventi" class="text-sm text-white/45 hover:text-white">
      ← Eventi
    </NuxtLink>

    <header class="mt-4">
      <p
        class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
      >
        Evento
      </p>
      <h1
        class="font-display mt-2 text-2xl font-semibold text-white sm:text-3xl"
      >
        {{ data.event.title }}
      </h1>
    </header>

    <AdminEventOverview class="mt-5" :data="data" />
  </div>
</template>
