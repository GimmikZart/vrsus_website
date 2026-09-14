<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { VrsusRole } from '~/composables/useVrsusAuth'
import {
  defaultTournamentForm,
  tournamentRulesPayload,
} from '~/composables/useTournamentForm'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
  requiredRoles: [
    'tournament_admin',
    'admin',
    'super_admin',
  ] satisfies VrsusRole[],
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

const { data: configuration } = await useFetch<Configuration>(
  `/api/admin/events/${eventId}/configuration`,
)

if (!configuration.value?.event) {
  throw createError({ statusCode: 404, statusMessage: 'Evento non trovato' })
}

const { data: schemes } = await useAsyncData(
  'admin-point-schemes',
  async () => {
    const { data } = await client
      .from('point_schemes')
      .select('id, name, slug')
      .eq('active', true)
      .order('name')
    return data ?? []
  },
  { default: () => [] },
)

// Solo le postazioni scelte per questo evento, e per ognuna solo i giochi resi
// disponibili: un torneo su un gioco che quel giorno non c'e non ha senso.
const eventPlatforms = computed(() => {
  const config = configuration.value
  if (!config) return []
  return config.eventPlatforms
    .filter((item) => item.active)
    .map((item) => ({
      id: item.platform_id,
      name:
        item.public_name ??
        config.platforms.find((platform) => platform.id === item.platform_id)
          ?.name ??
        'Postazione',
      eventPlatformId: item.id,
    }))
})

const form = reactive({
  platformId: '',
  gameId: '',
  time: '',
  maxEntries: 8 as number | undefined,
  pointSchemeId: '',
  status: 'registration_open',
  name: '',
  description: '',
  rules: '',
  checkinRequired: true,
  rankingEnabled: true,
  isPublic: true,
})

// I tre assi del torneo: stesso blocco della console tornei.
const rulesForm = reactive(defaultTournamentForm())

const availableGames = computed(() => {
  const config = configuration.value
  if (!config || !form.platformId) return []
  const eventPlatform = eventPlatforms.value.find(
    (item) => item.id === form.platformId,
  )
  if (!eventPlatform) return []
  const allowed = config.links
    .filter((link) => link.event_platform_id === eventPlatform.eventPlatformId)
    .map((link) => link.game_id)
  return config.games.filter((game) => allowed.includes(game.id))
})

watch(
  () => form.platformId,
  () => {
    if (!availableGames.value.some((game) => game.id === form.gameId)) {
      form.gameId = ''
    }
  },
)

// Cambiando struttura si propone lo schema di punti VRSUS coerente.
watch(
  () => rulesForm.format,
  (value) => {
    const slug =
      value === 'single_elimination'
        ? 'eliminazione-diretta-standard'
        : 'girone-standard'
    const match = schemes.value.find((scheme) => scheme.slug === slug)
    if (match) form.pointSchemeId = match.id
  },
  { immediate: true },
)

const statusOptions = [
  { value: 'draft', label: 'Bozza' },
  { value: 'registration_open', label: 'Iscrizioni aperte' },
  { value: 'registration_closed', label: 'Iscrizioni chiuse' },
]

const eventDayLabel = computed(() => {
  const startsAt = configuration.value?.event.starts_at
  if (!startsAt) return ''
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(startsAt))
})

/** L'orario si applica al giorno dell'evento: il giorno non si sceglie. */
function startsAtIso() {
  const startsAt = configuration.value?.event.starts_at
  if (!startsAt || !form.time) return null
  const [hours, minutes] = form.time.split(':').map(Number)
  if (hours === undefined || minutes === undefined) return null
  const day = new Date(startsAt)
  day.setHours(hours, minutes, 0, 0)
  return day.toISOString()
}

const pending = ref(false)
const errorMessage = ref('')

async function createTournament() {
  errorMessage.value = ''

  const game = availableGames.value.find((item) => item.id === form.gameId)
  if (!form.platformId || !game) {
    errorMessage.value = 'Scegli postazione e gioco.'
    return
  }

  // Il nome, se non viene scritto, e quello del gioco: nel contesto di un
  // evento e cosi che il torneo viene chiamato. Lo slug lo costruisce il
  // database da piattaforma, gioco e data.
  pending.value = true
  const { error } = await client.from('tournaments').insert({
    event_id: eventId,
    platform_id: form.platformId,
    game_id: game.id,
    point_scheme_id: form.pointSchemeId || null,
    name: form.name.trim() || game.name,
    description: form.description.trim() || null,
    rules: form.rules.trim() || null,
    status: form.status,
    ...tournamentRulesPayload(rulesForm),
    max_entries: form.maxEntries || null,
    checkin_required: form.checkinRequired,
    ranking_enabled: form.rankingEnabled,
    is_public: form.isPublic,
    starts_at: startsAtIso(),
  })
  pending.value = false

  if (error) {
    errorMessage.value = 'Creazione non riuscita. Controlla i dati.'
    return
  }

  await router.push(`/admin/eventi/${eventId}/modifica?step=tournaments`)
}

useSeoMeta({ title: 'Nuovo torneo — Admin VRSUS', robots: 'noindex, nofollow' })
</script>

<template>
  <div v-if="configuration">
    <NuxtLink
      :to="`/admin/eventi/${eventId}/modifica?step=tournaments`"
      class="text-sm text-white/45 hover:text-white"
    >
      ← {{ configuration.event.title }}
    </NuxtLink>

    <header class="mt-4">
      <h1 class="font-display text-2xl font-semibold text-white sm:text-3xl">
        Crea torneo
      </h1>
      <p class="mt-2 max-w-2xl text-sm text-white/50">
        Il torneo resta legato a questo evento e si gioca
        {{ eventDayLabel }}.
      </p>
    </header>

    <UAlert
      v-if="!eventPlatforms.length"
      class="mt-5"
      color="warning"
      variant="subtle"
      description="Nessuna postazione configurata per l evento: scegline almeno una nel passo Piattaforme."
    />

    <UAlert
      v-if="errorMessage"
      class="mt-5"
      color="error"
      variant="subtle"
      :description="errorMessage"
    />

    <form class="mt-5 space-y-5" @submit.prevent="createTournament">
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="Postazione">
          <select v-model="form.platformId" class="vrsus-select w-full">
            <option value="">Scegli…</option>
            <option
              v-for="platform in eventPlatforms"
              :key="platform.id"
              :value="platform.id"
            >
              {{ platform.name }}
            </option>
          </select>
        </UFormField>
        <UFormField label="Gioco">
          <select
            v-model="form.gameId"
            class="vrsus-select w-full"
            :disabled="!form.platformId"
          >
            <option value="">
              {{ form.platformId ? 'Scegli…' : 'Scegli prima una postazione' }}
            </option>
            <option
              v-for="game in availableGames"
              :key="game.id"
              :value="game.id"
            >
              {{ game.name }}
            </option>
          </select>
        </UFormField>
        <UFormField label="Orario di inizio">
          <UInput v-model="form.time" type="time" class="w-full" />
        </UFormField>
        <UFormField label="Numero massimo partecipanti">
          <UInput
            v-model.number="form.maxEntries"
            type="number"
            min="2"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Punti VRSUS"
          help="Punti della classifica generale, non del torneo."
        >
          <select v-model="form.pointSchemeId" class="vrsus-select w-full">
            <option value="">Nessuno schema</option>
            <option
              v-for="scheme in schemes"
              :key="scheme.id"
              :value="scheme.id"
            >
              {{ scheme.name }}
            </option>
          </select>
        </UFormField>
        <UFormField label="Stato">
          <select v-model="form.status" class="vrsus-select w-full">
            <option
              v-for="option in statusOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </UFormField>
      </div>

      <AdminTournamentRulesFields v-model="rulesForm" />

      <UFormField label="Nome" help="Vuoto: prende il nome del gioco.">
        <UInput v-model="form.name" class="w-full" />
      </UFormField>
      <UFormField label="Descrizione">
        <UTextarea v-model="form.description" :rows="4" class="w-full" />
      </UFormField>
      <UFormField
        label="Regole"
        help="Come si svolge il torneo, spiegato ai giocatori."
      >
        <UTextarea v-model="form.rules" :rows="6" class="w-full" />
      </UFormField>

      <div class="grid gap-3 sm:grid-cols-3">
        <UCheckbox v-model="form.checkinRequired" label="Check-in richiesto" />
        <UCheckbox
          v-model="form.rankingEnabled"
          label="Assegna punti ranking"
        />
        <UCheckbox v-model="form.isPublic" label="Visibile agli utenti" />
      </div>

      <div class="flex justify-end gap-2">
        <UButton
          :to="`/admin/eventi/${eventId}/modifica?step=tournaments`"
          color="neutral"
          variant="ghost"
          label="Annulla"
        />
        <UButton
          type="submit"
          color="primary"
          :loading="pending"
          label="Crea torneo"
        />
      </div>
    </form>
  </div>
</template>
