<script setup lang="ts">
import type { VrsusRole } from '~/composables/useVrsusAuth'
import {
  emptyEventForm,
  eventFormToPayload,
  type EventFormState,
} from '~/composables/useEventForm'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'super_admin'] satisfies VrsusRole[],
})

const router = useRouter()
const form = reactive<EventFormState>(emptyEventForm())

const pending = ref(false)
const errorMessage = ref('')

// I passi successivi hanno bisogno di un evento esistente: postazioni e tornei
// si agganciano a un id. Il primo "Avanti" salva quindi la bozza e prosegue
// sulla scheda dell'evento appena creato.
const steps = [
  { value: 'info', label: 'Info', count: null },
  { value: 'platforms', label: 'Piattaforme', count: null },
  { value: 'tournaments', label: 'Tornei', count: null },
]
const step = ref<string>('info')

async function createEvent() {
  errorMessage.value = ''
  const result = eventFormToPayload(form)
  if (result.error) {
    errorMessage.value = result.error
    return
  }

  pending.value = true
  try {
    const created = await $fetch<{ id: string }>('/api/admin/events', {
      method: 'POST',
      body: result.payload,
    })
    await router.push(`/admin/eventi/${created.id}/modifica?step=platforms`)
  } catch (error) {
    errorMessage.value =
      (error as { statusCode?: number })?.statusCode === 409
        ? 'Esiste gia un evento con questo slug.'
        : 'Creazione non riuscita. Controlla i dati.'
  } finally {
    pending.value = false
  }
}

useSeoMeta({ title: 'Crea evento — Admin VRSUS', robots: 'noindex, nofollow' })
</script>

<template>
  <div>
    <NuxtLink to="/admin/eventi" class="text-sm text-white/45 hover:text-white">
      ← Eventi
    </NuxtLink>

    <header class="mt-4">
      <h1 class="font-display text-2xl font-semibold text-white sm:text-3xl">
        Crea evento
      </h1>
      <p class="mt-2 max-w-2xl text-sm text-white/50">
        Prima le informazioni della giornata, poi le postazioni con i loro
        giochi e infine i tornei.
      </p>
    </header>

    <div class="sticky-tabs mt-5">
      <UiVrsusTabs v-model="step" :items="steps" />
    </div>

    <UAlert
      v-if="errorMessage"
      class="mt-4"
      color="error"
      variant="subtle"
      :description="errorMessage"
    />

    <section v-if="step === 'info'" class="mt-5">
      <AdminEventInfoForm
        v-model="form"
        :pending="pending"
        @submit="createEvent"
      />
    </section>

    <section
      v-else
      class="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
    >
      <p class="text-sm text-white/55">
        Compila prima le informazioni della giornata: postazioni e tornei si
        agganciano a un evento che esiste gia.
      </p>
      <UButton
        class="mt-4"
        color="neutral"
        variant="outline"
        size="sm"
        label="Torna alle informazioni"
        @click="step = 'info'"
      />
    </section>
  </div>
</template>
