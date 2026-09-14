<script setup lang="ts">
import type { EventFormState } from '~/composables/useEventForm'
import { EVENT_TYPE_OPTIONS } from '~/composables/useEventForm'

// Primo passo del wizard evento: solo i dati della giornata. Descrizioni
// lunghe, note interne e SEO non passano piu da qui.
defineProps<{ pending?: boolean }>()

const emit = defineEmits<{ submit: [] }>()

const form = defineModel<EventFormState>({ required: true })
</script>

<template>
  <form class="space-y-5" @submit.prevent="emit('submit')">
    <div class="grid gap-4 sm:grid-cols-2">
      <UFormField label="Titolo">
        <UInput v-model="form.title" class="w-full" required />
      </UFormField>
      <UFormField label="Slug" hint="Lascia vuoto per generarlo dal titolo.">
        <UInput v-model="form.slug" class="w-full" />
      </UFormField>
      <UFormField label="Tipo evento">
        <select v-model="form.eventType" class="vrsus-select w-full">
          <option
            v-for="option in EVENT_TYPE_OPTIONS"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </UFormField>
      <UFormField label="Capienza massima" hint="Vuoto: nessun limite.">
        <UInput
          v-model.number="form.maxCapacity"
          type="number"
          min="1"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Inizio">
        <UInput v-model="form.startsAt" type="datetime-local" class="w-full" />
      </UFormField>
      <UFormField label="Fine">
        <UInput v-model="form.endsAt" type="datetime-local" class="w-full" />
      </UFormField>
      <UFormField label="Apertura prenotazioni">
        <UInput
          v-model="form.bookingOpensAt"
          type="datetime-local"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Chiusura prenotazioni">
        <UInput
          v-model="form.bookingClosesAt"
          type="datetime-local"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Prezzo sul posto (EUR)">
        <UInput
          v-model.number="form.priceEuro"
          type="number"
          min="0"
          step="0.5"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Luogo">
        <UInput v-model="form.venueName" class="w-full" />
      </UFormField>
      <UFormField label="Indirizzo" class="sm:col-span-2">
        <UInput v-model="form.venueAddress" class="w-full" />
      </UFormField>
    </div>

    <UFormField label="Cover locandina">
      <AdminAssetUploader v-model="form.coverImagePath" />
    </UFormField>

    <div class="grid gap-3 sm:grid-cols-2">
      <UCheckbox v-model="form.isPublic" label="Pubblica sul sito" />
      <UCheckbox v-model="form.bookingEnabled" label="Prenotazioni abilitate" />
      <UCheckbox v-model="form.waitlistEnabled" label="Lista d attesa attiva" />
      <UCheckbox
        v-model="form.paymentRequired"
        label="Pagamento sul posto richiesto"
      />
      <UCheckbox
        v-model="form.arciRequired"
        label="Tessera ARCI obbligatoria"
      />
    </div>
    <p class="text-xs text-white/40">
      Pubblicare l evento lo rende visibile in vetrina e lo porta in stato
      programmato. Senza pubblicazione resta una bozza. La tessera ARCI si
      lascia richiesta sulle serate pubbliche e si toglie su compleanni e
      giornate private: chi prenota lo legge in vetrina e in app.
    </p>

    <div class="flex justify-end">
      <UButton
        type="submit"
        color="primary"
        :loading="pending"
        trailing-icon="i-lucide-arrow-right"
        label="Avanti"
      />
    </div>
  </form>
</template>
