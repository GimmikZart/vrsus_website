<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { VrsusRole } from '~/composables/useVrsusAuth'

type Event = Database['public']['Tables']['events']['Row']
type EventStatus = 'draft' | 'scheduled' | 'running' | 'completed' | 'cancelled'
type CapacityVisibility = 'hidden' | 'status' | 'exact'

type EventForm = {
  title: string
  slug: string
  shortDescription: string
  description: string
  status: EventStatus
  isPublic: boolean
  startsAt: string
  endsAt: string
  bookingOpensAt: string
  bookingClosesAt: string
  bookingEnabled: boolean
  venueName: string
  venueAddress: string
  venueNotes: string
  priceEuro: number
  paymentRequired: boolean
  maxCapacity: number | undefined
  capacityVisibility: CapacityVisibility
  waitlistEnabled: boolean
  coverImagePath: string
  seoTitle: string
  seoDescription: string
}

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'super_admin'] satisfies VrsusRole[],
})

const client = useSupabaseClient<Database>()
const {
  data: events,
  status: loadStatus,
  error: loadError,
  refresh,
} = await useAsyncData<Event[]>('admin-events', async () => {
  const { data, error } = await client
    .from('events')
    .select('*')
    .order('starts_at', { ascending: false })

  if (error) throw new Error('Impossibile caricare gli eventi amministrativi.')
  return data ?? []
})

const editingId = ref<string | null>(null)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const statusOptions: EventStatus[] = [
  'draft',
  'scheduled',
  'running',
  'completed',
  'cancelled',
]
const capacityOptions: CapacityVisibility[] = ['hidden', 'status', 'exact']

function emptyForm(): EventForm {
  return {
    title: '',
    slug: '',
    shortDescription: '',
    description: '',
    status: 'draft',
    isPublic: false,
    startsAt: '',
    endsAt: '',
    bookingOpensAt: '',
    bookingClosesAt: '',
    bookingEnabled: true,
    venueName: '',
    venueAddress: '',
    venueNotes: '',
    priceEuro: 0,
    paymentRequired: true,
    maxCapacity: undefined,
    capacityVisibility: 'hidden',
    waitlistEnabled: true,
    coverImagePath: '',
    seoTitle: '',
    seoDescription: '',
  }
}

const form = reactive<EventForm>(emptyForm())

useSeoMeta({
  title: 'Gestione eventi — VRSUS',
  robots: 'noindex, nofollow',
})

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function toDateTimeInput(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function editEvent(event: Event) {
  editingId.value = event.id
  Object.assign(form, {
    title: event.title,
    slug: event.slug,
    shortDescription: event.short_description ?? '',
    description: event.description ?? '',
    status: event.status as EventStatus,
    isPublic: event.is_public,
    startsAt: toDateTimeInput(event.starts_at),
    endsAt: toDateTimeInput(event.ends_at),
    bookingOpensAt: toDateTimeInput(event.booking_opens_at),
    bookingClosesAt: toDateTimeInput(event.booking_closes_at),
    bookingEnabled: event.booking_enabled,
    venueName: event.venue_name ?? '',
    venueAddress: event.venue_address ?? '',
    venueNotes: event.venue_notes ?? '',
    priceEuro: event.price_cents / 100,
    paymentRequired: event.payment_required,
    maxCapacity: event.max_capacity ?? undefined,
    capacityVisibility: event.capacity_visibility as CapacityVisibility,
    waitlistEnabled: event.waitlist_enabled,
    coverImagePath: event.cover_image_path ?? '',
    seoTitle: event.seo_title ?? '',
    seoDescription: event.seo_description ?? '',
  })
  errorMessage.value = ''
  successMessage.value = ''
}

function startNew() {
  editingId.value = null
  Object.assign(form, emptyForm())
  errorMessage.value = ''
  successMessage.value = ''
}

function optionalIso(value: string) {
  return value ? new Date(value).toISOString() : null
}

async function saveEvent() {
  errorMessage.value = ''
  successMessage.value = ''
  const title = form.title.trim()
  const slug = slugify(form.slug || title)
  const startsAt = form.startsAt ? new Date(form.startsAt) : null
  const endsAt = form.endsAt ? new Date(form.endsAt) : null
  const priceEuro = Number(form.priceEuro)

  if (!title || !slug || !startsAt || !endsAt) {
    errorMessage.value = 'Titolo, slug, inizio e fine evento sono obbligatori.'
    return
  }
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    errorMessage.value = 'Le date inserite non sono valide.'
    return
  }
  if (endsAt <= startsAt) {
    errorMessage.value = 'La fine dell’evento deve essere dopo l’inizio.'
    return
  }
  if (!Number.isFinite(priceEuro) || priceEuro < 0) {
    errorMessage.value =
      'Il prezzo deve essere un numero maggiore o uguale a zero.'
    return
  }
  if (
    form.maxCapacity !== undefined &&
    (!Number.isInteger(form.maxCapacity) || form.maxCapacity <= 0)
  ) {
    errorMessage.value = 'La capienza massima deve essere un intero positivo.'
    return
  }

  saving.value = true
  const payload: Database['public']['Tables']['events']['Insert'] = {
    title,
    slug,
    short_description: form.shortDescription.trim() || null,
    description: form.description.trim() || null,
    status: form.status,
    is_public: form.isPublic,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    booking_opens_at: optionalIso(form.bookingOpensAt),
    booking_closes_at: optionalIso(form.bookingClosesAt),
    booking_enabled: form.bookingEnabled,
    venue_name: form.venueName.trim() || null,
    venue_address: form.venueAddress.trim() || null,
    venue_notes: form.venueNotes.trim() || null,
    price_cents: Math.round(priceEuro * 100),
    payment_required: form.paymentRequired,
    max_capacity: form.maxCapacity ?? null,
    capacity_visibility: form.capacityVisibility,
    waitlist_enabled: form.waitlistEnabled,
    cover_image_path: form.coverImagePath.trim() || null,
    seo_title: form.seoTitle.trim() || null,
    seo_description: form.seoDescription.trim() || null,
  }

  const result = editingId.value
    ? await client.from('events').update(payload).eq('id', editingId.value)
    : await client.from('events').insert(payload)

  if (result.error) {
    errorMessage.value =
      result.error.code === '23505'
        ? 'Esiste già un evento con questo slug.'
        : 'Salvataggio non riuscito. Controlla i dati e riprova.'
    saving.value = false
    return
  }

  successMessage.value = 'Evento salvato.'
  saving.value = false
  await refresh()
  editingId.value = null
  Object.assign(form, emptyForm())
}
</script>

<template>
  <main
    class="mx-auto min-h-[calc(100vh-9rem)] max-w-7xl px-5 py-16 sm:px-8 lg:py-24"
  >
    <div
      class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <NuxtLink to="/admin" class="text-sm text-white/45 hover:text-white">
          ← Torna alla console
        </NuxtLink>
        <p
          class="text-brand-red-400 mt-8 text-xs font-semibold tracking-[0.24em] uppercase"
        >
          CMS eventi
        </p>
        <h1 class="font-display mt-3 text-4xl font-semibold text-white">
          Gestione eventi
        </h1>
        <p class="mt-4 max-w-2xl text-white/55">
          Crea e prepara gli eventi VRSUS. La capienza resta privata salvo
          esplicita scelta di visibilità.
        </p>
      </div>
      <UButton variant="outline" label="Nuovo evento" @click="startNew" />
    </div>

    <div
      class="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,30rem)]"
    >
      <section class="space-y-3">
        <UAlert
          v-if="loadError"
          color="error"
          variant="subtle"
          description="Impossibile caricare gli eventi."
        />
        <div
          v-if="loadStatus === 'pending'"
          class="h-32 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]"
        />
        <UCard
          v-for="event in events ?? []"
          :key="event.id"
          class="border border-white/10 bg-white/[0.04]"
        >
          <div
            class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <UBadge
                  :color="event.is_public ? 'success' : 'neutral'"
                  variant="subtle"
                  :label="event.is_public ? 'pubblico' : 'privato'"
                />
                <UBadge
                  color="secondary"
                  variant="subtle"
                  :label="event.status"
                />
                <span class="text-xs text-white/35">/{{ event.slug }}</span>
              </div>
              <h2 class="font-display mt-3 text-xl font-semibold text-white">
                {{ event.title }}
              </h2>
              <p class="mt-2 text-sm text-white/50">
                {{ formatDate(event.starts_at) }} ·
                {{ event.venue_name || 'Luogo da definire' }}
              </p>
            </div>
            <UButton
              variant="outline"
              size="sm"
              label="Modifica"
              @click="editEvent(event)"
            />
          </div>
        </UCard>
        <p
          v-if="loadStatus !== 'pending' && !events?.length"
          class="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-white/55"
        >
          Nessun evento presente.
        </p>
      </section>

      <UCard class="h-fit border border-white/10 bg-white/[0.04]">
        <h2 class="font-display text-xl font-semibold text-white">
          {{ editingId ? 'Modifica evento' : 'Nuovo evento' }}
        </h2>
        <form class="mt-6 space-y-4" @submit.prevent="saveEvent">
          <UFormField label="Titolo" name="title"
            ><UInput v-model="form.title" class="w-full" required
          /></UFormField>
          <UFormField
            label="Slug"
            name="slug"
            hint="Lascia vuoto per generarlo dal titolo."
            ><UInput v-model="form.slug" class="w-full"
          /></UFormField>
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Stato" name="status"
              ><USelect
                v-model="form.status"
                :items="statusOptions"
                class="w-full"
            /></UFormField>
            <UFormField label="Visibilità capienza" name="capacityVisibility"
              ><USelect
                v-model="form.capacityVisibility"
                :items="capacityOptions"
                class="w-full"
            /></UFormField>
          </div>
          <UFormField label="Descrizione breve" name="shortDescription"
            ><UTextarea
              v-model="form.shortDescription"
              class="w-full"
              :rows="2"
          /></UFormField>
          <UFormField label="Descrizione" name="description"
            ><UTextarea v-model="form.description" class="w-full" :rows="5"
          /></UFormField>
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Inizio" name="startsAt"
              ><UInput
                v-model="form.startsAt"
                type="datetime-local"
                class="w-full"
                required
            /></UFormField>
            <UFormField label="Fine" name="endsAt"
              ><UInput
                v-model="form.endsAt"
                type="datetime-local"
                class="w-full"
                required
            /></UFormField>
            <UFormField label="Apertura prenotazioni" name="bookingOpensAt"
              ><UInput
                v-model="form.bookingOpensAt"
                type="datetime-local"
                class="w-full"
            /></UFormField>
            <UFormField label="Chiusura prenotazioni" name="bookingClosesAt"
              ><UInput
                v-model="form.bookingClosesAt"
                type="datetime-local"
                class="w-full"
            /></UFormField>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Prezzo sul posto (€)" name="priceEuro"
              ><UInput
                v-model.number="form.priceEuro"
                type="number"
                min="0"
                step="0.01"
                class="w-full"
            /></UFormField>
            <UFormField label="Capienza massima" name="maxCapacity"
              ><UInput
                v-model.number="form.maxCapacity"
                type="number"
                min="1"
                class="w-full"
            /></UFormField>
          </div>
          <UFormField label="Luogo" name="venueName"
            ><UInput v-model="form.venueName" class="w-full"
          /></UFormField>
          <UFormField label="Indirizzo" name="venueAddress"
            ><UInput v-model="form.venueAddress" class="w-full"
          /></UFormField>
          <UFormField label="Note luogo" name="venueNotes"
            ><UTextarea v-model="form.venueNotes" class="w-full" :rows="2"
          /></UFormField>
          <UFormField label="Cover image path" name="coverImagePath"
            ><UInput v-model="form.coverImagePath" class="w-full"
          /></UFormField>
          <div class="grid gap-3 sm:grid-cols-2">
            <UCheckbox v-model="form.isPublic" label="Pubblica sul sito" />
            <UCheckbox
              v-model="form.bookingEnabled"
              label="Prenotazioni abilitate"
            />
            <UCheckbox
              v-model="form.waitlistEnabled"
              label="Lista d’attesa attiva"
            />
            <UCheckbox
              v-model="form.paymentRequired"
              label="Pagamento sul posto richiesto"
            />
          </div>
          <UFormField label="SEO title" name="seoTitle"
            ><UInput v-model="form.seoTitle" class="w-full"
          /></UFormField>
          <UFormField label="SEO description" name="seoDescription"
            ><UTextarea v-model="form.seoDescription" class="w-full" :rows="2"
          /></UFormField>
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
          <div class="flex gap-3">
            <UButton type="submit" :loading="saving" label="Salva evento" />
            <UButton
              v-if="editingId"
              type="button"
              variant="ghost"
              label="Annulla"
              @click="startNew"
            />
          </div>
        </form>
      </UCard>
    </div>
  </main>
</template>
