<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { VrsusRole } from '~/composables/useVrsusAuth'
import {
  formatTournamentDate,
  tournamentFormatLabel,
  tournamentStatusLabel,
} from '~/composables/useTournaments'
import {
  defaultTournamentForm,
  tournamentRulesPayload,
} from '~/composables/useTournamentForm'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
  requiredRoles: ['staff', 'admin'] satisfies VrsusRole[],
})

type PlatformPayload = {
  platforms: (Database['public']['Tables']['platforms']['Row'] & {
    games_count: number
  })[]
}

const client = useSupabaseClient<Database>()

// Le postazioni non hanno grant per il browser; eventi e giochi si leggono
// rispettivamente dalla view pubblica e dalla tabella con RLS.
const { data: platformPayload } = await useFetch<PlatformPayload>(
  '/api/admin/platforms',
)

const { data: events } = await useAsyncData(
  'admin-tournament-events',
  async () => {
    const { data } = await client
      .from('public_events')
      .select('id,title,starts_at')
      .order('starts_at')
    return data ?? []
  },
)

const { data: games } = await useAsyncData(
  'admin-tournament-games',
  async () => {
    const { data } = await client
      .from('games')
      .select('id,name,platform_id,image_path')
      .order('name')
    return data ?? []
  },
)

const { data: schemes } = await useAsyncData(
  'admin-point-schemes',
  async () => {
    const { data } = await client
      .from('point_schemes')
      .select('id,name,slug')
      .eq('active', true)
      .order('name')
    return data ?? []
  },
)

const {
  data: tournaments,
  status,
  refresh,
} = await useAsyncData('admin-tournaments', async () => {
  const { data, error } = await client
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
})

const creating = ref(false)
const pending = ref(false)
const message = ref('')
const errorMessage = ref('')

const form = reactive({
  eventId: '',
  platformId: '',
  gameId: '',
  pointSchemeId: '',
  name: '',
  description: '',
  rules: '',
  status: 'draft',
  maxEntries: 8,
  checkinRequired: true,
  rankingEnabled: true,
  isPublic: true,
  startsAt: '',
})

// I tre assi del torneo stanno in un blocco a parte, condiviso con la
// creazione dentro l'evento e con la modifica.
const rulesForm = reactive(defaultTournamentForm())

const gamesForPlatform = computed(() => {
  const list = games.value ?? []
  if (!form.platformId) return list
  return list.filter((game) => game.platform_id === form.platformId)
})

function gameImage(gameId: string | null) {
  return (
    (games.value ?? []).find((game) => game.id === gameId)?.image_path ?? null
  )
}

watch(
  () => form.platformId,
  () => {
    if (!gamesForPlatform.value.some((game) => game.id === form.gameId)) {
      form.gameId = ''
    }
  },
)

// Cambiando struttura si propone lo schema di punti VRSUS coerente, senza
// imporlo: sono i punti della classifica generale, non quelli del torneo.
watch(
  () => rulesForm.format,
  (value) => {
    const slug =
      value === 'single_elimination'
        ? 'eliminazione-diretta-standard'
        : 'girone-standard'
    const match = (schemes.value ?? []).find((scheme) => scheme.slug === slug)
    if (match) form.pointSchemeId = match.id
  },
  { immediate: true },
)

async function createTournament() {
  errorMessage.value = ''
  message.value = ''

  const name = form.name.trim()

  if (!name) {
    errorMessage.value = 'Nome del torneo obbligatorio.'
    return
  }
  if (!form.platformId || !form.gameId) {
    errorMessage.value = 'Scegli postazione e gioco.'
    return
  }

  pending.value = true
  const { error } = await client.from('tournaments').insert({
    // Un torneo puo esistere anche senza evento (DEC-021 non lo impone,
    // la specifica V2 lo richiede per la console).
    event_id: form.eventId || null,
    platform_id: form.platformId,
    game_id: form.gameId,
    point_scheme_id: form.pointSchemeId || null,
    name,
    description: form.description.trim() || null,
    rules: form.rules.trim() || null,
    status: form.status,
    ...tournamentRulesPayload(rulesForm),
    max_entries: form.maxEntries || null,
    checkin_required: form.checkinRequired,
    ranking_enabled: form.rankingEnabled,
    is_public: form.isPublic,
    starts_at: form.startsAt ? new Date(form.startsAt).toISOString() : null,
  })
  pending.value = false

  if (error) {
    errorMessage.value = 'Creazione non riuscita. Controlla i dati.'
    return
  }

  message.value = 'Torneo creato.'
  creating.value = false
  form.name = ''
  form.description = ''
  form.rules = ''
  await refresh()
}

function platformCode(id: string | null) {
  return (
    (platformPayload.value?.platforms ?? []).find((item) => item.id === id)
      ?.code ?? '—'
  )
}
function gameName(id: string | null) {
  return (games.value ?? []).find((item) => item.id === id)?.name ?? '—'
}

// Tre insiemi, tre schede: quello che sta succedendo adesso, quello che deve
// ancora succedere e quello che e passato.
const running = computed(() =>
  (tournaments.value ?? []).filter((item) => item.status === 'running'),
)
const scheduled = computed(() =>
  (tournaments.value ?? []).filter((item) =>
    ['draft', 'registration_open', 'registration_closed', 'checkin'].includes(
      item.status,
    ),
  ),
)
const past = computed(() =>
  (tournaments.value ?? []).filter((item) =>
    ['completed', 'cancelled'].includes(item.status),
  ),
)

// La scheda "In corso" compare solo quando c'e davvero qualcosa in corso.
const tabs = computed(() => [
  ...(running.value.length
    ? [{ value: 'running', label: 'In corso', count: running.value.length }]
    : []),
  { value: 'scheduled', label: 'In programma', count: scheduled.value.length },
  { value: 'past', label: 'Storico', count: past.value.length },
])

const activeTab = ref('scheduled')

watchEffect(() => {
  if (!tabs.value.some((tab) => tab.value === activeTab.value)) {
    activeTab.value = tabs.value[0]?.value ?? 'scheduled'
  }
})

const visibleTournaments = computed(() =>
  activeTab.value === 'running'
    ? running.value
    : activeTab.value === 'past'
      ? past.value
      : scheduled.value,
)

const emptyLabel = computed(() =>
  activeTab.value === 'running'
    ? 'Nessun torneo in corso.'
    : activeTab.value === 'past'
      ? 'Nessun torneo concluso.'
      : 'Nessun torneo in programma.',
)

usePageActions(
  computed(() =>
    creating.value
      ? [
          {
            label: 'Chiudi',
            icon: 'i-lucide-x',
            onClick: () => {
              creating.value = false
            },
          },
          {
            label: 'Crea torneo',
            icon: 'i-lucide-plus',
            color: 'primary' as const,
            onClick: createTournament,
            loading: pending.value,
            disabled:
              !form.name.trim() ||
              !form.platformId ||
              !form.gameId ||
              pending.value,
          },
        ]
      : [
          {
            label: 'Nuovo torneo',
            onClick: async () => {
              creating.value = true
              await nextTick()
              document
                .getElementById('new-tournament-form')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            },
          },
        ],
  ),
)

useSeoMeta({ title: 'Tornei — Admin VRSUS', robots: 'noindex, nofollow' })
</script>

<template>
  <div>
    <header
      class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <p
          class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
        >
          Competizioni
        </p>
        <h1 class="font-display mt-3 text-3xl font-semibold text-white">
          Tornei
        </h1>
        <p class="mt-2 max-w-2xl text-white/50">
          Un torneo può appartenere a un evento oppure esistere per conto suo.
        </p>
      </div>
    </header>

    <UAlert
      v-if="message"
      class="mt-6 max-w-xl"
      color="success"
      variant="subtle"
      :description="message"
    />

    <section
      v-if="creating"
      id="new-tournament-form"
      class="mt-6 scroll-mt-20 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="Nome"
          ><UInput v-model="form.name" class="w-full"
        /></UFormField>
        <UFormField
          label="Evento"
          help="Lascia vuoto per un torneo indipendente."
        >
          <select v-model="form.eventId" class="vrsus-select">
            <option value="">Nessun evento</option>
            <option
              v-for="item in events ?? []"
              :key="String(item.id)"
              :value="item.id"
            >
              {{ item.title }}
            </option>
          </select>
        </UFormField>
        <UFormField label="Postazione">
          <select v-model="form.platformId" class="vrsus-select">
            <option value="">Scegli…</option>
            <option
              v-for="platform in platformPayload?.platforms ?? []"
              :key="platform.id"
              :value="platform.id"
            >
              {{ platform.name }}
            </option>
          </select>
        </UFormField>
        <UFormField label="Gioco">
          <select v-model="form.gameId" class="vrsus-select">
            <option value="">Scegli…</option>
            <option
              v-for="game in gamesForPlatform"
              :key="game.id"
              :value="game.id"
            >
              {{ game.name }}
            </option>
          </select>
        </UFormField>
        <UFormField label="Data e ora">
          <UInput
            v-model="form.startsAt"
            type="datetime-local"
            class="w-full"
          />
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
          help="Sono i punti della classifica generale, non quelli del torneo."
        >
          <select v-model="form.pointSchemeId" class="vrsus-select">
            <option value="">Nessuno schema</option>
            <option
              v-for="scheme in schemes ?? []"
              :key="scheme.id"
              :value="scheme.id"
            >
              {{ scheme.name }}
            </option>
          </select>
        </UFormField>
        <UFormField label="Stato">
          <select v-model="form.status" class="vrsus-select">
            <option value="draft">Bozza</option>
            <option value="registration_open">Iscrizioni aperte</option>
            <option value="registration_closed">Iscrizioni chiuse</option>
          </select>
        </UFormField>
      </div>

      <AdminTournamentRulesFields v-model="rulesForm" class="mt-5" />

      <UFormField class="mt-5" label="Descrizione">
        <UTextarea v-model="form.description" :rows="4" class="w-full" />
      </UFormField>
      <UFormField
        class="mt-4"
        label="Regole del torneo"
        help="Come si svolge la serata, spiegato ai giocatori."
      >
        <UTextarea v-model="form.rules" :rows="6" class="w-full" />
      </UFormField>

      <div class="mt-4 flex flex-wrap gap-5 text-sm text-white/70">
        <label class="flex items-center gap-2">
          <input
            v-model="form.checkinRequired"
            type="checkbox"
            class="size-4"
          />
          Check-in richiesto
        </label>
        <label class="flex items-center gap-2">
          <input v-model="form.rankingEnabled" type="checkbox" class="size-4" />
          Assegna punti ranking
        </label>
        <label class="flex items-center gap-2">
          <input v-model="form.isPublic" type="checkbox" class="size-4" />
          Visibile agli utenti
        </label>
      </div>

      <UAlert
        v-if="errorMessage"
        class="mt-4"
        color="error"
        variant="subtle"
        :description="errorMessage"
      />
    </section>

    <div v-if="status === 'pending'" class="mt-8 space-y-3">
      <div
        v-for="index in 4"
        :key="index"
        class="h-24 animate-pulse rounded-2xl bg-white/[0.03]"
      />
    </div>

    <template v-else>
      <div class="sticky-tabs mt-8">
        <UiVrsusTabs v-model="activeTab" :items="tabs" />
      </div>

      <p v-if="!visibleTournaments.length" class="mt-4 text-sm text-white/45">
        {{ emptyLabel }}
      </p>

      <div
        v-else
        v-vrsus-motion="{ preset: 'cards', key: activeTab }"
        class="mt-4 grid gap-3 sm:grid-cols-2"
      >
        <NuxtLink
          v-for="tournament in visibleTournaments"
          :key="tournament.id"
          :to="`/admin/tornei/${tournament.id}`"
          class="flex overflow-hidden rounded-2xl border transition-colors"
          :class="
            tournament.status === 'running'
              ? 'border-brand-red-500/40 bg-brand-red-500/[0.06] hover:border-brand-red-500/60'
              : 'border-white/10 bg-white/[0.03] hover:border-white/25'
          "
        >
          <UiVrsusEntityImage
            :src="gameImage(tournament.game_id)"
            :alt="gameName(tournament.game_id)"
            class="w-24 shrink-0 sm:w-28"
          />
          <div class="min-w-0 flex-1 p-4">
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] tracking-wide text-white/70 uppercase"
              >
                {{ tournamentStatusLabel(tournament.status) }}
              </span>
              <span
                class="rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-semibold text-white/70"
              >
                {{ platformCode(tournament.platform_id) }}
              </span>
              <span
                v-if="!tournament.event_id"
                class="text-[11px] text-white/40"
              >
                Indipendente
              </span>
            </div>
            <p class="font-display mt-3 font-semibold text-white">
              {{ tournament.name }}
            </p>
            <p class="mt-1 text-sm text-white/50">
              {{ gameName(tournament.game_id) }}
            </p>
            <p class="mt-2 text-xs text-white/40">
              {{ tournamentFormatLabel(tournament.format) }} ·
              {{ formatTournamentDate(tournament.starts_at) }}
            </p>
          </div>
        </NuxtLink>
      </div>
    </template>
  </div>
</template>
