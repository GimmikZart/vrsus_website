<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { VrsusRole } from '~/composables/useVrsusAuth'

type AccessMode =
  'free_play' | 'scheduled' | 'registration_required' | 'tournament'

type StationOverride = {
  publicName: string
  description: string
  capacity: number | undefined
  isPublic: boolean
  active: boolean
}

type ActivityOverride = {
  publicName: string
  description: string
  accessMode: AccessMode
  capacity: number | undefined
  startsAt: string
  endsAt: string
  isPublic: boolean
  active: boolean
}

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'super_admin'] satisfies VrsusRole[],
})

const route = useRoute()
const client = useSupabaseClient<Database>()
const eventId = computed(() => String(route.params.id))

const {
  data: configuration,
  status: loadStatus,
  error: loadError,
  refresh,
} = await useAsyncData(
  `admin-event-configuration-${eventId.value}`,
  async () => {
    const [
      eventResult,
      stationsResult,
      activitiesResult,
      eventStationsResult,
      eventActivitiesResult,
    ] = await Promise.all([
      client.from('events').select('*').eq('id', eventId.value).single(),
      client.from('stations').select('*').eq('active', true).order('name'),
      client.from('activities').select('*').eq('active', true).order('name'),
      client.from('event_stations').select('*').eq('event_id', eventId.value),
      client.from('event_activities').select('*').eq('event_id', eventId.value),
    ])

    if (
      eventResult.error ||
      stationsResult.error ||
      activitiesResult.error ||
      eventStationsResult.error ||
      eventActivitiesResult.error
    ) {
      throw new Error('Impossibile caricare la configurazione evento.')
    }

    const mappingsResult = await client
      .from('event_station_activities')
      .select('*')
      .in(
        'event_activity_id',
        eventActivitiesResult.data.length
          ? eventActivitiesResult.data.map((item) => item.id)
          : ['00000000-0000-0000-0000-000000000000'],
      )

    if (mappingsResult.error) {
      throw new Error('Impossibile caricare le associazioni evento.')
    }

    return {
      event: eventResult.data,
      stations: stationsResult.data ?? [],
      activities: activitiesResult.data ?? [],
      eventStations: eventStationsResult.data ?? [],
      eventActivities: eventActivitiesResult.data ?? [],
      mappings: mappingsResult.data ?? [],
    }
  },
)

const selectedStationIds = ref<string[]>([])
const selectedActivityIds = ref<string[]>([])
const mappingSelection = ref<Record<string, string[]>>({})
const stationOverrides = reactive<Record<string, StationOverride>>({})
const activityOverrides = reactive<Record<string, ActivityOverride>>({})
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

function emptyStationOverride(): StationOverride {
  return {
    publicName: '',
    description: '',
    capacity: undefined,
    isPublic: true,
    active: true,
  }
}

function emptyActivityOverride(): ActivityOverride {
  return {
    publicName: '',
    description: '',
    accessMode: 'free_play',
    capacity: undefined,
    startsAt: '',
    endsAt: '',
    isPublic: true,
    active: true,
  }
}

useSeoMeta({
  title: 'Configurazione evento — VRSUS',
  robots: 'noindex, nofollow',
})

function toDateTimeInput(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function syncSelections() {
  if (!configuration.value) return
  selectedStationIds.value = configuration.value.eventStations
    .filter((item) => item.active)
    .map((item) => item.station_id)
  selectedActivityIds.value = configuration.value.eventActivities
    .filter((item) => item.active)
    .map((item) => item.activity_id)

  for (const station of configuration.value.stations) {
    const configured = configuration.value.eventStations.find(
      (item) => item.station_id === station.id,
    )
    stationOverrides[station.id] = {
      publicName: configured?.public_name ?? '',
      description: configured?.description_override ?? '',
      capacity: configured?.capacity_override ?? undefined,
      isPublic: configured?.is_public ?? true,
      active: configured?.active ?? true,
    }
  }
  for (const activity of configuration.value.activities) {
    const configured = configuration.value.eventActivities.find(
      (item) => item.activity_id === activity.id,
    )
    activityOverrides[activity.id] = {
      publicName: configured?.public_name ?? '',
      description: configured?.description_override ?? '',
      accessMode: (configured?.access_mode as AccessMode) ?? 'free_play',
      capacity: configured?.capacity ?? undefined,
      startsAt: toDateTimeInput(configured?.starts_at ?? null),
      endsAt: toDateTimeInput(configured?.ends_at ?? null),
      isPublic: configured?.is_public ?? true,
      active: configured?.active ?? true,
    }
  }

  const eventStationById = new Map(
    configuration.value.eventStations.map((item) => [item.id, item.station_id]),
  )
  const mappingByActivity: Record<string, string[]> = {}
  for (const mapping of configuration.value.mappings) {
    const stationId = eventStationById.get(mapping.event_station_id)
    if (stationId) {
      const stations = mappingByActivity[mapping.event_activity_id] ?? []
      mappingByActivity[mapping.event_activity_id] = [...stations, stationId]
    }
  }
  mappingSelection.value = mappingByActivity
}

syncSelections()

function toggleValue(values: string[], value: string) {
  const index = values.indexOf(value)
  if (index >= 0) values.splice(index, 1)
  else values.push(value)
}

function isMappingSelected(activityId: string, stationId: string) {
  return mappingSelection.value[activityId]?.includes(stationId) ?? false
}

function toggleMapping(activityId: string, stationId: string) {
  const current = mappingSelection.value[activityId] ?? []
  mappingSelection.value[activityId] = current.includes(stationId)
    ? current.filter((item) => item !== stationId)
    : [...current, stationId]
}

function stationOverride(stationId: string) {
  return stationOverrides[stationId] ?? emptyStationOverride()
}

function activityOverride(activityId: string) {
  return activityOverrides[activityId] ?? emptyActivityOverride()
}

async function saveConfiguration() {
  if (!configuration.value) return
  errorMessage.value = ''
  successMessage.value = ''
  saving.value = true

  for (const stationId of selectedStationIds.value) {
    const override = stationOverrides[stationId]
    if (
      override?.capacity !== undefined &&
      (!Number.isInteger(override.capacity) || override.capacity <= 0)
    ) {
      errorMessage.value =
        'Le capienze delle postazioni devono essere interi positivi.'
      saving.value = false
      return
    }
  }
  for (const activityId of selectedActivityIds.value) {
    const override = activityOverrides[activityId]
    const startsAt = override?.startsAt ? new Date(override.startsAt) : null
    const endsAt = override?.endsAt ? new Date(override.endsAt) : null
    if (
      (override?.capacity !== undefined &&
        (!Number.isInteger(override.capacity) || override.capacity <= 0)) ||
      (startsAt && Number.isNaN(startsAt.getTime())) ||
      (endsAt && Number.isNaN(endsAt.getTime())) ||
      (startsAt && endsAt && endsAt <= startsAt)
    ) {
      errorMessage.value = 'Controlla capienza e date delle attività.'
      saving.value = false
      return
    }
  }

  try {
    const existingStations = configuration.value.eventStations
    const existingActivities = configuration.value.eventActivities

    for (const item of existingStations) {
      if (!selectedStationIds.value.includes(item.station_id)) {
        const result = await client
          .from('event_stations')
          .delete()
          .eq('id', item.id)
        if (result.error) throw result.error
      }
    }
    for (const item of existingActivities) {
      if (!selectedActivityIds.value.includes(item.activity_id)) {
        const result = await client
          .from('event_activities')
          .delete()
          .eq('id', item.id)
        if (result.error) throw result.error
      }
    }

    const currentStationIds = new Set(
      existingStations.map((item) => item.station_id),
    )
    const currentActivityIds = new Set(
      existingActivities.map((item) => item.activity_id),
    )
    const newStations = selectedStationIds.value
      .filter((stationId) => !currentStationIds.has(stationId))
      .map((stationId) => ({ event_id: eventId.value, station_id: stationId }))
    const newActivities = selectedActivityIds.value
      .filter((activityId) => !currentActivityIds.has(activityId))
      .map((activityId) => ({
        event_id: eventId.value,
        activity_id: activityId,
        access_mode: 'free_play',
      }))

    if (newStations.length) {
      const result = await client.from('event_stations').insert(newStations)
      if (result.error) throw result.error
    }
    if (newActivities.length) {
      const result = await client.from('event_activities').insert(newActivities)
      if (result.error) throw result.error
    }

    await refresh()
    if (!configuration.value) return
    for (const item of configuration.value.eventStations) {
      const override = stationOverrides[item.station_id]
      if (!override) continue
      const result = await client
        .from('event_stations')
        .update({
          public_name: override.publicName.trim() || null,
          description_override: override.description.trim() || null,
          capacity_override: override.capacity ?? null,
          is_public: override.isPublic,
          active: override.active,
        })
        .eq('id', item.id)
      if (result.error) throw result.error
    }
    for (const item of configuration.value.eventActivities) {
      const override = activityOverrides[item.activity_id]
      if (!override) continue
      const startsAt = override.startsAt ? new Date(override.startsAt) : null
      const endsAt = override.endsAt ? new Date(override.endsAt) : null
      if (
        (startsAt && Number.isNaN(startsAt.getTime())) ||
        (endsAt && Number.isNaN(endsAt.getTime())) ||
        (startsAt && endsAt && endsAt <= startsAt)
      ) {
        throw new Error('Le date dell’attività non sono valide.')
      }
      const result = await client
        .from('event_activities')
        .update({
          public_name: override.publicName.trim() || null,
          description_override: override.description.trim() || null,
          access_mode: override.accessMode,
          capacity: override.capacity ?? null,
          starts_at: startsAt?.toISOString() ?? null,
          ends_at: endsAt?.toISOString() ?? null,
          is_public: override.isPublic,
          active: override.active,
        })
        .eq('id', item.id)
      if (result.error) throw result.error
    }

    await refresh()
    if (!configuration.value) return
    const eventStationIds = configuration.value.eventStations
      .filter((item) => selectedStationIds.value.includes(item.station_id))
      .map((item) => item.id)
    const eventActivityIds = configuration.value.eventActivities
      .filter((item) => selectedActivityIds.value.includes(item.activity_id))
      .map((item) => item.id)

    if (eventStationIds.length) {
      const result = await client
        .from('event_station_activities')
        .delete()
        .in('event_station_id', eventStationIds)
      if (result.error) throw result.error
    }

    const stationIdToEventStationId = new Map(
      configuration.value.eventStations.map((item) => [
        item.station_id,
        item.id,
      ]),
    )
    const activityIdToEventActivityId = new Map(
      configuration.value.eventActivities.map((item) => [
        item.activity_id,
        item.id,
      ]),
    )
    const mappings = eventActivityIds.flatMap((eventActivityId) => {
      const activityId = [...activityIdToEventActivityId.entries()].find(
        ([, value]) => value === eventActivityId,
      )?.[0]
      if (!activityId) return []
      return (mappingSelection.value[eventActivityId] ?? [])
        .map((stationId) => stationIdToEventStationId.get(stationId))
        .filter((eventStationId): eventStationId is string =>
          Boolean(eventStationId),
        )
        .map((eventStationId) => ({
          event_station_id: eventStationId,
          event_activity_id: eventActivityId,
        }))
    })
    if (mappings.length) {
      const result = await client
        .from('event_station_activities')
        .insert(mappings)
      if (result.error) throw result.error
    }

    await refresh()
    syncSelections()
    successMessage.value = 'Configurazione evento salvata.'
  } catch {
    errorMessage.value = 'Salvataggio non riuscito. Riprova e controlla i dati.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <main
    class="mx-auto min-h-[calc(100vh-9rem)] max-w-7xl px-5 py-16 sm:px-8 lg:py-24"
  >
    <div
      v-if="configuration"
      class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <NuxtLink
          to="/admin/eventi"
          class="text-sm text-white/45 hover:text-white"
        >
          ← Torna agli eventi
        </NuxtLink>
        <p
          class="text-brand-blue-400 mt-8 text-xs font-semibold tracking-[0.24em] uppercase"
        >
          Configurazione evento
        </p>
        <h1 class="font-display mt-3 text-4xl font-semibold text-white">
          {{ configuration.event.title }}
        </h1>
        <p class="mt-3 text-white/50">
          Seleziona ciò che sarà disponibile durante questo evento.
        </p>
      </div>
      <UButton
        :loading="saving"
        label="Salva configurazione"
        @click="saveConfiguration"
      />
    </div>

    <UAlert
      v-if="loadError"
      class="mt-8"
      color="error"
      variant="subtle"
      description="Impossibile caricare la configurazione evento."
    />
    <div
      v-if="loadStatus === 'pending'"
      class="mt-8 h-32 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]"
    />

    <div v-if="configuration" class="mt-10 space-y-8">
      <section class="grid gap-8 lg:grid-cols-2">
        <UCard class="border border-white/10 bg-white/[0.04]">
          <h2 class="font-display text-xl font-semibold text-white">
            Postazioni presenti
          </h2>
          <p class="mt-2 text-sm text-white/50">
            Puoi sovrascrivere nome, descrizione, capienza e visibilità per
            questo evento senza alterare il catalogo globale.
          </p>
          <div class="mt-6 space-y-3">
            <label
              v-for="station in configuration.stations"
              :key="station.id"
              class="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 p-3 hover:border-white/25"
            >
              <input
                :checked="selectedStationIds.includes(station.id)"
                type="checkbox"
                class="accent-brand-blue-500"
                @change="toggleValue(selectedStationIds, station.id)"
              />
              <span class="text-sm text-white">{{ station.name }}</span>
              <span
                v-if="station.default_capacity"
                class="ml-auto text-xs text-white/40"
                >{{ station.default_capacity }} posti</span
              >
            </label>
            <p
              v-if="!configuration.stations.length"
              class="text-sm text-white/45"
            >
              Nessuna postazione attiva nel catalogo.
            </p>
          </div>
        </UCard>

        <UCard class="border border-white/10 bg-white/[0.04]">
          <h2 class="font-display text-xl font-semibold text-white">
            Attività offerte
          </h2>
          <p class="mt-2 text-sm text-white/50">
            Puoi sovrascrivere contenuti, capienza, orari e modalità d’accesso
            per questo evento.
          </p>
          <div class="mt-6 space-y-3">
            <label
              v-for="activity in configuration.activities"
              :key="activity.id"
              class="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 p-3 hover:border-white/25"
            >
              <input
                :checked="selectedActivityIds.includes(activity.id)"
                type="checkbox"
                class="accent-brand-blue-500"
                @change="toggleValue(selectedActivityIds, activity.id)"
              />
              <span class="text-sm text-white">{{ activity.name }}</span>
            </label>
            <p
              v-if="!configuration.activities.length"
              class="text-sm text-white/45"
            >
              Nessuna attività attiva nel catalogo.
            </p>
          </div>
        </UCard>
      </section>

      <section class="grid gap-8 lg:grid-cols-2">
        <UCard class="border border-white/10 bg-white/[0.04]">
          <h2 class="font-display text-xl font-semibold text-white">
            Override postazioni
          </h2>
          <div v-if="selectedStationIds.length" class="mt-6 space-y-5">
            <div
              v-for="stationId in selectedStationIds"
              :key="stationId"
              class="space-y-3 rounded-2xl border border-white/10 p-4"
            >
              <h3 class="font-medium text-white">
                {{
                  configuration.stations.find((item) => item.id === stationId)
                    ?.name
                }}
              </h3>
              <UFormField
                label="Nome pubblico"
                :name="`station-name-${stationId}`"
              >
                <UInput
                  v-model="stationOverride(stationId).publicName"
                  class="w-full"
                  placeholder="Usa il nome globale"
                />
              </UFormField>
              <UFormField
                label="Descrizione"
                :name="`station-description-${stationId}`"
              >
                <UTextarea
                  v-model="stationOverride(stationId).description"
                  class="w-full"
                  :rows="2"
                />
              </UFormField>
              <UFormField
                label="Capienza override"
                :name="`station-capacity-${stationId}`"
              >
                <UInput
                  v-model.number="stationOverride(stationId).capacity"
                  type="number"
                  min="1"
                  class="w-full"
                />
              </UFormField>
              <div class="flex flex-wrap gap-4">
                <UCheckbox
                  v-model="stationOverride(stationId).isPublic"
                  label="Pubblica"
                />
                <UCheckbox
                  v-model="stationOverride(stationId).active"
                  label="Attiva"
                />
              </div>
            </div>
          </div>
          <p v-else class="mt-6 text-sm text-white/45">
            Seleziona una postazione sopra per configurarla.
          </p>
        </UCard>

        <UCard class="border border-white/10 bg-white/[0.04]">
          <h2 class="font-display text-xl font-semibold text-white">
            Override attività
          </h2>
          <div v-if="selectedActivityIds.length" class="mt-6 space-y-5">
            <div
              v-for="activityId in selectedActivityIds"
              :key="activityId"
              class="space-y-3 rounded-2xl border border-white/10 p-4"
            >
              <h3 class="font-medium text-white">
                {{
                  configuration.activities.find(
                    (item) => item.id === activityId,
                  )?.name
                }}
              </h3>
              <UFormField
                label="Nome pubblico"
                :name="`activity-name-${activityId}`"
              >
                <UInput
                  v-model="activityOverride(activityId).publicName"
                  class="w-full"
                  placeholder="Usa il nome globale"
                />
              </UFormField>
              <UFormField
                label="Descrizione"
                :name="`activity-description-${activityId}`"
              >
                <UTextarea
                  v-model="activityOverride(activityId).description"
                  class="w-full"
                  :rows="2"
                />
              </UFormField>
              <div class="grid gap-3 sm:grid-cols-2">
                <UFormField
                  label="Modalità d’accesso"
                  :name="`activity-mode-${activityId}`"
                >
                  <select
                    v-model="activityOverride(activityId).accessMode"
                    class="vrsus-select w-full"
                  >
                    <option value="free_play">Free play</option>
                    <option value="scheduled">Orario programmato</option>
                    <option value="registration_required">
                      Registrazione richiesta
                    </option>
                    <option value="tournament">Torneo</option>
                  </select>
                </UFormField>
                <UFormField
                  label="Capienza override"
                  :name="`activity-capacity-${activityId}`"
                >
                  <UInput
                    v-model.number="activityOverride(activityId).capacity"
                    type="number"
                    min="1"
                    class="w-full"
                  />
                </UFormField>
                <UFormField
                  label="Inizio attività"
                  :name="`activity-start-${activityId}`"
                >
                  <UInput
                    v-model="activityOverride(activityId).startsAt"
                    type="datetime-local"
                    class="w-full"
                  />
                </UFormField>
                <UFormField
                  label="Fine attività"
                  :name="`activity-end-${activityId}`"
                >
                  <UInput
                    v-model="activityOverride(activityId).endsAt"
                    type="datetime-local"
                    class="w-full"
                  />
                </UFormField>
              </div>
              <div class="flex flex-wrap gap-4">
                <UCheckbox
                  v-model="activityOverride(activityId).isPublic"
                  label="Pubblica"
                />
                <UCheckbox
                  v-model="activityOverride(activityId).active"
                  label="Attiva"
                />
              </div>
            </div>
          </div>
          <p v-else class="mt-6 text-sm text-white/45">
            Seleziona un’attività sopra per configurarla.
          </p>
        </UCard>
      </section>

      <UCard class="border border-white/10 bg-white/[0.04]">
        <h2 class="font-display text-xl font-semibold text-white">
          Associa attività e postazioni
        </h2>
        <p class="mt-2 text-sm text-white/50">
          Seleziona le postazioni su cui ogni attività sarà disponibile. Le
          combinazioni non selezionate non vengono esposte.
        </p>
        <div
          v-if="selectedActivityIds.length && selectedStationIds.length"
          class="mt-6 space-y-4"
        >
          <div
            v-for="activityId in selectedActivityIds"
            :key="activityId"
            class="rounded-2xl border border-white/10 p-4"
          >
            <h3 class="font-medium text-white">
              {{
                configuration.activities.find((item) => item.id === activityId)
                  ?.name
              }}
            </h3>
            <div class="mt-3 flex flex-wrap gap-2">
              <label
                v-for="stationId in selectedStationIds"
                :key="stationId"
                class="flex cursor-pointer items-center gap-2 rounded-xl bg-white/[0.05] px-3 py-2 text-sm text-white/70"
              >
                <input
                  :checked="isMappingSelected(activityId, stationId)"
                  type="checkbox"
                  class="accent-brand-blue-500"
                  @change="toggleMapping(activityId, stationId)"
                />
                {{
                  configuration.stations.find((item) => item.id === stationId)
                    ?.name
                }}
              </label>
            </div>
          </div>
        </div>
        <p v-else class="mt-6 text-sm text-white/45">
          Seleziona almeno una postazione e un’attività per creare le
          associazioni.
        </p>
      </UCard>

      <UAlert
        v-if="errorMessage"
        color="error"
        variant="subtle"
        :description="errorMessage"
      />
      <UAlert
        v-if="successMessage"
        color="success"
        variant="subtle"
        :description="successMessage"
      />
    </div>
  </main>
</template>
