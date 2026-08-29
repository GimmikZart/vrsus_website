<script setup lang="ts">
import type { Database } from '~/types/database.types'

const route = useRoute()
const slug = String(route.params.slug)
const supabase = useSupabaseClient<Database>()

const {
  data: service,
  status,
  error,
} = await useAsyncData(`public-service-${slug}`, async () => {
  const { data, error: queryError } = await supabase
    .from('public_service_pages')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (queryError) throw new Error('Impossibile caricare il servizio.')
  return data
})

const pageTitle = computed(
  () => service.value?.seo_title || service.value?.title || 'Servizio VRSUS',
)
const pageDescription = computed(
  () =>
    service.value?.seo_description ||
    service.value?.excerpt ||
    'Scopri i servizi VRSUS.',
)
const config = useRuntimeConfig()
const inquiryForm = reactive({
  name: '',
  email: '',
  phone: '',
  organization: '',
  peopleCount: null as number | null,
  preferredDate: '',
  message: '',
  website: '',
})
const inquiryPending = ref(false)
const inquirySent = ref(false)
const inquiryError = ref('')

useSeoMeta({
  title: computed(() => `${pageTitle.value} — VRSUS`),
  description: pageDescription,
  robots: publicEventsRobots(),
})

useHead(() => ({
  link: [
    { rel: 'canonical', href: `${config.public.appBaseUrl}/servizi/${slug}` },
  ],
}))

async function submitInquiry() {
  if (!service.value) return

  inquiryPending.value = true
  inquirySent.value = false
  inquiryError.value = ''

  try {
    await $fetch('/api/services/inquiries', {
      method: 'POST',
      body: {
        servicePageId: service.value.id,
        ...inquiryForm,
      },
    })
    inquirySent.value = true
    Object.assign(inquiryForm, {
      name: '',
      email: '',
      phone: '',
      organization: '',
      peopleCount: null,
      preferredDate: '',
      message: '',
      website: '',
    })
  } catch {
    inquiryError.value =
      'Non è stato possibile inviare la richiesta. Riprova tra poco.'
  } finally {
    inquiryPending.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl px-5 py-16 sm:px-8 lg:py-24">
    <div
      v-if="status === 'pending'"
      class="h-80 animate-pulse rounded-3xl bg-white/[0.04]"
    />
    <div
      v-else-if="error || !service"
      class="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center"
    >
      <p
        class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
      >
        {{ error ? 'Errore di caricamento' : 'Servizio non trovato' }}
      </p>
      <h1 class="font-display mt-5 text-4xl font-semibold text-white">
        {{ error ? 'Riprova tra poco.' : 'Questo servizio non è disponibile.' }}
      </h1>
      <UButton
        class="mt-8"
        to="/servizi"
        color="primary"
        label="Torna ai servizi"
      />
    </div>
    <article v-else>
      <NuxtLink
        to="/servizi"
        class="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
      >
        <UIcon name="i-lucide-arrow-left" class="size-4" /> Tutti i servizi
      </NuxtLink>
      <p
        class="text-brand-blue-300 mt-10 text-xs font-semibold tracking-[0.24em] uppercase"
      >
        Servizio VRSUS
      </p>
      <h1
        class="font-display mt-5 text-5xl font-semibold tracking-tight text-white sm:text-7xl"
      >
        {{ service.title }}<span class="text-brand-red-500">.</span>
      </h1>
      <p v-if="service.excerpt" class="mt-7 text-xl leading-8 text-white/65">
        {{ service.excerpt }}
      </p>
      <div
        class="mt-12 border-t border-white/10 pt-10 text-base leading-8 text-white/70"
      >
        <p class="whitespace-pre-line">{{ service.content }}</p>
      </div>
      <div
        class="mt-12 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-white/60"
      >
        <p
          class="text-brand-blue-300 text-xs font-semibold tracking-[0.2em] uppercase"
        >
          Parliamone
        </p>
        <h2 class="font-display mt-3 text-2xl font-semibold text-white">
          Raccontaci cosa stai organizzando.
        </h2>
        <p class="mt-3 text-sm leading-6 text-white/55">
          Inviaci qualche dettaglio: il team VRSUS ti ricontatterà per definire
          insieme la soluzione più adatta.
        </p>

        <form class="mt-7 space-y-4" @submit.prevent="submitInquiry">
          <!-- eslint-disable vue/html-self-closing -->
          <textarea
            v-model="inquiryForm.website"
            tabindex="-1"
            autocomplete="off"
            aria-hidden="true"
            class="absolute -left-[9999px] h-px w-px opacity-0"
            :rows="1"
          ></textarea>
          <!-- eslint-enable vue/html-self-closing -->
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Nome" name="name">
              <UInput v-model="inquiryForm.name" class="w-full" required />
            </UFormField>
            <UFormField label="Email" name="email">
              <UInput
                v-model="inquiryForm.email"
                type="email"
                autocomplete="email"
                class="w-full"
                required
              />
            </UFormField>
            <UFormField label="Telefono" name="phone">
              <UInput v-model="inquiryForm.phone" type="tel" class="w-full" />
            </UFormField>
            <UFormField label="Organizzazione" name="organization">
              <UInput v-model="inquiryForm.organization" class="w-full" />
            </UFormField>
            <UFormField label="Partecipanti" name="peopleCount">
              <UInput
                v-model.number="inquiryForm.peopleCount"
                type="number"
                min="1"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Data preferita" name="preferredDate">
              <UInput
                v-model="inquiryForm.preferredDate"
                type="date"
                class="w-full"
              />
            </UFormField>
          </div>
          <UFormField label="Messaggio" name="message">
            <UTextarea
              v-model="inquiryForm.message"
              class="w-full"
              :rows="5"
              required
            />
          </UFormField>
          <UAlert
            v-if="inquirySent"
            color="success"
            variant="subtle"
            description="Richiesta inviata. Ti ricontatteremo presto."
          />
          <UAlert
            v-if="inquiryError"
            color="error"
            variant="subtle"
            :description="inquiryError"
          />
          <UButton
            type="submit"
            :loading="inquiryPending"
            label="Invia richiesta"
          />
        </form>
      </div>
    </article>
  </div>
</template>
