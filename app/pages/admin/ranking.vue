<script setup lang="ts">
import type { VrsusRole } from '~/composables/useVrsusAuth'

type RankingUser = {
  id: string
  display_name: string
}

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'super_admin'] satisfies VrsusRole[],
})

const client = useSupabaseClient()
const { data: users, error: usersError } = await useFetch<RankingUser[]>(
  '/api/admin/ranking-users',
  { default: () => [] },
)
const { data: games, error: gamesError } = await useAsyncData(
  'admin-ranking-games',
  async () => {
    const { data, error } = await client
      .from('games')
      .select('id, name')
      .eq('active', true)
      .is('archived_at', null)
      .order('name')
    if (error) throw error
    return data ?? []
  },
)

const form = reactive({
  userId: '',
  gameId: '',
  points: 0,
  reason: '',
  description: '',
})
const pending = ref(false)
const message = ref('')
const errorMessage = ref('')

async function adjustPoints() {
  if (!form.userId || !form.gameId || !form.points || !form.reason.trim()) {
    errorMessage.value = 'Compila utente, gioco, punti e motivazione.'
    return
  }

  pending.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    const { error } = await client.rpc('adjust_ranking_points', {
      p_user_id: form.userId,
      p_game_id: form.gameId,
      p_points: form.points,
      p_reason: form.reason.trim(),
      p_description: form.description.trim() || undefined,
    })
    if (error) throw error
    message.value = 'Aggiustamento ranking registrato e auditato.'
    form.points = 0
    form.reason = ''
    form.description = ''
  } catch {
    errorMessage.value =
      'Non è stato possibile registrare l’aggiustamento. Verifica ruolo e dati.'
  } finally {
    pending.value = false
  }
}

useSeoMeta({
  title: 'Aggiustamenti ranking — VRSUS',
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div>
    <NuxtLink to="/admin" class="text-sm text-white/45 hover:text-white"
      >← Console</NuxtLink
    >
    <header class="mt-6 max-w-3xl">
      <p
        class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
      >
        Operazione auditata
      </p>
      <h1 class="font-display mt-3 text-4xl font-semibold text-white">
        Aggiustamenti ranking
      </h1>
      <p class="mt-4 text-white/55">
        Ogni modifica crea una nuova voce nel ledger; non altera i risultati dei
        tornei già registrati.
      </p>
    </header>

    <UAlert
      v-if="message"
      class="mt-8"
      color="success"
      variant="subtle"
      :description="message"
    />
    <UAlert
      v-if="errorMessage || usersError || gamesError"
      class="mt-8"
      color="error"
      variant="subtle"
      :description="
        errorMessage || 'Non è stato possibile caricare i dati del ranking.'
      "
    />

    <UCard class="mt-10 border border-white/10 bg-white/[0.04]">
      <template #header>
        <h2 class="font-display text-xl font-semibold text-white">
          Nuovo aggiustamento
        </h2>
      </template>
      <div class="grid gap-4 md:grid-cols-2">
        <UFormField label="Utente" name="user">
          <USelect
            v-model="form.userId"
            :items="
              users.map((user) => ({
                label: user.display_name,
                value: user.id,
              }))
            "
            placeholder="Seleziona utente"
          />
        </UFormField>
        <UFormField label="Gioco" name="game">
          <USelect
            v-model="form.gameId"
            :items="
              (games ?? []).map((game) => ({
                label: game.name,
                value: game.id,
              }))
            "
            placeholder="Seleziona gioco"
          />
        </UFormField>
        <UFormField label="Punti" name="points">
          <UInput v-model.number="form.points" type="number" step="1" />
        </UFormField>
        <UFormField label="Motivazione" name="reason">
          <UInput v-model="form.reason" placeholder="Bonus evento" />
        </UFormField>
        <UFormField
          label="Descrizione"
          name="description"
          class="md:col-span-2"
        >
          <UTextarea
            v-model="form.description"
            :rows="3"
            placeholder="Dettaglio visibile nell'audit interno"
          />
        </UFormField>
      </div>
      <UButton
        class="mt-6"
        :loading="pending"
        color="primary"
        label="Registra aggiustamento"
        @click="adjustPoints"
      />
    </UCard>

    <p class="mt-6 text-sm text-white/45">
      I punti negativi sono consentiti per correggere un errore. Il ledger resta
      immutabile e l’operazione conserva attore, motivo e descrizione.
    </p>
  </div>
</template>
