<script setup lang="ts">
import type { Database } from '~/types/database.types'
import {
  createTournamentTeam,
  formatTournamentDate,
  joinTournamentTeam,
  registerTournamentEntry,
  tournamentRegistrationError,
} from '~/composables/useTournaments'
import { fetchPublicTournamentView } from '~/composables/useTournamentView'
import {
  teamOpenSlots,
  tournamentSummary,
} from '~~/shared/utils/tournament-standings'
import { getBookingErrorCode } from '~/composables/useBookings'

definePageMeta({ layout: 'app', middleware: ['auth'] })

const route = useRoute()
const client = useSupabaseClient<Database>()
const tournamentId = computed(() => String(route.params.id))

const { data: detail, refresh } = await useAsyncData(
  () => `tournament-signup-${tournamentId.value}`,
  () => fetchPublicTournamentView(tournamentId.value),
)

if (!detail.value) {
  throw createError({ statusCode: 404, statusMessage: 'Torneo non trovato' })
}

// Stessa guardia della prenotazione evento: si anticipa il motivo del blocco.
const { data: consent } = await useAsyncData(
  'my-consent-status-tournament',
  async () => {
    const { data } = await client.rpc('my_consent_status')
    return data?.[0] ?? null
  },
)

const blockedByConsent = computed(
  () => Boolean(consent.value?.is_minor) && !consent.value?.has_consent,
)

// Il torneo eredita il requisito dalla giornata che lo ospita: chi si iscrive
// lo legge qui, non alla porta.
const { data: arciStatus } = await useMyArciStatus()
const arciRequired = computed(() => Boolean(detail.value?.arciRequired))

const isTeam = computed(() => (detail.value?.entrySize ?? 1) > 1)
const summary = computed(() =>
  detail.value ? tournamentSummary(detail.value) : [],
)

// Squadre con ancora un posto libero: sono le uniche in cui si possa entrare.
const openTeams = computed(() => {
  const tournament = detail.value
  if (!tournament) return []
  return tournament.entries.filter(
    (entry) =>
      entry.status !== 'withdrawn' &&
      entry.visibility === 'open' &&
      teamOpenSlots(entry, tournament.entrySize) > 0,
  )
})

const teamForm = reactive({
  name: '',
  visibility: 'open' as 'open' | 'invite',
  code: '',
})

const pending = ref(false)
const errorMessage = ref('')

async function runSignup(action: () => Promise<unknown>) {
  pending.value = true
  errorMessage.value = ''
  try {
    await action()
    await navigateTo(`/app/tornei/${tournamentId.value}`)
  } catch (error) {
    const code = getBookingErrorCode(error)
    errorMessage.value =
      code === 'GUARDIAN_CONSENT_REQUIRED'
        ? 'Serve il consenso di un genitore o tutore prima di iscriverti.'
        : tournamentRegistrationError(error)
    await refresh()
  } finally {
    pending.value = false
  }
}

const confirm = () =>
  runSignup(() => registerTournamentEntry(tournamentId.value))

const createTeam = () =>
  runSignup(() =>
    createTournamentTeam(
      tournamentId.value,
      teamForm.name.trim(),
      detail.value?.teamFormation === 'invite' ? teamForm.visibility : 'open',
    ),
  )

const joinTeam = (entryId: string) =>
  runSignup(() => joinTournamentTeam({ entryId }))

const joinByCode = () =>
  runSignup(() => joinTournamentTeam({ code: teamForm.code.trim() }))

useSeoMeta({
  title: 'Conferma iscrizione — VRSUS',
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div v-if="detail" class="mx-auto max-w-lg space-y-6">
    <NuxtLink
      :to="`/app/tornei/${tournamentId}`"
      class="text-sm text-white/45 hover:text-white"
    >
      ← Annulla
    </NuxtLink>

    <div class="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
      <p
        class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
      >
        Conferma iscrizione
      </p>
      <h1 class="font-display mt-3 text-2xl font-semibold text-white">
        {{ detail.name }}
      </h1>

      <!-- La dinamica del torneo, prima di iscriversi. -->
      <ul class="mt-3 flex flex-wrap items-center gap-1.5">
        <li
          v-for="chip in summary"
          :key="chip"
          class="rounded-lg bg-white/[0.06] px-2 py-1 text-xs text-white/65"
        >
          {{ chip }}
        </li>
      </ul>

      <dl class="mt-6 space-y-4 border-t border-white/10 pt-6 text-sm">
        <div class="flex justify-between gap-4">
          <dt class="text-white/45">Gioco</dt>
          <dd class="text-right text-white/85">{{ detail.gameName ?? '—' }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-white/45">Quando</dt>
          <dd class="text-right text-white/85">
            {{ formatTournamentDate(detail.startsAt) }}
          </dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-white/45">Iscritti</dt>
          <dd class="text-right text-white/85">
            {{ detail.entriesCount }} / {{ detail.maxEntries ?? '∞' }}
          </dd>
        </div>
      </dl>

      <p
        v-if="detail.rules"
        class="mt-6 text-sm leading-6 whitespace-pre-line text-white/50"
      >
        {{ detail.rules }}
      </p>

      <p v-if="detail.checkinRequired" class="mt-4 text-sm text-white/50">
        Ricordati di fare il check-in prima dell’inizio: senza, il posto può
        essere riassegnato.
      </p>

      <UAlert
        v-if="arciRequired && !arciStatus?.card_valid"
        class="mt-6"
        color="warning"
        variant="subtle"
        icon="i-lucide-id-card"
        title="Serve la tessera ARCI"
        description="La giornata che ospita questo torneo richiede la tessera ARCI. Puoi farla da noi all’ingresso."
      />
      <p v-else-if="arciRequired" class="mt-4 text-sm text-emerald-300/85">
        Questa giornata richiede la tessera ARCI: la tua risulta valida.
      </p>

      <UAlert
        v-if="blockedByConsent"
        class="mt-6"
        color="warning"
        variant="subtle"
        title="Serve il consenso di un genitore"
        description="Hai meno di 18 anni e non risulta un consenso registrato."
      />

      <UAlert
        v-if="errorMessage"
        class="mt-6"
        color="error"
        variant="subtle"
        title="Iscrizione non riuscita"
        :description="errorMessage"
      />

      <UButton
        v-if="blockedByConsent"
        class="mt-6"
        to="/app/impostazioni"
        color="primary"
        size="lg"
        block
        label="Vai alle impostazioni"
      />

      <!-- Torneo in singolo: un solo pulsante. -->
      <UButton
        v-else-if="!isTeam"
        class="mt-6"
        color="primary"
        size="lg"
        block
        :loading="pending"
        label="Conferma iscrizione"
        @click="confirm"
      />

      <!-- Torneo a squadre composte dallo staff: qui non si fa nulla. -->
      <UAlert
        v-else-if="detail.teamFormation === 'admin'"
        class="mt-6"
        color="info"
        variant="subtle"
        title="Le squadre le compone lo staff"
        description="Presentati in sede: sarai assegnato a una squadra prima dell inizio."
      />

      <div v-else class="mt-6 space-y-6">
        <section>
          <h2 class="font-display text-base font-semibold text-white">
            Crea la tua squadra
          </h2>
          <p class="mt-1 text-sm text-white/50">
            Serve una squadra da {{ detail.entrySize }}: puoi crearla adesso e
            farti raggiungere.
          </p>
          <UFormField class="mt-3" label="Nome della squadra">
            <UInput
              v-model="teamForm.name"
              class="w-full"
              placeholder="Lascia vuoto per usare il tuo nickname"
            />
          </UFormField>
          <UFormField
            v-if="detail.teamFormation === 'invite'"
            class="mt-3"
            label="Chi puo entrare"
          >
            <select v-model="teamForm.visibility" class="vrsus-select w-full">
              <option value="invite">Solo chi ha il codice che ti diamo</option>
              <option value="open">Chiunque abbia bisogno di squadra</option>
            </select>
          </UFormField>
          <UButton
            class="mt-4"
            color="primary"
            size="lg"
            block
            :loading="pending"
            label="Crea la squadra"
            @click="createTeam"
          />
        </section>

        <section v-if="openTeams.length" class="border-t border-white/10 pt-6">
          <h2 class="font-display text-base font-semibold text-white">
            Entra in una squadra
          </h2>
          <ul class="mt-3 space-y-2">
            <li
              v-for="team in openTeams"
              :key="team.id"
              class="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
            >
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-white">
                  {{ team.displayName }}
                </p>
                <p class="truncate text-xs text-white/45">
                  {{
                    team.members.map((member) => member.displayName).join(' · ')
                  }}
                  ·
                  {{ teamOpenSlots(team, detail.entrySize) }} posti liberi
                </p>
              </div>
              <UButton
                size="sm"
                color="secondary"
                variant="soft"
                :loading="pending"
                label="Entra"
                @click="joinTeam(team.id)"
              />
            </li>
          </ul>
        </section>

        <section class="border-t border-white/10 pt-6">
          <h2 class="font-display text-base font-semibold text-white">
            Ho un codice
          </h2>
          <p class="mt-1 text-sm text-white/50">
            Il capitano di una squadra a invito ti ha passato sei caratteri.
          </p>
          <div class="mt-3 flex gap-2">
            <UInput
              v-model="teamForm.code"
              class="flex-1"
              placeholder="ABC123"
              maxlength="6"
              aria-label="Codice squadra"
            />
            <UButton
              color="neutral"
              variant="outline"
              :loading="pending"
              :disabled="teamForm.code.trim().length < 6"
              label="Entra"
              @click="joinByCode"
            />
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
