<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const { user, roles, isAdmin, loadRoles, signOut } = useVrsusAuth()
const pending = ref(false)

await loadRoles()

useSeoMeta({
  title: 'Area personale — VRSUS',
  robots: 'noindex, nofollow',
})

const statusMessage = computed(() => {
  if (route.query.error === 'forbidden') {
    return 'Non hai i permessi per aprire quella sezione.'
  }

  if (route.query.error === 'roles-unavailable') {
    return 'I ruoli non sono disponibili. Riprova tra poco.'
  }

  return ''
})

async function logout() {
  pending.value = true
  await signOut()
  await navigateTo('/')
}
</script>

<template>
  <main
    class="mx-auto min-h-[calc(100vh-9rem)] max-w-7xl px-5 py-16 sm:px-8 lg:py-24"
  >
    <div
      class="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <p
          class="text-brand-blue-400 text-xs font-semibold tracking-[0.24em] uppercase"
        >
          Area personale
        </p>
        <h1 class="font-display mt-3 text-4xl font-semibold text-white">
          Ciao, {{ user?.email }}
        </h1>
        <p class="mt-4 max-w-xl text-white/55">
          Qui troverai le tue prenotazioni, i tuoi QR e le informazioni utili
          per partecipare.
        </p>
      </div>
      <UButton
        color="neutral"
        variant="outline"
        :loading="pending"
        label="Esci"
        @click="logout"
      />
    </div>

    <UAlert
      v-if="statusMessage"
      class="mt-8"
      color="warning"
      variant="subtle"
      :description="statusMessage"
    />

    <section class="mt-10 grid gap-4 md:grid-cols-2">
      <UCard class="border border-white/10 bg-white/[0.04]">
        <p class="text-sm text-white/45">Prossimo passo</p>
        <h2 class="font-display mt-3 text-2xl font-semibold text-white">
          Scopri il prossimo evento
        </h2>
        <p class="mt-3 text-sm leading-6 text-white/55">
          Le prenotazioni saranno disponibili quando un evento verrà pubblicato.
        </p>
        <UButton
          to="/evento"
          class="mt-6"
          variant="soft"
          color="secondary"
          label="Vai all’evento"
        />
      </UCard>

      <UCard class="border border-white/10 bg-white/[0.04]">
        <p class="text-sm text-white/45">Ruoli account</p>
        <div class="mt-4 flex flex-wrap gap-2">
          <UBadge
            v-for="role in roles"
            :key="role"
            color="secondary"
            variant="subtle"
            :label="role"
          />
          <span v-if="roles.length === 0" class="text-sm text-white/45"
            >Nessun ruolo assegnato</span
          >
        </div>
        <UButton
          v-if="isAdmin"
          to="/admin"
          class="mt-6"
          variant="outline"
          label="Apri console admin"
        />
      </UCard>
    </section>
  </main>
</template>
