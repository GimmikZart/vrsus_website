<script setup lang="ts">
import type { TournamentFormState } from '~/composables/useTournamentForm'
import {
  TOURNAMENT_FORMAT_OPTIONS,
  TOURNAMENT_PRESETS,
  TOURNAMENT_RESULT_OPTIONS,
  TOURNAMENT_TEAM_OPTIONS,
  normalizeTournamentForm,
  previewSchedule,
  previewTournamentRules,
} from '~/composables/useTournamentForm'
import { tournamentSummary } from '~~/shared/utils/tournament-standings'

// Le tre domande che definiscono un torneo, nella maschera.
//
// Sopra ci sono i preset, che rispondono a tutte e tre in un colpo solo:
// nella maggior parte dei casi si sceglie una voce e si va avanti. Sotto
// restano i singoli campi, per i tornei che non assomigliano a nessun preset.
const props = defineProps<{
  /** Iscritti gia presenti, per l'anteprima del calendario. */
  entriesCount?: number
  /** A calendario generato la configurazione non si tocca piu. */
  disabled?: boolean
}>()

const form = defineModel<TournamentFormState>({ required: true })

const preset = ref('')

function applyPreset(value: string) {
  const found = TOURNAMENT_PRESETS.find((item) => item.value === value)
  if (!found) return
  Object.assign(form.value, found.apply)
  normalizeTournamentForm(form.value)
}

watch(preset, (value) => {
  if (value) applyPreset(value)
})

// Ogni cambiamento passa dalle stesse regole del database: cosi l'anteprima
// non promette un torneo diverso da quello che verra salvato.
watch(
  form,
  (value) => {
    normalizeTournamentForm(value)
  },
  { deep: true },
)

const rules = computed(() => previewTournamentRules(form.value))
const summary = computed(() => tournamentSummary(rules.value))
const schedule = computed(() =>
  previewSchedule(form.value, props.entriesCount ?? 0),
)

const isTeam = computed(() => form.value.entrySize > 1)
const usesRounds = computed(() =>
  ['heats', 'time_trial'].includes(form.value.format),
)
const usesPlacementPoints = computed(
  () => rules.value.standingMetric === 'placement_points',
)
const usesScoreDirection = computed(() => form.value.resultKind === 'points')
</script>

<template>
  <div class="space-y-5">
    <UFormField
      label="Tipo di torneo"
      help="Scegli il caso piu simile: puoi poi cambiare i singoli campi."
    >
      <select v-model="preset" class="vrsus-select w-full" :disabled="disabled">
        <option value="">Configurazione manuale…</option>
        <option
          v-for="option in TOURNAMENT_PRESETS"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
      <p v-if="preset" class="mt-1.5 text-xs text-white/45">
        {{
          TOURNAMENT_PRESETS.find((item) => item.value === preset)?.description
        }}
      </p>
    </UFormField>

    <!-- Chi gioca -->
    <fieldset class="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <legend
        class="px-1 text-[11px] font-semibold tracking-[0.16em] text-white/40 uppercase"
      >
        Chi gioca
      </legend>
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="Si gioca">
          <select
            v-model.number="form.entrySize"
            class="vrsus-select w-full"
            :disabled="disabled"
          >
            <option :value="1">In singolo</option>
            <option :value="2">In coppia</option>
            <option :value="3">Squadre da 3</option>
            <option :value="4">Squadre da 4</option>
            <option :value="5">Squadre da 5</option>
          </select>
        </UFormField>
        <UFormField v-if="isTeam" label="Come si formano le squadre">
          <select
            v-model="form.teamFormation"
            class="vrsus-select w-full"
            :disabled="disabled"
          >
            <option
              v-for="option in TOURNAMENT_TEAM_OPTIONS"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </UFormField>
      </div>
    </fieldset>

    <!-- Come ci si affronta -->
    <fieldset class="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <legend
        class="px-1 text-[11px] font-semibold tracking-[0.16em] text-white/40 uppercase"
      >
        Come ci si affronta
      </legend>
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="Struttura">
          <select
            v-model="form.format"
            class="vrsus-select w-full"
            :disabled="disabled"
          >
            <option
              v-for="option in TOURNAMENT_FORMAT_OPTIONS"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </UFormField>
        <UFormField
          v-if="form.format === 'heats'"
          label="Quanti giocano insieme"
          help="Quanti concorrenti stanno nella stessa partita."
        >
          <UInput
            v-model.number="form.groupSize"
            type="number"
            min="2"
            max="16"
            class="w-full"
            :disabled="disabled"
          />
        </UFormField>
        <UFormField v-if="usesRounds" label="Quante manche">
          <UInput
            v-model.number="form.roundsCount"
            type="number"
            min="1"
            max="30"
            class="w-full"
            :disabled="disabled"
          />
        </UFormField>
        <UFormField
          v-if="form.format === 'heats'"
          label="Composizione dei gruppi"
        >
          <select
            v-model="form.heatSeeding"
            class="vrsus-select w-full"
            :disabled="disabled"
          >
            <option value="rotation">Avversari sempre diversi</option>
            <option value="standings">
              Primi con primi, secondo la classifica
            </option>
          </select>
        </UFormField>
      </div>
    </fieldset>

    <!-- Come si vince -->
    <fieldset class="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <legend
        class="px-1 text-[11px] font-semibold tracking-[0.16em] text-white/40 uppercase"
      >
        Come si vince
      </legend>
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="Cosa si registra a fine partita">
          <select
            v-model="form.resultKind"
            class="vrsus-select w-full"
            :disabled="disabled"
          >
            <option
              v-for="option in TOURNAMENT_RESULT_OPTIONS"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </UFormField>
        <UFormField v-if="usesScoreDirection" label="Vince chi fa">
          <select
            v-model="form.scoreDirection"
            class="vrsus-select w-full"
            :disabled="disabled"
          >
            <option value="desc">Il punteggio piu alto</option>
            <option value="asc">Il punteggio piu basso</option>
          </select>
        </UFormField>
        <UFormField
          v-if="usesPlacementPoints"
          label="Punti per posizione"
          help="Dal primo all'ultimo, separati da barra: 10/8/6/4."
        >
          <UInput
            v-model="form.placementPoints"
            class="w-full"
            :placeholder="rules.placementPoints.join('/')"
            :disabled="disabled"
          />
        </UFormField>
        <UFormField
          v-if="['round_robin', 'double_round_robin'].includes(form.format)"
          label="Pareggio"
        >
          <label class="flex min-h-10 items-center gap-2 text-sm text-white/70">
            <input
              v-model="form.allowDraw"
              type="checkbox"
              class="size-4"
              :disabled="disabled"
            />
            Ammetti il pareggio
          </label>
        </UFormField>
      </div>
    </fieldset>

    <!--
      Riepilogo: e la stessa frase che leggeranno i giocatori nella scheda del
      torneo, generata dalla configurazione appena scelta.
    -->
    <div
      class="border-brand-blue-500/25 bg-brand-blue-500/[0.07] rounded-2xl border p-4"
    >
      <p
        class="text-brand-blue-200 text-[11px] font-semibold tracking-[0.16em] uppercase"
      >
        Come si giochera
      </p>
      <ul class="mt-2 flex flex-wrap items-center gap-1.5">
        <li
          v-for="chip in summary"
          :key="chip"
          class="rounded-lg bg-white/[0.07] px-2 py-1 text-xs text-white/75"
        >
          {{ chip }}
        </li>
      </ul>
      <p v-if="schedule" class="mt-2 text-xs text-white/45">
        Con {{ entriesCount }} iscritti: {{ schedule }}.
      </p>
    </div>
  </div>
</template>
