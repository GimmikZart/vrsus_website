<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { VrsusRole } from '~/composables/useVrsusAuth'

type Event = Database['public']['Tables']['events']['Row']
type Station = Database['public']['Tables']['stations']['Row']
type Activity = Database['public']['Tables']['activities']['Row']
type EventStation = Database['public']['Tables']['event_stations']['Row']
type EventActivity = Database['public']['Tables']['event_activities']['Row']
type EventStationActivity =
  Database['public']['Tables']['event_station_activities']['Row']

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
      mappingsResult,
    ] = await Promise.all([
      client.from('events').select('*').eq('id', eventId.value).single(),
      client.from('stations').select('*').eq('active', true).order('name'),
      client.from('activities').select('*').eq('active', true).order('name'),
      client.from('event_stations').select('*').eq('event_id', eventId.value),
      client.from('event_activities').select('*').eq('event_id', eventId.value),
      client
        .from('event_station_activities')
        .select('*')
        .in(
          'event_activity_id',
          (
            await client
              .from('event_activities')
              .select('id')
              .eq('event_id', eventId.value)
          ).data?.map((item) => item.id) ?? [
            '00000000-0000-0000-0000-000000000000',
          ],
        ),
    ])

    if (
      eventResult.error ||
      stationsResult.error ||
      activitiesResult.error ||
      eventStationsResult.error ||
      eventActivitiesResult.error ||
      mappingsResult.error
    ) {
      throw new Error('Impossibile caricare la configurazione evento.')
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
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

useSeoMeta({
  title: 'Configurazione evento — VRSUS',
  robots: 'noindex, nofollow',
})

function syncSelections() {
  if (!configuration.value) return
  selectedStationIds.value = configuration.value.eventStations
    .filter((item) => item.active)
    .map((item) => item.station_id)
  selectedActivityIds.value = configuration.value.eventActivities
    .filter((item) => item.active)
    .map((item) => item.activity_id)

  const eventStationById = new Map(
    configuration.value.eventStations.map((item) => [item.id, item.station_id]),
  )
  const mappingByActivity: Record<string, string[]> = {}
  for (const mapping of configuration.value.mappings) {
    const stationId = eventStationById.get(mapping.event_station_id)
    if (stationId) {
      mappingByActivity[mapping.event_activity_id] ??= []
      mappingByActivity[mapping.event_activity_id].push(stationId)
    }
  }
  mappingSelection.value = mappingByActivity
}

syncSelections()

function toggleValue(values: Ref<string[]>, value: string) {
  values.value = values.value.includes(value)
    ? values.value.filter((item) => item !== value)
    : [...values.value, value]
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

async function saveConfiguration() {
  if (!configuration.value) return
  errorMessage.value = ''
  successMessage.value = ''
  saving.value = true

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
            La capienza standard resta quella globale; gli override per evento
            saranno configurabili successivamente.
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
            Le attività verranno pubblicate solo se l’evento è pubblico e
            l’attività è selezionata qui.
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
