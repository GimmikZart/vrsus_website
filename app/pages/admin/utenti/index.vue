<script setup lang="ts">
import type { VrsusRole } from '~/composables/useVrsusAuth'

type AdminUser = {
  id: string
  display_name: string
  nickname: string | null
  created_at: string
  roles: string[]
}

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
  requiredRoles: ['staff', 'admin'] satisfies VrsusRole[],
})

const {
  data: users,
  pending,
  error,
} = await useFetch<AdminUser[]>('/api/admin/users', { default: () => [] })
const search = ref('')

const visibleUsers = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('it-IT')
  if (!query) return users.value
  return users.value.filter((account) =>
    `${account.nickname ?? ''} ${account.display_name}`
      .toLocaleLowerCase('it-IT')
      .includes(query),
  )
})

function roleLabel(roles: string[]) {
  if (roles.includes('admin')) return 'Admin'
  if (roles.includes('staff')) return 'Staff'
  return 'User'
}

useSeoMeta({
  title: 'Utenti — VRSUS',
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div class="space-y-6">
    <header>
      <p
        class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
      >
        Community
      </p>
      <h1 class="font-display mt-2 text-3xl font-semibold text-white">
        Utenti
      </h1>
      <p class="mt-2 max-w-2xl text-sm text-white/55">
        Cerca un nickname e apri la scheda completa per gestire il profilo.
      </p>
    </header>

    <UFormField label="Cerca utente" name="search">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Nickname o nome"
        class="w-full sm:max-w-md"
      />
    </UFormField>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      description="Non è stato possibile caricare gli utenti."
    />

    <div v-if="pending" class="space-y-2">
      <USkeleton v-for="index in 5" :key="index" class="h-16 rounded-xl" />
    </div>

    <div
      v-else-if="visibleUsers.length"
      class="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]"
    >
      <div
        class="hidden grid-cols-[minmax(0,1fr)_10rem_3.5rem] items-center gap-4 border-b border-white/10 px-4 py-3 text-xs tracking-wide text-white/40 uppercase sm:grid"
      >
        <span>Nome utente</span>
        <span>Ruolo</span>
        <span class="sr-only">Azioni</span>
      </div>

      <NuxtLink
        v-for="account in visibleUsers"
        :key="account.id"
        :to="`/admin/utenti/${account.id}`"
        class="group grid min-h-16 grid-cols-[minmax(0,1fr)_auto_2.75rem] items-center gap-3 border-b border-white/[0.07] px-4 py-3 last:border-b-0 hover:bg-white/[0.05] sm:grid-cols-[minmax(0,1fr)_10rem_3.5rem] sm:gap-4"
      >
        <div class="min-w-0">
          <p class="truncate font-semibold text-white">
            {{ account.nickname ?? account.display_name }}
          </p>
          <p
            v-if="account.nickname && account.display_name !== account.nickname"
            class="mt-0.5 truncate text-xs text-white/40"
          >
            {{ account.display_name }}
          </p>
        </div>
        <span
          class="justify-self-start rounded-full bg-white/[0.07] px-2.5 py-1 text-xs text-white/65"
        >
          {{ roleLabel(account.roles) }}
        </span>
        <span
          class="grid size-11 place-items-center rounded-full text-white/45 transition-colors group-hover:bg-white/10 group-hover:text-white"
          aria-label="Apri profilo"
        >
          <UIcon name="i-lucide-arrow-up-right" class="size-5" />
        </span>
      </NuxtLink>
    </div>

    <p
      v-else
      class="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-white/45"
    >
      Nessun utente corrisponde alla ricerca.
    </p>
  </div>
</template>
