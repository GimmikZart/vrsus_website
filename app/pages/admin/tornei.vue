<script setup lang="ts">
import type { VrsusRole } from '~/composables/useVrsusAuth'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: [
    'tournament_admin',
    'admin',
    'super_admin',
  ] satisfies VrsusRole[],
})

const client = useSupabaseClient()
const { data: events } = await useAsyncData(
  'admin-tournament-events',
  async () => {
    const { data, error } = await client
      .from('public_events')
      .select('id,title,starts_at')
      .order('starts_at')
    if (error) throw error
    return data ?? []
  },
)
const { data: eventActivities } = await useAsyncData(
  'admin-tournament-activities',
  async () => {
    const { data, error } = await client
      .from('public_event_activities')
      .select('id,event_id,name,access_mode')
      .eq('access_mode', 'tournament')
      .order('name')
    if (error) throw error
    return data ?? []
  },
)
const {
  data: tournaments,
  status,
  error,
  refresh,
} = await useAsyncData('admin-tournaments', async () => {
  const { data, error } = await client
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
})

const form = reactive({
  eventId: '',
  eventActivityId: '',
  slug: '',
  name: '',
  description: '',
  status: 'draft',
  maxEntries: 8,
  checkinRequired: true,
  rankingEnabled: true,
  isPublic: true,
  registrationOpensAt: '',
  registrationClosesAt: '',
  startsAt: '',
})
const pending = ref(false)
const message = ref('')

async function createTournament() {
  if (!form.eventId || !form.slug || !form.name) return
  pending.value = true
  message.value = ''
  try {
    const { error } = await client.from('tournaments').insert({
      event_id: form.eventId,
      event_activity_id: form.eventActivityId || null,
      slug: form.slug,
      name: form.name,
      description: form.description || null,
      status: form.status,
      max_entries: form.maxEntries || null,
      checkin_required: form.checkinRequired,
      ranking_enabled: form.rankingEnabled,
      is_public: form.isPublic,
      registration_opens_at: form.registrationOpensAt
        ? new Date(form.registrationOpensAt).toISOString()
        : null,
      registration_closes_at: form.registrationClosesAt
        ? new Date(form.registrationClosesAt).toISOString()
        : null,
      starts_at: form.startsAt ? new Date(form.startsAt).toISOString() : null,
    })
    if (error) throw error
    message.value = 'Torneo creato.'
    form.slug = ''
    form.name = ''
    form.description = ''
    await refresh()
  } catch {
    message.value =
      'Non è stato possibile creare il torneo. Controlla slug e permessi.'
  } finally {
    pending.value = false
  }
}

async function updateStatus(id: string | null, statusValue: string | null) {
  if (!id || !statusValue) return
  const { error } = await client
    .from('tournaments')
    .update({ status: statusValue })
    .eq('id', id)
  if (!error) await refresh()
}

useSeoMeta({ title: 'Tornei — Admin VRSUS', robots: 'noindex, nofollow' })
</script>

<template>
  <main class="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
    <div
      class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <NuxtLink to="/admin" class="text-sm text-white/45 hover:text-white"
          >← Console</NuxtLink
        >
        <h1 class="font-display mt-4 text-4xl font-semibold text-white">
          Tornei
        </h1>
        <p class="mt-3 text-white/55">
          Crea iscrizioni, genera bracket e registra risultati.
        </p>
      </div>
      <UButton
        to="/tornei"
        variant="outline"
        color="neutral"
        label="Apri pagina pubblica"
      />
    </div>
    <UAlert
      v-if="message"
      class="mt-8 max-w-xl"
      color="success"
      variant="subtle"
      :description="message"
    />
    <UCard class="mt-10 border border-white/10 bg-white/[0.04]"
      ><template #header
        ><h2 class="font-display text-xl font-semibold text-white">
          Nuovo torneo
        </h2></template
      >
      <div class="grid gap-4 md:grid-cols-2">
        <UFormField label="Evento" name="event"
          ><USelect
            v-model="form.eventId"
            :items="
              (events ?? []).map((event) => ({
                label: event.title ?? 'Evento',
                value: String(event.id),
              }))
            "
            placeholder="Seleziona evento" /></UFormField
        ><UFormField label="Nome" name="name"
          ><UInput v-model="form.name" placeholder="Nome torneo" /></UFormField
        ><UFormField label="Slug" name="slug"
          ><UInput v-model="form.slug" placeholder="torneo-demo" /></UFormField
        ><UFormField label="Stato" name="status"
          ><USelect
            v-model="form.status"
            :items="[
              'draft',
              'registration_open',
              'registration_closed',
              'checkin',
              'running',
            ]" /></UFormField
        ><UFormField label="Attività torneo" name="eventActivity"
          ><USelect
            v-model="form.eventActivityId"
            :items="
              (eventActivities ?? [])
                .filter((activity) => activity.event_id === form.eventId)
                .map((activity) => ({
                  label: activity.name ?? 'Attività',
                  value: String(activity.id),
                }))
            "
            placeholder="Seleziona attività" /></UFormField
        ><UFormField label="Partecipanti massimi" name="maxEntries"
          ><UInput
            v-model.number="form.maxEntries"
            type="number"
            min="2" /></UFormField
        ><UFormField
          label="Descrizione"
          name="description"
          class="md:col-span-2"
          ><UTextarea v-model="form.description" :rows="3"
        /></UFormField>
        ><UFormField label="Apertura iscrizioni" name="registrationOpensAt"
          ><UInput v-model="form.registrationOpensAt" type="datetime-local" />
        </UFormField>
        ><UFormField label="Chiusura iscrizioni" name="registrationClosesAt"
          ><UInput v-model="form.registrationClosesAt" type="datetime-local" />
        </UFormField>
        ><UFormField label="Inizio previsto" name="startsAt"
          ><UInput v-model="form.startsAt" type="datetime-local" />
        </UFormField>
      </div>
      <div class="mt-5 flex flex-wrap gap-5">
        <label class="flex items-center gap-2 text-sm text-white/65"
          ><input v-model="form.checkinRequired" type="checkbox" /> Check-in
          richiesto</label
        ><label class="flex items-center gap-2 text-sm text-white/65"
          ><input v-model="form.rankingEnabled" type="checkbox" /> Ranking
          attivo</label
        ><label class="flex items-center gap-2 text-sm text-white/65"
          ><input v-model="form.isPublic" type="checkbox" /> Pubblico</label
        >
      </div>
      <UButton
        class="mt-6"
        :loading="pending"
        color="primary"
        label="Crea torneo"
        @click="createTournament"
    /></UCard>
    <div class="mt-10 space-y-4">
      <div v-if="status === 'pending'" class="text-white/50">
        Caricamento tornei…
      </div>
      <UAlert
        v-else-if="error"
        color="error"
        variant="subtle"
        description="Non è stato possibile caricare i tornei."
      />
      <div
        v-for="tournament in tournaments"
        v-else
        :key="String(tournament.id)"
        class="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <p class="font-medium text-white">{{ tournament.name }}</p>
          <p class="mt-1 text-sm text-white/45">
            {{ tournament.slug }} ·
            {{ tournamentStatusLabel(String(tournament.status)) }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <USelect
            :model-value="String(tournament.status)"
            :items="[
              'draft',
              'registration_open',
              'registration_closed',
              'checkin',
              'running',
              'completed',
              'cancelled',
            ]"
            @update:model-value="
              (value) => updateStatus(tournament.id, String(value))
            "
          /><UButton
            :to="`/admin/tornei/${String(tournament.id)}`"
            variant="soft"
            color="secondary"
            label="Gestisci"
          />
        </div>
      </div>
    </div>
  </main>
</template>
