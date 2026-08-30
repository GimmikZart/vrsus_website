<script setup lang="ts">
import type { VrsusRole } from '~/composables/useVrsusAuth'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'super_admin'] satisfies VrsusRole[],
})

const { user, roles, hasRole, signOut } = useVrsusAuth()

const adminSections = [
  {
    label: 'Check-in',
    description: 'Scansiona i QR e registra l’ingresso dei partecipanti.',
    to: '/admin/checkin',
  },
  {
    label: 'Catalogo',
    description: 'Gestisci attività, postazioni e categorie riutilizzabili.',
    to: '/admin/catalogo',
  },
  {
    label: 'Eventi',
    description: 'Prepara date, prenotazioni e visibilità del prossimo evento.',
    to: '/admin/eventi',
  },
  {
    label: 'Tornei',
    description: 'Gestisci iscrizioni, bracket e risultati della VRSUS Arena.',
    to: '/admin/tornei',
  },
  {
    label: 'Ranking',
    description: 'Registra correzioni punti con motivazione e audit interno.',
    to: '/admin/ranking',
  },
  {
    label: 'News',
    description: 'Crea, modifica e pubblica gli articoli editoriali.',
    to: '/admin/news',
  },
  {
    label: 'Servizi',
    description: 'Gestisci le pagine dei servizi visibili sul sito.',
    to: '/admin/servizi',
  },
  {
    label: 'Richieste servizi',
    description: 'Segui i lead ricevuti e aggiorna il loro stato operativo.',
    to: '/admin/richieste',
  },
  {
    label: 'Impostazioni',
    description: 'Gestisci configurazioni applicative leggere e strutturate.',
    to: '/admin/impostazioni',
  },
] as const

useSeoMeta({
  title: 'Console admin — VRSUS',
  robots: 'noindex, nofollow',
})

async function logout() {
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
          class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
        >
          Console protetta
        </p>
        <h1 class="font-display mt-3 text-4xl font-semibold text-white">
          Admin VRSUS
        </h1>
        <p class="mt-4 text-white/55">
          Accesso autorizzato per {{ user?.email }}.
        </p>
      </div>
      <UButton color="neutral" variant="outline" label="Esci" @click="logout" />
    </div>

    <section class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <UCard
        v-for="section in adminSections"
        :key="section.to"
        class="border border-white/10 bg-white/[0.04] transition-colors hover:border-white/25"
      >
        <p class="text-sm text-white/45">Gestione</p>
        <h2 class="font-display mt-3 text-xl font-semibold text-white">
          {{ section.label }}
        </h2>
        <p class="mt-3 text-sm leading-6 text-white/50">
          {{ section.description }}
        </p>
        <UButton
          :to="section.to"
          class="mt-6"
          variant="soft"
          color="secondary"
          label="Apri gestione"
        />
      </UCard>
    </section>

    <UButton
      v-if="hasRole('super_admin')"
      to="/admin/utenti"
      class="mt-8"
      variant="outline"
      label="Gestisci utenti e ruoli"
    />

    <p class="mt-8 text-sm text-white/40">
      Ruoli attivi: {{ roles.join(', ') }}
    </p>
  </main>
</template>
