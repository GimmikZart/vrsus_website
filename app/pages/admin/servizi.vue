<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { VrsusRole } from '~/composables/useVrsusAuth'

type ServicePage = Database['public']['Tables']['service_pages']['Row']

type ServiceForm = {
  title: string
  slug: string
  excerpt: string
  content: string
  coverImagePath: string
  active: boolean
  sortOrder: number
  seoTitle: string
  seoDescription: string
}

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'super_admin'] satisfies VrsusRole[],
})

const client = useSupabaseClient<Database>()
const {
  data: services,
  status: loadStatus,
  error: loadError,
  refresh,
} = await useAsyncData<ServicePage[]>('admin-service-pages', async () => {
  const { data, error } = await client
    .from('service_pages')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true })

  if (error) throw new Error('Impossibile caricare i servizi amministrativi.')
  return data ?? []
})

const editingId = ref<string | null>(null)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

function emptyForm(): ServiceForm {
  return {
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    coverImagePath: '',
    active: true,
    sortOrder: 0,
    seoTitle: '',
    seoDescription: '',
  }
}

const form = reactive<ServiceForm>(emptyForm())

useSeoMeta({
  title: 'Gestione servizi — VRSUS',
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

function editService(service: ServicePage) {
  editingId.value = service.id
  Object.assign(form, {
    title: service.title,
    slug: service.slug,
    excerpt: service.excerpt ?? '',
    content: service.content,
    coverImagePath: service.cover_image_path ?? '',
    active: service.active,
    sortOrder: service.sort_order,
    seoTitle: service.seo_title ?? '',
    seoDescription: service.seo_description ?? '',
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

async function saveService() {
  errorMessage.value = ''
  successMessage.value = ''
  const title = form.title.trim()
  const slug = slugify(form.slug || title)
  const content = form.content.trim()

  if (!title || !slug || !content) {
    errorMessage.value = 'Titolo, slug e contenuto sono obbligatori.'
    return
  }

  saving.value = true
  const payload: Database['public']['Tables']['service_pages']['Insert'] = {
    title,
    slug,
    excerpt: form.excerpt.trim() || null,
    content,
    cover_image_path: form.coverImagePath.trim() || null,
    active: form.active,
    sort_order: Number.isFinite(form.sortOrder) ? form.sortOrder : 0,
    seo_title: form.seoTitle.trim() || null,
    seo_description: form.seoDescription.trim() || null,
  }

  const result = editingId.value
    ? await client
        .from('service_pages')
        .update(payload)
        .eq('id', editingId.value)
    : await client.from('service_pages').insert(payload)

  if (result.error) {
    errorMessage.value =
      result.error.code === '23505'
        ? 'Esiste già un servizio con questo slug.'
        : 'Salvataggio non riuscito. Controlla i dati e riprova.'
    saving.value = false
    return
  }

  successMessage.value = form.active
    ? 'Servizio salvato e attivo.'
    : 'Servizio salvato come inattivo.'
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
          class="text-brand-blue-400 mt-8 text-xs font-semibold tracking-[0.24em] uppercase"
        >
          CMS servizi
        </p>
        <h1 class="font-display mt-3 text-4xl font-semibold text-white">
          Gestione servizi
        </h1>
        <p class="mt-4 max-w-2xl text-white/55">
          Attiva o aggiorna le pagine dei servizi esterni all'evento mensile.
        </p>
      </div>
      <UButton variant="outline" label="Nuovo servizio" @click="startNew" />
    </div>

    <div
      class="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)]"
    >
      <section class="space-y-3">
        <UAlert
          v-if="loadError"
          color="error"
          variant="subtle"
          description="Impossibile caricare i servizi."
        />
        <div
          v-if="loadStatus === 'pending'"
          class="h-32 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]"
        />
        <UCard
          v-for="service in services ?? []"
          :key="service.id"
          class="border border-white/10 bg-white/[0.04]"
        >
          <div
            class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <UBadge
                  :color="service.active ? 'success' : 'neutral'"
                  variant="subtle"
                  :label="service.active ? 'active' : 'inactive'"
                />
                <span class="text-xs text-white/35">/{{ service.slug }}</span>
              </div>
              <h2 class="font-display mt-3 text-xl font-semibold text-white">
                {{ service.title }}
              </h2>
              <p class="mt-2 line-clamp-2 text-sm leading-6 text-white/50">
                {{ service.excerpt || service.content }}
              </p>
            </div>
            <UButton
              variant="outline"
              size="sm"
              label="Modifica"
              @click="editService(service)"
            />
          </div>
        </UCard>
        <p
          v-if="loadStatus !== 'pending' && !services?.length"
          class="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-white/55"
        >
          Nessun servizio presente.
        </p>
      </section>

      <UCard class="h-fit border border-white/10 bg-white/[0.04]">
        <h2 class="font-display text-xl font-semibold text-white">
          {{ editingId ? 'Modifica servizio' : 'Nuovo servizio' }}
        </h2>
        <form class="mt-6 space-y-4" @submit.prevent="saveService">
          <UFormField label="Titolo" name="title"
            ><UInput v-model="form.title" class="w-full" required
          /></UFormField>
          <UFormField
            label="Slug"
            name="slug"
            hint="Lascia vuoto per generarlo dal titolo."
            ><UInput v-model="form.slug" class="w-full"
          /></UFormField>
          <UFormField label="Excerpt" name="excerpt"
            ><UTextarea v-model="form.excerpt" class="w-full" :rows="3"
          /></UFormField>
          <UFormField label="Contenuto" name="content"
            ><UTextarea
              v-model="form.content"
              class="w-full"
              :rows="7"
              required
          /></UFormField>
          <AdminAssetUploader
            v-model="form.coverImagePath"
            label="Cover servizio"
          />
          <UFormField label="Cover image path" name="coverImagePath"
            ><UInput v-model="form.coverImagePath" class="w-full"
          /></UFormField>
          <UFormField label="Ordine" name="sortOrder"
            ><UInput
              v-model.number="form.sortOrder"
              type="number"
              min="0"
              class="w-full"
          /></UFormField>
          <UFormField label="SEO title" name="seoTitle"
            ><UInput v-model="form.seoTitle" class="w-full"
          /></UFormField>
          <UFormField label="SEO description" name="seoDescription"
            ><UTextarea v-model="form.seoDescription" class="w-full" :rows="3"
          /></UFormField>
          <UCheckbox v-model="form.active" label="Pagina attiva e pubblica" />
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
          <div class="flex gap-3 pt-2">
            <UButton type="submit" :loading="saving" label="Salva" />
            <UButton
              type="button"
              variant="outline"
              color="neutral"
              label="Annulla"
              @click="startNew"
            />
          </div>
        </form>
      </UCard>
    </div>
  </main>
</template>
