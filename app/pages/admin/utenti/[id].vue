<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { VrsusRole } from '~/composables/useVrsusAuth'
import type { ProfileDetailView } from '~~/shared/types/profile-view'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
  requiredRoles: ['staff', 'admin'] satisfies VrsusRole[],
})

const route = useRoute()
const userId = String(route.params.id)
const { isAdmin } = useVrsusAuth()
const { operationalMode } = useRoleMode()
const adminMode = computed(
  () => isAdmin.value && operationalMode.value === 'admin',
)

const {
  data: profile,
  error,
  refresh,
} = await useFetch<ProfileDetailView>(`/api/admin/users/${userId}`)

if (error.value || !profile.value) {
  throw createError({ statusCode: 404, statusMessage: 'Utente non trovato' })
}

const client = useSupabaseClient<Database>()
const arciPending = ref(false)
const arciError = ref('')
const arciSheetOpen = ref(false)

async function setArciCard(valid: boolean) {
  arciPending.value = true
  arciError.value = ''
  const { error: rpcError } = await client.rpc('set_arci_card', {
    p_user_id: userId,
    p_valid: valid,
  })
  arciPending.value = false
  if (rpcError) {
    arciError.value = 'Non è stato possibile aggiornare la tessera.'
    return
  }
  await refresh()
  arciSheetOpen.value = false
}

const roleSheetOpen = ref(false)
const desiredStaff = ref(false)
const desiredAdmin = ref(false)
const rolePending = ref(false)
const roleError = ref('')

function openRoleSheet() {
  const roles = profile.value?.roles ?? []
  desiredStaff.value = roles.includes('staff')
  desiredAdmin.value = roles.includes('admin')
  roleError.value = ''
  roleSheetOpen.value = true
}

watch(desiredAdmin, (enabled) => {
  if (enabled) desiredStaff.value = true
})

async function changeRole(roleCode: VrsusRole, assign: boolean) {
  await $fetch('/api/admin/roles', {
    method: 'POST',
    body: { userId, roleCode, assign },
  })
}

async function saveRoles() {
  const current = profile.value?.roles ?? []
  rolePending.value = true
  roleError.value = ''
  try {
    if (current.includes('admin') && !desiredAdmin.value) {
      await changeRole('admin', false)
    }
    if (current.includes('staff') && !desiredStaff.value) {
      await changeRole('staff', false)
    }
    if (!current.includes('staff') && desiredStaff.value) {
      await changeRole('staff', true)
    }
    if (!current.includes('admin') && desiredAdmin.value) {
      await changeRole('admin', true)
    }
    await refresh()
    roleSheetOpen.value = false
  } catch {
    roleError.value = 'La modifica dei ruoli è stata rifiutata.'
  } finally {
    rolePending.value = false
  }
}

const isBanned = computed(() => {
  const value = profile.value?.bannedUntil
  return value ? new Date(value).getTime() > Date.now() : false
})
const banSheetOpen = ref(false)
const banPending = ref(false)
const banError = ref('')

function openBanSheet() {
  banError.value = ''
  banSheetOpen.value = true
}

async function updateBan() {
  banPending.value = true
  banError.value = ''
  try {
    await $fetch(`/api/admin/users/${userId}/ban`, {
      method: 'POST',
      body: { banned: !isBanned.value },
    })
    await refresh()
    banSheetOpen.value = false
  } catch (requestError) {
    const statusMessage = (
      requestError as { data?: { statusMessage?: string } }
    ).data?.statusMessage
    banError.value =
      statusMessage === 'SELF_BAN_NOT_ALLOWED'
        ? 'Non puoi bannare il tuo stesso account.'
        : 'Non è stato possibile aggiornare lo stato dell’account.'
  } finally {
    banPending.value = false
  }
}

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

const profileName = computed(
  () => profile.value?.nickname ?? profile.value?.displayName ?? 'Utente',
)

usePageActions(
  computed(() => [
    {
      label: 'Invia notifica',
      icon: 'i-lucide-send',
      to: {
        path: '/admin/notifiche',
        query: { userId, userName: profileName.value },
      },
    },
    ...(adminMode.value
      ? [
          {
            label: 'Assegna ruoli',
            icon: 'i-lucide-shield-user',
            onClick: openRoleSheet,
          },
          {
            label: isBanned.value ? 'Rimuovi ban' : 'Banna utente',
            icon: isBanned.value ? 'i-lucide-shield-check' : 'i-lucide-ban',
            color: (isBanned.value ? 'neutral' : 'error') as
              'neutral' | 'error',
            onClick: openBanSheet,
          },
        ]
      : []),
    {
      label: 'Ranking',
      icon: 'i-lucide-trophy',
      to: {
        path: '/admin/ranking',
        query: { userId, userName: profileName.value },
      },
    },
  ]),
)

useSeoMeta({
  title: () => `${profileName.value} — Admin VRSUS`,
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div v-if="profile" class="space-y-6">
    <NuxtLink to="/admin/utenti" class="text-sm text-white/45 hover:text-white">
      ← Utenti
    </NuxtLink>

    <UAlert
      v-if="isBanned"
      color="error"
      variant="subtle"
      title="Account bannato"
      description="L’utente non può accedere finché il ban non viene rimosso."
    />

    <ProfileHeader
      :profile="profile"
      :arci-pending="arciPending"
      @request-arci="arciSheetOpen = true"
    />

    <p v-if="arciError" class="text-xs text-red-300">{{ arciError }}</p>

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

    <UiVrsusBottomSheet
      v-model="arciSheetOpen"
      title="Registra tessera ARCI"
      :description="`Confermi di aver verificato la tessera ARCI di ${profileName}?`"
      :pending="arciPending"
    >
      <div class="space-y-4">
        <p class="text-sm leading-6 text-white/60">
          La tessera verrà registrata come valida per la stagione associativa
          corrente.
        </p>
        <UButton
          color="primary"
          class="w-full justify-center"
          label="Sì, registra tessera"
          :loading="arciPending"
          @click="setArciCard(true)"
        />
      </div>
    </UiVrsusBottomSheet>

    <UiVrsusBottomSheet
      v-model="roleSheetOpen"
      title="Assegna ruoli"
      :description="`Ruoli operativi di ${profileName}. Il ruolo User resta sempre attivo.`"
      :pending="rolePending"
    >
      <form class="space-y-3" @submit.prevent="saveRoles">
        <div
          class="flex min-h-14 items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4"
        >
          <div>
            <p class="font-medium text-white">User</p>
            <p class="text-xs text-white/40">Ruolo base obbligatorio</p>
          </div>
          <UIcon name="i-lucide-check" class="size-5 text-emerald-300" />
        </div>
        <label
          class="flex min-h-14 items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4"
        >
          <div>
            <p class="font-medium text-white">Staff</p>
            <p class="text-xs text-white/40">Live, tornei, utenti e ranking</p>
          </div>
          <UCheckbox v-model="desiredStaff" aria-label="Ruolo Staff" />
        </label>
        <label
          class="flex min-h-14 items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4"
        >
          <div>
            <p class="font-medium text-white">Admin</p>
            <p class="text-xs text-white/40">Amministrazione completa</p>
          </div>
          <UCheckbox v-model="desiredAdmin" aria-label="Ruolo Admin" />
        </label>
        <p v-if="roleError" class="text-sm text-red-300">{{ roleError }}</p>
        <UButton
          type="submit"
          color="primary"
          class="w-full justify-center"
          label="Salva ruoli"
          :loading="rolePending"
        />
      </form>
    </UiVrsusBottomSheet>

    <UiVrsusBottomSheet
      v-model="banSheetOpen"
      :title="isBanned ? 'Rimuovi ban' : 'Banna utente'"
      :description="
        isBanned
          ? `${profileName} potrà accedere nuovamente all’app.`
          : `${profileName} verrà disconnesso e non potrà più accedere.`
      "
      :pending="banPending"
    >
      <div class="space-y-4">
        <div
          class="rounded-2xl border p-4 text-sm leading-6"
          :class="
            isBanned
              ? 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-100'
              : 'border-red-500/20 bg-red-500/[0.06] text-red-100'
          "
        >
          {{
            isBanned
              ? 'La rimozione del ban viene registrata nell’audit amministrativo.'
              : 'Il profilo e lo storico restano conservati. L’azione viene registrata nell’audit amministrativo.'
          }}
        </div>
        <p v-if="banError" class="text-sm text-red-300">{{ banError }}</p>
        <UButton
          :color="isBanned ? 'primary' : 'error'"
          class="w-full justify-center"
          :label="isBanned ? 'Conferma rimozione ban' : 'Conferma ban'"
          :loading="banPending"
          @click="updateBan"
        />
      </div>
    </UiVrsusBottomSheet>
  </div>
</template>
