<script setup lang="ts">
type Platform = {
  id: string
  name: string
  code: string | null
  image_path: string | null
  internal: boolean
}

type Game = {
  id: string
  platform_id: string
  name: string
  image_path: string | null
}

// Secondo passo del wizard: quali postazioni ci sono in questa giornata e, per
// ognuna, quali giochi. La lista dei giochi sta dentro la card della
// postazione: e li che la scelta ha senso.
const props = defineProps<{
  platforms: Platform[]
  games: Game[]
  pending?: boolean
  showAction?: boolean
}>()

const emit = defineEmits<{ submit: [] }>()

// I model hanno nomi diversi dalle prop del catalogo: `defineModel('platforms')`
// dichiarerebbe una prop omonima e andrebbe in conflitto.
const selectedPlatforms = defineModel<string[]>('selectedPlatforms', {
  required: true,
})
const selectedGames = defineModel<Record<string, string[]>>('selectedGames', {
  required: true,
})

const expanded = ref<string[]>([])

function isSelected(platformId: string) {
  return selectedPlatforms.value.includes(platformId)
}

function togglePlatform(platformId: string) {
  // Lo stato successivo si calcola prima di scrivere: rileggere il model
  // subito dopo l'assegnazione puo restituire ancora il valore vecchio.
  const willSelect = !isSelected(platformId)
  selectedPlatforms.value = willSelect
    ? [...selectedPlatforms.value, platformId]
    : selectedPlatforms.value.filter((id) => id !== platformId)

  // Aprire la card appena selezionata evita il secondo tocco per arrivare ai
  // giochi, che e il motivo per cui si sta selezionando la postazione.
  if (willSelect && !expanded.value.includes(platformId)) {
    expanded.value = [...expanded.value, platformId]
  }
}

function toggleExpanded(platformId: string) {
  expanded.value = expanded.value.includes(platformId)
    ? expanded.value.filter((id) => id !== platformId)
    : [...expanded.value, platformId]
}

function gamesOf(platformId: string) {
  return props.games.filter((game) => game.platform_id === platformId)
}

function isGameSelected(platformId: string, gameId: string) {
  return (selectedGames.value[platformId] ?? []).includes(gameId)
}

function toggleGame(platformId: string, gameId: string) {
  const current = selectedGames.value[platformId] ?? []
  selectedGames.value = {
    ...selectedGames.value,
    [platformId]: current.includes(gameId)
      ? current.filter((id) => id !== gameId)
      : [...current, gameId],
  }
}
</script>

<template>
  <div class="space-y-4">
    <p v-if="!platforms.length" class="text-sm text-white/45">
      Non ci sono postazioni a catalogo. Creale da Postazioni.
    </p>

    <ul v-else v-vrsus-motion="'cards'" class="grid gap-3 sm:grid-cols-2">
      <li
        v-for="platform in platforms"
        :key="platform.id"
        class="rounded-2xl border p-4 transition-colors"
        :class="
          isSelected(platform.id)
            ? 'border-brand-red-500/40 bg-brand-red-500/[0.06]'
            : 'border-white/10 bg-white/[0.03]'
        "
      >
        <div class="flex items-start gap-3">
          <UCheckbox
            :model-value="isSelected(platform.id)"
            :aria-label="`Includi ${platform.name}`"
            @update:model-value="togglePlatform(platform.id)"
          />
          <span
            class="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/[0.06]"
          >
            <img
              v-if="platform.image_path"
              :src="platform.image_path"
              :alt="platform.name"
              class="size-full object-cover"
            />
            <UIcon
              v-else
              name="i-lucide-monitor"
              class="size-5 text-white/40"
            />
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate font-medium text-white">{{ platform.name }}</p>
            <p class="mt-0.5 text-xs text-white/45">
              <span v-if="platform.code">{{ platform.code }} · </span>
              {{ (selectedGames[platform.id] ?? []).length }} /
              {{ gamesOf(platform.id).length }} giochi
            </p>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            :icon="
              expanded.includes(platform.id)
                ? 'i-lucide-chevron-up'
                : 'i-lucide-chevron-down'
            "
            :aria-label="`Mostra i giochi di ${platform.name}`"
            @click="toggleExpanded(platform.id)"
          />
        </div>

        <UiVrsusCollapse :open="expanded.includes(platform.id)">
          <div class="mt-3 space-y-1.5">
            <p
              v-if="!gamesOf(platform.id).length"
              class="text-xs text-white/35"
            >
              Nessun gioco a catalogo per questa postazione.
            </p>
            <label
              v-for="game in gamesOf(platform.id)"
              :key="game.id"
              class="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-lg px-1 text-sm text-white/75"
            >
              <UCheckbox
                :model-value="isGameSelected(platform.id, game.id)"
                :disabled="!isSelected(platform.id)"
                @update:model-value="toggleGame(platform.id, game.id)"
              />
              <UiVrsusEntityImage
                :src="game.image_path"
                :alt="game.name"
                class="size-9 shrink-0 rounded-lg"
              />
              <span class="truncate">{{ game.name }}</span>
            </label>
          </div>
        </UiVrsusCollapse>
      </li>
    </ul>

    <div v-if="showAction !== false" class="flex justify-end">
      <UButton
        color="primary"
        :loading="pending"
        trailing-icon="i-lucide-arrow-right"
        label="Avanti"
        @click="emit('submit')"
      />
    </div>
  </div>
</template>
