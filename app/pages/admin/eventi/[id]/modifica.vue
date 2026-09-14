<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { VrsusRole } from '~/composables/useVrsusAuth'
import {
  eventFormFromRow,
  eventFormToPayload,
  type EventFormState,
} from '~/composables/useEventForm'
import {
  formatTournamentDate,
  tournamentFormatLabel,
} from '~/composables/useTournaments'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'super_admin'] satisfies VrsusRole[],
})

type Configuration = {
  event: Database['public']['Tables']['events']['Row']
  platforms: Database['public']['Tables']['platforms']['Row'][]
  games: Database['public']['Tables']['games']['Row'][]
  eventPlatforms: Database['public']['Tables']['event_platforms']['Row'][]
  links: Database['public']['Tables']['event_platform_games']['Row'][]
}

const route = useRoute()
const router = useRouter()
const client = useSupabaseClient<Database>()
const eventId = String(route.params.id)

// Il dominio evento non ha grant per il browser (DEC-005): lettura e scrittura
// passano dagli endpoint service-role.
const { data: configuration, refresh } = await useFetch<Configuration>(
  `/api/admin/events/${eventId}/configuration`,
)

if (!configuration.value?.event) {
  throw createError({ statusCode: 404, statusMessage: 'Evento non trovato' })
}

const form = reactive<EventFormState>(
  eventFormFromRow(configuration.value.event),
)

const selectedPlatformIds = ref<string[]>([])
const selectedGames = ref<Record<string, string[]>>({})

function syncSelectionFromServer() {
  const config = configuration.value
  if (!config) return

  selectedPlatformIds.value = config.eventPlatforms
    .filter((item) => item.active)
    .map((item) => item.platform_id)

  const platformByEventPlatform = new Map(
    config.eventPlatforms.map((item) => [item.id, item.platform_id]),
  )
  const games: Record<string, string[]> = {}
  for (const link of config.links) {
    const platformId = platformByEventPlatform.get(link.event_platform_id)
    if (!platformId) continue
    games[platformId] = [...(games[platformId] ?? []), link.game_id]
  }
  selectedGames.value = games
}

syncSelectionFromServer()

const { data: tournaments, refresh: refreshTournaments } = await useAsyncData(
  `admin-event-tournaments-${eventId}`,
  async () => {
    const { data } = await client
      .from('tournaments')
      .select('*')
      .eq('event_id', eventId)
      .order('starts_at', { ascending: true, nullsFirst: false })
    return data ?? []
  },
  { default: () => [] },
)

const platformNameById = computed(
  () =>
    new Map(
      (configuration.value?.platforms ?? []).map((row) => [row.id, row.name]),
    ),
)
const gameNameById = computed(
  () =>
    new Map(
      (configuration.value?.games ?? []).map((row) => [row.id, row.name]),
    ),
)

const steps = [
  { value: 'info', label: 'Info', count: null },
  { value: 'platforms', label: 'Piattaforme', count: null },
  { value: 'tournaments', label: 'Tornei', count: null },
]

const requestedStep = String(route.query.step ?? '')
const step = ref(
  ['info', 'platforms', 'tournaments'].includes(requestedStep)
    ? requestedStep
    : 'info',
)

watch(step, (value) => {
  router.replace({ query: { ...route.query, step: value } })
})

const pending = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

async function saveInfo(nextStep?: string) {
  errorMessage.value = ''
  successMessage.value = ''
  const result = eventFormToPayload(form)
  if (result.error) {
    errorMessage.value = result.error
    return false
  }

  pending.value = true
  try {
    await $fetch(`/api/admin/events/${eventId}`, {
      method: 'PATCH',
      body: result.payload,
    })
    await refresh()
    if (nextStep) step.value = nextStep
    return true
  } catch (error) {
    errorMessage.value =
      (error as { statusCode?: number })?.statusCode === 409
        ? 'Esiste gia un evento con questo slug.'
        : 'Salvataggio non riuscito. Controlla i dati.'
    return false
  } finally {
    pending.value = false
  }
}

async function savePlatforms(nextStep?: string) {
  errorMessage.value = ''
  successMessage.value = ''
  pending.value = true
  try {
    await $fetch(`/api/admin/events/${eventId}/configuration`, {
      method: 'PUT',
      body: {
        platformIds: selectedPlatformIds.value,
        games: selectedGames.value,
      },
    })
    await refresh()
    syncSelectionFromServer()
    if (nextStep) step.value = nextStep
    return true
  } catch {
    errorMessage.value =
      'Configurazione non salvata: una postazione potrebbe essere gia in uso.'
    return false
  } finally {
    pending.value = false
  }
}

async function finish() {
  const saved = await saveInfo()
  if (saved) await router.push(`/admin/eventi/${eventId}`)
}

const removingId = ref<string | null>(null)

async function removeTournament(tournamentId: string) {
  removingId.value = tournamentId
  const { error } = await client
    .from('tournaments')
    .delete()
    .eq('id', tournamentId)
  removingId.value = null

  if (error) {
    errorMessage.value = 'Il torneo non e stato eliminato.'
    return
  }
  successMessage.value = 'Torneo eliminato.'
  await refreshTournaments()
}

useSeoMeta({
  title: () => `${form.title || 'Evento'} — Admin VRSUS`,
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div v-if="configuration">
    <NuxtLink to="/admin/eventi" class="text-sm text-white/45 hover:text-white">
      ← Eventi
    </NuxtLink>

    <header class="mt-4">
      <h1 class="font-display text-2xl font-semibold text-white sm:text-3xl">
        Modifica evento
      </h1>
      <p class="mt-2 max-w-2xl text-sm text-white/50">
        Informazioni della giornata, postazioni con i giochi disponibili e
        tornei in programma.
      </p>
    </header>

    <div class="sticky-tabs mt-5">
      <UiVrsusTabs v-model="step" :items="steps" />
    </div>

    <UAlert
      v-if="errorMessage"
      class="mt-4"
      color="error"
      variant="subtle"
      :description="errorMessage"
    />
    <UAlert
      v-if="successMessage"
      class="mt-4"
      color="success"
      variant="subtle"
      :description="successMessage"
    />

    <section v-if="step === 'info'" class="mt-5">
      <AdminEventInfoForm
        v-model="form"
        :pending="pending"
        @submit="saveInfo('platforms')"
      />
    </section>

    <section v-else-if="step === 'platforms'" class="mt-5">
      <AdminEventPlatformPicker
        v-model:selected-platforms="selectedPlatformIds"
        v-model:selected-games="selectedGames"
        :platforms="configuration.platforms"
        :games="configuration.games"
        :pending="pending"
        @submit="savePlatforms('tournaments')"
      />
    </section>

    <section v-else class="mt-5 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-white/50">
          I tornei creati qui restano legati a questo evento.
        </p>
        <UButton
          :to="`/admin/eventi/${eventId}/tornei/nuovo`"
          color="primary"
          size="sm"
          icon="i-lucide-plus"
          label="Crea torneo"
        />
      </div>

      <p v-if="!tournaments.length" class="text-sm text-white/45">
        Nessun torneo in programma per questo evento.
      </p>

      <ul v-else class="grid gap-3 sm:grid-cols-2">
        <li
          v-for="tournament in tournaments"
          :key="tournament.id"
          class="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate font-medium text-white">
                {{
                  tournament.game_id
                    ? (gameNameById.get(tournament.game_id) ?? tournament.name)
                    : tournament.name
                }}
              </p>
              <p class="mt-0.5 truncate text-sm text-white/50">
                {{
                  tournament.platform_id
                    ? (platformNameById.get(tournament.platform_id) ??
                      'Postazione')
                    : 'Postazione da definire'
                }}
              </p>
            </div>
            <UButton
              color="error"
              variant="ghost"
              size="xs"
              icon="i-lucide-trash-2"
              :loading="removingId === tournament.id"
              aria-label="Elimina torneo"
              @click="removeTournament(tournament.id)"
            />
          </div>

          <dl
            class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/45"
          >
            <div>{{ formatTournamentDate(tournament.starts_at) }}</div>
            <div>{{ tournamentFormatLabel(tournament.format) }}</div>
            <div>max {{ tournament.max_entries ?? '∞' }}</div>
          </dl>
        </li>
      </ul>

      <div class="flex justify-end pt-2">
        <UButton
          color="primary"
          :loading="pending"
          label="Salva evento"
          @click="finish"
        />
      </div>
    </section>
  </div>
</template>
