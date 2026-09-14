<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { VrsusRole } from '~/composables/useVrsusAuth'
import type { ProfileDetailView } from '~~/shared/types/profile-view'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
  requiredRoles: ['staff', 'admin', 'super_admin'] satisfies VrsusRole[],
})

const route = useRoute()
const userId = String(route.params.id)

const {
  data: profile,
  error,
  refresh,
} = await useFetch<ProfileDetailView>(`/api/admin/users/${userId}`)

if (error.value || !profile.value) {
  throw createError({ statusCode: 404, statusMessage: 'Utente non trovato' })
}

// Tessera ARCI: la spunta la mette lo staff dopo aver visto la tessera, qui o
// alla porta durante il check-in. Il database rifiuta l autocertificazione.
const client = useSupabaseClient<Database>()
const arciPending = ref(false)
const arciError = ref('')

async function setArciCard(valid: boolean) {
  arciPending.value = true
  arciError.value = ''

  const { error: rpcError } = await client.rpc('set_arci_card', {
    p_user_id: userId,
    p_valid: valid,
  })

  arciPending.value = false

  if (rpcError) {
    arciError.value = 'Non e stato possibile aggiornare la tessera.'
    return
  }

  await refresh()
}

const arciVerifiedLabel = computed(() => {
  const value = profile.value?.arciVerifiedAt
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
})

const activeTab = ref('eventi')

const tabs = computed(() => [
  {
    value: 'eventi',
    label: 'Eventi',
    count: profile.value?.events.length ?? 0,
  },
  {
    value: 'tornei',
    label: 'Tornei',
    count: profile.value?.tournaments.length ?? 0,
  },
  {
    value: 'ranking',
    label: 'Ranking',
    count: profile.value?.ranking.length ?? 0,
  },
])

useSeoMeta({
  title: () =>
    `${profile.value?.nickname ?? profile.value?.displayName ?? 'Utente'} — Admin VRSUS`,
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div v-if="profile" class="space-y-6">
    <NuxtLink to="/admin/utenti" class="text-sm text-white/45 hover:text-white">
      ← Utenti
    </NuxtLink>

    <ProfileHeader :profile="profile">
      <template #actions>
        <div class="text-right">
          <UButton
            :color="profile.arciCardValid ? 'neutral' : 'primary'"
            :variant="profile.arciCardValid ? 'outline' : 'solid'"
            icon="i-lucide-id-card"
            :loading="arciPending"
            :label="
              profile.arciCardValid ? 'Revoca tessera' : 'Registra tessera ARCI'
            "
            @click="setArciCard(!profile.arciCardValid)"
          />
          <p v-if="arciVerifiedLabel" class="mt-2 text-xs text-white/40">
            Vista il {{ arciVerifiedLabel }}
          </p>
          <p v-if="arciError" class="mt-2 text-xs text-red-300">
            {{ arciError }}
          </p>
        </div>
      </template>
    </ProfileHeader>

    <div class="sticky-tabs">
      <UiVrsusTabs v-model="activeTab" :items="tabs" />
    </div>

    <ProfileEventsTab
      v-if="activeTab === 'eventi'"
      :events="profile.events"
      event-base-path="/admin/eventi"
    />
    <ProfileTournamentsTab
      v-else-if="activeTab === 'tornei'"
      :tournaments="profile.tournaments"
      tournament-base-path="/admin/tornei"
    />
    <ProfileRankingTab v-else :ranking="profile.ranking" />
  </div>
</template>
