<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { VrsusRole } from '~/composables/useVrsusAuth'
import type { EventOverviewPayload } from '~~/shared/types/event-overview'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
  requiredRoles: ['staff', 'admin'] satisfies VrsusRole[],
})

const route = useRoute()
const router = useRouter()
const client = useSupabaseClient<Database>()
const { isAdmin } = useVrsusAuth()
const eventId = String(route.params.id)

// Scheda di un evento: la stessa lettura della dashboard, su un evento scelto.
// Gli interventi di configurazione sono raccolti sopra le tab, mentre avvio e
// check-in restano nella dashboard della serata.
const { data, error } = await useFetch<EventOverviewPayload>(
  `/api/admin/events/${eventId}/overview`,
)

if (error.value || !data.value?.event) {
  throw createError({ statusCode: 404, statusMessage: 'Evento non trovato' })
}

const duplicatePending = ref(false)
const deletePending = ref(false)
const deleteOpen = ref(false)
const actionError = ref('')

/** La copia resta una bozza e apre subito il wizard per programmare la data. */
async function duplicateEvent() {
  const source = data.value?.event
  if (!source?.startsAt || !source.endsAt) {
    actionError.value = 'L evento non ha una data completa da duplicare.'
    return
  }

  duplicatePending.value = true
  actionError.value = ''

  try {
    const events =
      await $fetch<Database['public']['Tables']['events']['Row'][]>(
        '/api/admin/events',
      )
    const base = source.slug.replace(/-copia(-\d+)?$/, '')
    const taken = new Set(events.map((event) => event.slug))
    let slug = `${base}-copia`
    let suffix = 2
    while (taken.has(slug)) {
      slug = `${base}-copia-${suffix}`
      suffix += 1
    }

    const { data: newId, error: duplicateError } = await client.rpc(
      'duplicate_event',
      {
        p_source_event_id: source.id,
        p_new_slug: slug,
        p_new_title: `${source.title} — copia`,
        p_new_starts_at: source.startsAt,
        p_new_ends_at: source.endsAt,
      },
    )

    if (duplicateError || !newId) throw duplicateError
    await router.push(`/admin/eventi/${newId}/modifica`)
  } catch {
    actionError.value = 'Duplicazione non riuscita.'
  } finally {
    duplicatePending.value = false
  }
}

async function deleteEvent() {
  deletePending.value = true
  actionError.value = ''

  try {
    await $fetch(`/api/admin/events/${eventId}`, { method: 'DELETE' })
    await router.replace('/admin/eventi')
  } catch {
    actionError.value = 'Eliminazione non riuscita.'
  } finally {
    deletePending.value = false
  }
}

usePageActions(
  computed(() =>
    isAdmin.value
      ? [
          {
            label: 'Modifica',
            icon: 'i-lucide-pencil',
            to: `/admin/eventi/${eventId}/modifica`,
          },
          {
            label: 'Duplica',
            icon: 'i-lucide-copy',
            loading: duplicatePending.value,
            onClick: duplicateEvent,
          },
          {
            label: 'Elimina',
            icon: 'i-lucide-trash-2',
            color: 'error' as const,
            onClick: () => {
              deleteOpen.value = true
            },
          },
        ]
      : [],
  ),
)

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

    <UAlert
      v-if="actionError"
      class="mt-5"
      color="error"
      variant="subtle"
      :description="actionError"
    />

    <AdminEventOverview class="mt-5" :data="data" />

    <UiVrsusConfirmDialog
      v-model="deleteOpen"
      title="Eliminare questo evento?"
      description="Verranno eliminati anche prenotazioni, check-in e tornei collegati. L’operazione non si può annullare."
      confirm-label="Elimina evento"
      :pending="deletePending"
      @confirm="deleteEvent"
    />
  </div>
</template>
