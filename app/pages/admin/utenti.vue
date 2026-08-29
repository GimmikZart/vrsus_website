<script setup lang="ts">
import type { VrsusRole } from '~/composables/useVrsusAuth'

type AdminUser = {
  id: string
  display_name: string
  created_at: string
  roles: string[]
}

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['super_admin'] satisfies VrsusRole[],
})

const { data: users, refresh } = await useFetch<AdminUser[]>(
  '/api/admin/users',
  {
    default: () => [],
  },
)
const selectedRoles = reactive<Record<string, VrsusRole>>({})
const pendingUserId = ref<string | null>(null)
const errorMessage = ref('')
const roleOptions: VrsusRole[] = [
  'user',
  'staff',
  'tournament_admin',
  'admin',
  'super_admin',
]

useSeoMeta({
  title: 'Gestione utenti — VRSUS',
  robots: 'noindex, nofollow',
})

async function changeRole(userId: string, assign: boolean) {
  pendingUserId.value = userId
  errorMessage.value = ''

  try {
    await $fetch('/api/admin/roles', {
      method: 'POST',
      body: { userId, roleCode: selectedRoles[userId] ?? 'user', assign },
    })
    await refresh()
  } catch {
    errorMessage.value = 'La modifica del ruolo è stata rifiutata.'
  } finally {
    pendingUserId.value = null
  }
}
</script>

<template>
  <main
    class="mx-auto min-h-[calc(100vh-9rem)] max-w-7xl px-5 py-16 sm:px-8 lg:py-24"
  >
    <div>
      <p
        class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
      >
        Super admin
      </p>
      <h1 class="font-display mt-3 text-4xl font-semibold text-white">
        Gestione utenti
      </h1>
      <p class="mt-4 max-w-2xl text-white/55">
        Assegna o rimuovi ruoli. Ogni modifica passa da una RPC protetta e
        genera un audit log.
      </p>
    </div>

    <UAlert
      v-if="errorMessage"
      class="mt-8"
      color="error"
      variant="subtle"
      :description="errorMessage"
    />

    <div class="mt-10 space-y-3">
      <UCard
        v-for="account in users"
        :key="account.id"
        class="border border-white/10 bg-white/[0.04]"
      >
        <div
          class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"
        >
          <div>
            <h2 class="font-display text-lg font-semibold text-white">
              {{ account.display_name }}
            </h2>
            <p class="mt-1 text-xs break-all text-white/35">{{ account.id }}</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <UBadge
                v-for="role in account.roles"
                :key="role"
                color="secondary"
                variant="subtle"
                :label="role"
              />
              <span
                v-if="account.roles.length === 0"
                class="text-sm text-white/45"
                >Nessun ruolo</span
              >
            </div>
          </div>
          <div class="flex flex-col gap-2 sm:flex-row">
            <USelect
              v-model="selectedRoles[account.id]"
              :items="roleOptions"
              class="min-w-44"
            />
            <UButton
              color="secondary"
              variant="soft"
              :loading="pendingUserId === account.id"
              label="Assegna"
              @click="changeRole(account.id, true)"
            />
            <UButton
              color="neutral"
              variant="outline"
              :loading="pendingUserId === account.id"
              label="Rimuovi"
              @click="changeRole(account.id, false)"
            />
          </div>
        </div>
      </UCard>
      <p v-if="users.length === 0" class="text-white/50">
        Nessun profilo disponibile.
      </p>
    </div>
  </main>
</template>
