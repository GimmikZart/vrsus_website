<script setup lang="ts">
import type { VrsusRole } from '~/composables/useVrsusAuth'

type InquiryStatus = 'new' | 'contacted' | 'quote_sent' | 'confirmed' | 'lost'
type ServiceInquiry = {
  id: string
  service_page_id: string | null
  service_title: string | null
  name: string
  email: string
  phone: string | null
  organization: string | null
  people_count: number | null
  preferred_date: string | null
  message: string
  status: InquiryStatus
  admin_notes: string | null
  created_at: string
}

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'super_admin'] satisfies VrsusRole[],
})

const {
  data: inquiries,
  status: loadStatus,
  error: loadError,
  refresh,
} = await useFetch<ServiceInquiry[]>('/api/admin/service-inquiries', {
  default: () => [],
})
const selectedStatus = reactive<Record<string, InquiryStatus>>({})
const notes = reactive<Record<string, string>>({})
const pendingId = ref<string | null>(null)
const errorMessage = ref('')
const successMessage = ref('')
const statusOptions: InquiryStatus[] = [
  'new',
  'contacted',
  'quote_sent',
  'confirmed',
  'lost',
]

useSeoMeta({
  title: 'Richieste servizi — VRSUS',
  robots: 'noindex, nofollow',
})

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Data non disponibile'
  return new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getStatus(inquiry: ServiceInquiry) {
  return selectedStatus[inquiry.id] ?? inquiry.status
}

function getNotes(inquiry: ServiceInquiry) {
  return notes[inquiry.id] ?? inquiry.admin_notes ?? ''
}

async function saveInquiry(inquiry: ServiceInquiry) {
  pendingId.value = inquiry.id
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await $fetch(`/api/admin/service-inquiries/${inquiry.id}`, {
      method: 'PATCH',
      body: {
        status: getStatus(inquiry),
        adminNotes: getNotes(inquiry),
      },
    })
    successMessage.value = 'Richiesta aggiornata.'
    await refresh()
  } catch {
    errorMessage.value = 'Non è stato possibile aggiornare la richiesta.'
  } finally {
    pendingId.value = null
  }
}
</script>

<template>
  <main
    class="mx-auto min-h-[calc(100vh-9rem)] max-w-7xl px-5 py-16 sm:px-8 lg:py-24"
  >
    <div>
      <NuxtLink to="/admin" class="text-sm text-white/45 hover:text-white">
        ← Torna alla console
      </NuxtLink>
      <p
        class="text-brand-blue-400 mt-8 text-xs font-semibold tracking-[0.24em] uppercase"
      >
        Lead servizi
      </p>
      <h1 class="font-display mt-3 text-4xl font-semibold text-white">
        Richieste servizi
      </h1>
      <p class="mt-4 max-w-2xl text-white/55">
        Gestisci i contatti ricevuti dal sito senza esporre note o dati interni
        alle pagine pubbliche.
      </p>
    </div>

    <div class="mt-8 space-y-3">
      <UAlert
        v-if="loadError"
        color="error"
        variant="subtle"
        description="Impossibile caricare le richieste."
      />
      <UAlert
        v-if="errorMessage"
        color="error"
        variant="subtle"
        :description="errorMessage"
      />
      <UAlert
        v-if="successMessage"
        color="success"
        variant="subtle"
        :description="successMessage"
      />
      <div
        v-if="loadStatus === 'pending'"
        class="h-40 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]"
      />
      <UCard
        v-for="inquiry in inquiries ?? []"
        :key="inquiry.id"
        class="border border-white/10 bg-white/[0.04]"
      >
        <div
          class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]"
        >
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <UBadge
                color="secondary"
                variant="subtle"
                :label="getStatus(inquiry)"
              />
              <span class="text-xs text-white/35">{{
                inquiry.service_title || 'Servizio non specificato'
              }}</span>
            </div>
            <h2 class="font-display mt-3 text-xl font-semibold text-white">
              {{ inquiry.name }}
            </h2>
            <div
              class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/55"
            >
              <a :href="`mailto:${inquiry.email}`" class="hover:text-white">{{
                inquiry.email
              }}</a>
              <a
                v-if="inquiry.phone"
                :href="`tel:${inquiry.phone}`"
                class="hover:text-white"
                >{{ inquiry.phone }}</a
              >
            </div>
            <p v-if="inquiry.organization" class="mt-2 text-sm text-white/50">
              {{ inquiry.organization }}
            </p>
            <p class="mt-1 text-xs text-white/35">
              Ricevuta il {{ formatDate(inquiry.created_at) }}
            </p>
            <p
              v-if="inquiry.people_count || inquiry.preferred_date"
              class="mt-4 text-sm text-white/50"
            >
              <span v-if="inquiry.people_count"
                >{{ inquiry.people_count }} partecipanti</span
              >
              <span v-if="inquiry.people_count && inquiry.preferred_date">
                ·
              </span>
              <span v-if="inquiry.preferred_date"
                >Data preferita: {{ inquiry.preferred_date }}</span
              >
            </p>
            <p class="mt-4 text-sm leading-6 whitespace-pre-line text-white/70">
              {{ inquiry.message }}
            </p>
          </div>
          <div class="space-y-4">
            <UFormField label="Stato" name="status">
              <USelect
                v-model="selectedStatus[inquiry.id]"
                :items="statusOptions"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Note interne" name="adminNotes">
              <UTextarea
                :model-value="getNotes(inquiry)"
                class="w-full"
                :rows="5"
                @update:model-value="notes[inquiry.id] = $event"
              />
            </UFormField>
            <UButton
              :loading="pendingId === inquiry.id"
              label="Salva aggiornamento"
              @click="saveInquiry(inquiry)"
            />
          </div>
        </div>
      </UCard>
      <p
        v-if="loadStatus !== 'pending' && !inquiries?.length"
        class="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-white/55"
      >
        Non ci sono ancora richieste.
      </p>
    </div>
  </main>
</template>
