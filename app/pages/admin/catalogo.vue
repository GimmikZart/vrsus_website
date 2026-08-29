<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { VrsusRole } from '~/composables/useVrsusAuth'

type Activity = Database['public']['Tables']['activities']['Row']
type Station = Database['public']['Tables']['stations']['Row']
type CatalogTab = 'activities' | 'stations'

type ActivityForm = {
  name: string
  slug: string
  shortDescription: string
  description: string
  categoryId: string
  imagePath: string
  active: boolean
  seoTitle: string
  seoDescription: string
}

type StationForm = {
  name: string
  slug: string
  description: string
  categoryId: string
  defaultCapacity: number | undefined
  imagePath: string
  active: boolean
}

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'super_admin'] satisfies VrsusRole[],
})

const client = useSupabaseClient<Database>()
const {
  data: catalog,
  status: loadStatus,
  error: loadError,
  refresh,
} = await useAsyncData('admin-catalog', async () => {
  const [
    activitiesResult,
    stationsResult,
    activityCategoriesResult,
    stationCategoriesResult,
  ] = await Promise.all([
    client.from('activities').select('*').order('name'),
    client.from('stations').select('*').order('name'),
    client.from('activity_categories').select('*').order('name'),
    client.from('station_categories').select('*').order('name'),
  ])

  if (
    activitiesResult.error ||
    stationsResult.error ||
    activityCategoriesResult.error ||
    stationCategoriesResult.error
  ) {
    throw new Error('Impossibile caricare il catalogo amministrativo.')
  }

  return {
    activities: activitiesResult.data ?? [],
    stations: stationsResult.data ?? [],
    activityCategories: activityCategoriesResult.data ?? [],
    stationCategories: stationCategoriesResult.data ?? [],
  }
})

const activeTab = ref<CatalogTab>('activities')
const editingId = ref<string | null>(null)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

function emptyActivityForm(): ActivityForm {
  return {
    name: '',
    slug: '',
    shortDescription: '',
    description: '',
    categoryId: '',
    imagePath: '',
    active: true,
    seoTitle: '',
    seoDescription: '',
  }
}

function emptyStationForm(): StationForm {
  return {
    name: '',
    slug: '',
    description: '',
    categoryId: '',
    defaultCapacity: undefined,
    imagePath: '',
    active: true,
  }
}

const activityForm = reactive<ActivityForm>(emptyActivityForm())
const stationForm = reactive<StationForm>(emptyStationForm())

useSeoMeta({
  title: 'Gestione catalogo — VRSUS',
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

function resetMessages() {
  errorMessage.value = ''
  successMessage.value = ''
}

function startNew(tab: CatalogTab = activeTab.value) {
  activeTab.value = tab
  editingId.value = null
  if (tab === 'activities') Object.assign(activityForm, emptyActivityForm())
  else Object.assign(stationForm, emptyStationForm())
  resetMessages()
}

function editActivity(activity: Activity) {
  activeTab.value = 'activities'
  editingId.value = activity.id
  Object.assign(activityForm, {
    name: activity.name,
    slug: activity.slug,
    shortDescription: activity.short_description ?? '',
    description: activity.description ?? '',
    categoryId: activity.category_id ?? '',
    imagePath: activity.image_path ?? '',
    active: activity.active,
    seoTitle: activity.seo_title ?? '',
    seoDescription: activity.seo_description ?? '',
  })
  resetMessages()
}

function editStation(station: Station) {
  activeTab.value = 'stations'
  editingId.value = station.id
  Object.assign(stationForm, {
    name: station.name,
    slug: station.slug,
    description: station.description ?? '',
    categoryId: station.category_id ?? '',
    defaultCapacity: station.default_capacity ?? undefined,
    imagePath: station.image_path ?? '',
    active: station.active,
  })
  resetMessages()
}

async function saveActivity() {
  resetMessages()
  const name = activityForm.name.trim()
  const slug = slugify(activityForm.slug || name)
  if (!name || !slug) {
    errorMessage.value = 'Nome e slug sono obbligatori.'
    return
  }

  saving.value = true
  const payload: Database['public']['Tables']['activities']['Insert'] = {
    name,
    slug,
    short_description: activityForm.shortDescription.trim() || null,
    description: activityForm.description.trim() || null,
    category_id: activityForm.categoryId || null,
    image_path: activityForm.imagePath.trim() || null,
    active: activityForm.active,
    seo_title: activityForm.seoTitle.trim() || null,
    seo_description: activityForm.seoDescription.trim() || null,
  }
  const result = editingId.value
    ? await client.from('activities').update(payload).eq('id', editingId.value)
    : await client.from('activities').insert(payload)

  if (result.error) {
    errorMessage.value =
      result.error.code === '23505'
        ? 'Esiste già un’attività con questo slug.'
        : 'Salvataggio non riuscito. Controlla i dati e riprova.'
    saving.value = false
    return
  }

  saving.value = false
  successMessage.value = 'Attività salvata.'
  await refresh()
  editingId.value = null
  Object.assign(activityForm, emptyActivityForm())
}

async function saveStation() {
  resetMessages()
  const name = stationForm.name.trim()
  const slug = slugify(stationForm.slug || name)
  if (!name || !slug) {
    errorMessage.value = 'Nome e slug sono obbligatori.'
    return
  }
  if (
    stationForm.defaultCapacity !== undefined &&
    (!Number.isInteger(stationForm.defaultCapacity) ||
      stationForm.defaultCapacity <= 0)
  ) {
    errorMessage.value = 'La capienza standard deve essere un intero positivo.'
    return
  }

  saving.value = true
  const payload: Database['public']['Tables']['stations']['Insert'] = {
    name,
    slug,
    description: stationForm.description.trim() || null,
    category_id: stationForm.categoryId || null,
    default_capacity: stationForm.defaultCapacity ?? null,
    image_path: stationForm.imagePath.trim() || null,
    active: stationForm.active,
  }
  const result = editingId.value
    ? await client.from('stations').update(payload).eq('id', editingId.value)
    : await client.from('stations').insert(payload)

  if (result.error) {
    errorMessage.value =
      result.error.code === '23505'
        ? 'Esiste già una postazione con questo slug.'
        : 'Salvataggio non riuscito. Controlla i dati e riprova.'
    saving.value = false
    return
  }

  saving.value = false
  successMessage.value = 'Postazione salvata.'
  await refresh()
  editingId.value = null
  Object.assign(stationForm, emptyStationForm())
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
          class="text-brand-blue-400 mt-8 text-xs font-semibold tracking-[0.24em] uppercase"
        >
          CMS catalogo
        </p>
        <h1 class="font-display mt-3 text-4xl font-semibold text-white">
          Attività e postazioni
        </h1>
        <p class="mt-4 max-w-2xl text-white/55">
          Gestisci il catalogo globale. La disponibilità nel singolo evento
          verrà configurata separatamente.
        </p>
      </div>
      <UButton
        variant="outline"
        :label="
          activeTab === 'activities' ? 'Nuova attività' : 'Nuova postazione'
        "
        @click="startNew()"
      />
    </div>

    <div class="mt-10 flex flex-wrap gap-3 border-b border-white/10 pb-4">
      <UButton
        :variant="activeTab === 'activities' ? 'solid' : 'ghost'"
        label="Attività"
        @click="startNew('activities')"
      />
      <UButton
        :variant="activeTab === 'stations' ? 'solid' : 'ghost'"
        label="Postazioni"
        @click="startNew('stations')"
      />
    </div>

    <UAlert
      v-if="loadError"
      class="mt-6"
      color="error"
      variant="subtle"
      description="Impossibile caricare il catalogo."
    />
    <div
      v-if="loadStatus === 'pending'"
      class="mt-6 h-32 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]"
    />

    <div
      v-if="catalog"
      class="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,30rem)]"
    >
      <section class="space-y-3">
        <template v-if="activeTab === 'activities'">
          <UCard
            v-for="activity in catalog.activities"
            :key="activity.id"
            class="border border-white/10 bg-white/[0.04]"
          >
            <div
              class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <UBadge
                    :color="activity.active ? 'success' : 'neutral'"
                    variant="subtle"
                    :label="activity.active ? 'active' : 'inactive'"
                  />
                  <span class="text-xs text-white/35"
                    >/{{ activity.slug }}</span
                  >
                </div>
                <h2 class="font-display mt-3 text-xl font-semibold text-white">
                  {{ activity.name }}
                </h2>
                <p class="mt-2 text-sm text-white/50">
                  {{
                    activity.short_description ||
                    activity.description ||
                    'Nessuna descrizione.'
                  }}
                </p>
              </div>
              <UButton
                variant="outline"
                size="sm"
                label="Modifica"
                @click="editActivity(activity)"
              />
            </div>
          </UCard>
          <p
            v-if="!catalog.activities.length"
            class="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-white/55"
          >
            Nessuna attività presente.
          </p>
        </template>

        <template v-else>
          <UCard
            v-for="station in catalog.stations"
            :key="station.id"
            class="border border-white/10 bg-white/[0.04]"
          >
            <div
              class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <UBadge
                    :color="station.active ? 'success' : 'neutral'"
                    variant="subtle"
                    :label="station.active ? 'active' : 'inactive'"
                  />
                  <span class="text-xs text-white/35">/{{ station.slug }}</span>
                </div>
                <h2 class="font-display mt-3 text-xl font-semibold text-white">
                  {{ station.name }}
                </h2>
                <p class="mt-2 text-sm text-white/50">
                  {{
                    station.default_capacity
                      ? `Capienza standard: ${station.default_capacity}`
                      : 'Capienza da definire'
                  }}
                </p>
              </div>
              <UButton
                variant="outline"
                size="sm"
                label="Modifica"
                @click="editStation(station)"
              />
            </div>
          </UCard>
          <p
            v-if="!catalog.stations.length"
            class="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-white/55"
          >
            Nessuna postazione presente.
          </p>
        </template>
      </section>

      <UCard class="h-fit border border-white/10 bg-white/[0.04]">
        <h2 class="font-display text-xl font-semibold text-white">
          {{ editingId ? 'Modifica' : 'Nuova' }}
          {{ activeTab === 'activities' ? 'attività' : 'postazione' }}
        </h2>
        <form
          v-if="activeTab === 'activities'"
          class="mt-6 space-y-4"
          @submit.prevent="saveActivity"
        >
          <UFormField label="Nome" name="activityName"
            ><UInput v-model="activityForm.name" class="w-full" required
          /></UFormField>
          <UFormField label="Slug" name="activitySlug"
            ><UInput v-model="activityForm.slug" class="w-full"
          /></UFormField>
          <UFormField label="Categoria" name="activityCategory">
            <select
              v-model="activityForm.categoryId"
              class="vrsus-select w-full"
            >
              <option value="">Senza categoria</option>
              <option
                v-for="category in catalog?.activityCategories ?? []"
                :key="category.id"
                :value="category.id"
              >
                {{ category.name }}
              </option>
            </select>
          </UFormField>
          <UFormField label="Descrizione breve" name="activityShortDescription"
            ><UTextarea
              v-model="activityForm.shortDescription"
              class="w-full"
              :rows="2"
          /></UFormField>
          <UFormField label="Descrizione" name="activityDescription"
            ><UTextarea
              v-model="activityForm.description"
              class="w-full"
              :rows="5"
          /></UFormField>
          <AdminAssetUploader
            v-model="activityForm.imagePath"
            label="Immagine attività"
          />
          <UFormField label="Image path" name="activityImagePath"
            ><UInput v-model="activityForm.imagePath" class="w-full"
          /></UFormField>
          <UCheckbox v-model="activityForm.active" label="Attività attiva" />
          <UFormField label="SEO title" name="activitySeoTitle"
            ><UInput v-model="activityForm.seoTitle" class="w-full"
          /></UFormField>
          <UFormField label="SEO description" name="activitySeoDescription"
            ><UTextarea
              v-model="activityForm.seoDescription"
              class="w-full"
              :rows="2"
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
            <UButton type="submit" :loading="saving" label="Salva attività" />
            <UButton
              v-if="editingId"
              type="button"
              variant="ghost"
              label="Annulla"
              @click="startNew()"
            />
          </div>
        </form>

        <form v-else class="mt-6 space-y-4" @submit.prevent="saveStation">
          <UFormField label="Nome" name="stationName"
            ><UInput v-model="stationForm.name" class="w-full" required
          /></UFormField>
          <UFormField label="Slug" name="stationSlug"
            ><UInput v-model="stationForm.slug" class="w-full"
          /></UFormField>
          <UFormField label="Categoria" name="stationCategory">
            <select
              v-model="stationForm.categoryId"
              class="vrsus-select w-full"
            >
              <option value="">Senza categoria</option>
              <option
                v-for="category in catalog?.stationCategories ?? []"
                :key="category.id"
                :value="category.id"
              >
                {{ category.name }}
              </option>
            </select>
          </UFormField>
          <UFormField label="Descrizione" name="stationDescription"
            ><UTextarea
              v-model="stationForm.description"
              class="w-full"
              :rows="5"
          /></UFormField>
          <UFormField label="Capienza standard" name="stationCapacity"
            ><UInput
              v-model.number="stationForm.defaultCapacity"
              type="number"
              min="1"
              class="w-full"
          /></UFormField>
          <AdminAssetUploader
            v-model="stationForm.imagePath"
            label="Immagine postazione"
          />
          <UFormField label="Image path" name="stationImagePath"
            ><UInput v-model="stationForm.imagePath" class="w-full"
          /></UFormField>
          <UCheckbox v-model="stationForm.active" label="Postazione attiva" />
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
            <UButton type="submit" :loading="saving" label="Salva postazione" />
            <UButton
              v-if="editingId"
              type="button"
              variant="ghost"
              label="Annulla"
              @click="startNew()"
            />
          </div>
        </form>
      </UCard>
    </div>
  </main>
</template>
