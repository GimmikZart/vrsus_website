<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { VrsusRole } from '~/composables/useVrsusAuth'

type EventRow = Database['public']['Tables']['events']['Row']

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'super_admin'] satisfies VrsusRole[],
})

// Il dominio evento non ha grant per il browser (DEC-005): la lista arriva da
// un endpoint service-role. La creazione e la modifica hanno una vista propria.
const client = useSupabaseClient<Database>()
const router = useRouter()
const {
  data: events,
  status: loadStatus,
  error: loadError,
  refresh,
} = await useFetch<EventRow[]>('/api/admin/events', { default: () => [] })

const pendingId = ref<string | null>(null)
const confirmDeleteId = ref<string | null>(null)
const errorMessage = ref('')
const successMessage = ref('')

function formatDate(value: string) {
  return new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function statusLabel(status: string) {
  return (
    {
      draft: 'bozza',
      scheduled: 'programmato',
      running: 'in corso',
      completed: 'concluso',
      cancelled: 'annullato',
    }[status] ?? status
  )
}

/**
 * La copia nasce in bozza e non pubblicata: serve a preparare la data
 * successiva senza che un evento incompleto finisca in vetrina.
 */
async function duplicateEvent(event: EventRow) {
  pendingId.value = event.id
  errorMessage.value = ''
  successMessage.value = ''

  const base = event.slug.replace(/-copia(-\d+)?$/, '')
  const taken = new Set((events.value ?? []).map((item) => item.slug))
  let slug = `${base}-copia`
  let suffix = 2
  while (taken.has(slug)) {
    slug = `${base}-copia-${suffix}`
    suffix += 1
  }

  const { data: newId, error } = await client.rpc('duplicate_event', {
    p_source_event_id: event.id,
    p_new_slug: slug,
    p_new_title: `${event.title} — copia`,
    p_new_starts_at: event.starts_at,
    p_new_ends_at: event.ends_at,
  })

  pendingId.value = null

  if (error || !newId) {
    errorMessage.value = 'Duplicazione non riuscita.'
    return
  }

  await router.push(`/admin/eventi/${newId}/modifica`)
}

async function deleteEvent(event: EventRow) {
  pendingId.value = event.id
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await $fetch(`/api/admin/events/${event.id}`, { method: 'DELETE' })
    successMessage.value = `Evento "${event.title}" eliminato.`
    confirmDeleteId.value = null
    await refresh()
  } catch {
    errorMessage.value = 'Eliminazione non riuscita.'
  } finally {
    pendingId.value = null
  }
}

useSeoMeta({ title: 'Gestione eventi — VRSUS', robots: 'noindex, nofollow' })
</script>

<template>
  <div>
    <header
      class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <p
          class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
        >
          CMS eventi
        </p>
        <h1
          class="font-display mt-2 text-2xl font-semibold text-white sm:text-3xl"
        >
          Gestione eventi
        </h1>
        <p class="mt-2 max-w-2xl text-sm text-white/50">
          Crea e prepara gli eventi VRSUS. La capienza resta privata salvo
          esplicita scelta di visibilita.
        </p>
      </div>
      <UButton
        class="self-start"
        to="/admin/eventi/nuovo"
        color="primary"
        icon="i-lucide-plus"
        label="Nuovo evento"
      />
    </header>

    <UAlert
      v-if="loadError"
      class="mt-5"
      color="error"
      variant="subtle"
      description="Impossibile caricare gli eventi."
    />
    <UAlert
      v-if="errorMessage"
      class="mt-5"
      color="error"
      variant="subtle"
      :description="errorMessage"
    />
    <UAlert
      v-if="successMessage"
      class="mt-5"
      color="success"
      variant="subtle"
      :description="successMessage"
    />

    <div
      v-if="loadStatus === 'pending'"
      class="mt-5 h-32 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]"
    />

    <ul v-else class="mt-5 space-y-3">
      <li
        v-for="event in events"
        :key="event.id"
        class="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5"
      >
        <div class="flex flex-wrap items-center gap-2">
          <UBadge
            :color="event.is_public ? 'success' : 'neutral'"
            variant="subtle"
            :label="event.is_public ? 'pubblico' : 'privato'"
          />
          <UBadge
            color="secondary"
            variant="subtle"
            :label="statusLabel(event.status)"
          />
          <span class="text-xs text-white/35">/{{ event.slug }}</span>
        </div>

        <NuxtLink :to="`/admin/eventi/${event.id}`" class="mt-2 block">
          <h2
            class="font-display text-lg font-semibold text-white hover:underline"
          >
            {{ event.title }}
          </h2>
          <p class="mt-1 text-sm text-white/50">
            {{ formatDate(event.starts_at) }} ·
            {{ event.venue_name || 'Luogo da definire' }}
          </p>
        </NuxtLink>

        <div class="mt-4 flex flex-wrap gap-2">
          <UButton
            :to="`/admin/eventi/${event.id}`"
            color="neutral"
            variant="outline"
            size="sm"
            label="Apri"
          />
          <UButton
            :to="`/admin/eventi/${event.id}/modifica`"
            color="neutral"
            variant="ghost"
            size="sm"
            label="Modifica"
          />
          <UButton
            color="secondary"
            variant="soft"
            size="sm"
            :loading="pendingId === event.id && confirmDeleteId !== event.id"
            label="Duplica"
            @click="duplicateEvent(event)"
          />

          <template v-if="confirmDeleteId === event.id">
            <span class="self-center text-sm text-white/60">
              Elimina l evento e tutto cio che contiene?
            </span>
            <UButton
              color="error"
              size="sm"
              :loading="pendingId === event.id"
              label="Conferma"
              @click="deleteEvent(event)"
            />
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              label="Annulla"
              @click="confirmDeleteId = null"
            />
          </template>
          <UButton
            v-else
            color="error"
            variant="ghost"
            size="sm"
            icon="i-lucide-trash-2"
            label="Elimina"
            @click="confirmDeleteId = event.id"
          />
        </div>
      </li>

      <li
        v-if="!events.length"
        class="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/55"
      >
        Nessun evento presente.
      </li>
    </ul>
  </div>
</template>
