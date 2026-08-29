<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { VrsusRole } from '~/composables/useVrsusAuth'

type NewsPost = Database['public']['Tables']['news_posts']['Row']
type NewsStatus = 'draft' | 'published' | 'archived'

type NewsForm = {
  title: string
  slug: string
  excerpt: string
  content: string
  status: NewsStatus
  publishedAt: string
  coverImagePath: string
  seoTitle: string
  seoDescription: string
  showOnHome: boolean
  showInApp: boolean
  pushOnPublish: boolean
}

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'super_admin'] satisfies VrsusRole[],
})

const client = useSupabaseClient<Database>()
const { user } = useVrsusAuth()
const {
  data: posts,
  status: loadStatus,
  error: loadError,
  refresh,
} = await useAsyncData<NewsPost[]>('admin-news-posts', async () => {
  const { data, error } = await client
    .from('news_posts')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) throw new Error('Impossibile caricare le news amministrative.')
  return data ?? []
})

const statusOptions: NewsStatus[] = ['draft', 'published', 'archived']
const editingId = ref<string | null>(null)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

function emptyForm(): NewsForm {
  return {
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    status: 'draft',
    publishedAt: '',
    coverImagePath: '',
    seoTitle: '',
    seoDescription: '',
    showOnHome: false,
    showInApp: true,
    pushOnPublish: false,
  }
}

const form = reactive<NewsForm>(emptyForm())

useSeoMeta({
  title: 'Gestione news — VRSUS',
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

function editPost(post: NewsPost) {
  editingId.value = post.id
  Object.assign(form, {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? '',
    content: post.content,
    status: post.status as NewsStatus,
    publishedAt: toDateTimeInput(post.published_at),
    coverImagePath: post.cover_image_path ?? '',
    seoTitle: post.seo_title ?? '',
    seoDescription: post.seo_description ?? '',
    showOnHome: post.show_on_home,
    showInApp: post.show_in_app,
    pushOnPublish: post.push_on_publish,
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

async function savePost() {
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
  const publishedAt =
    form.status === 'published'
      ? form.publishedAt
        ? new Date(form.publishedAt).toISOString()
        : new Date().toISOString()
      : null
  const payload = {
    title,
    slug,
    excerpt: form.excerpt.trim() || null,
    content,
    status: form.status,
    published_at: publishedAt,
    cover_image_path: form.coverImagePath.trim() || null,
    seo_title: form.seoTitle.trim() || null,
    seo_description: form.seoDescription.trim() || null,
    show_on_home: form.showOnHome,
    show_in_app: form.showInApp,
    push_on_publish: form.pushOnPublish,
  }

  const result = editingId.value
    ? await client.from('news_posts').update(payload).eq('id', editingId.value)
    : await client
        .from('news_posts')
        .insert({ ...payload, author_id: user.value?.sub ?? null })

  if (result.error) {
    errorMessage.value =
      result.error.code === '23505'
        ? 'Esiste già una news con questo slug.'
        : 'Salvataggio non riuscito. Controlla i dati e riprova.'
    saving.value = false
    return
  }

  successMessage.value =
    form.status === 'published' ? 'News pubblicata.' : 'News salvata.'
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
          CMS editoriale
        </p>
        <h1 class="font-display mt-3 text-4xl font-semibold text-white">
          Gestione news
        </h1>
        <p class="mt-4 max-w-2xl text-white/55">
          I contenuti pubblicati diventano disponibili sul sito pubblico e nella
          sitemap.
        </p>
      </div>
      <UButton variant="outline" label="Nuova news" @click="startNew" />
    </div>

    <div
      class="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)]"
    >
      <section class="space-y-3">
        <UAlert
          v-if="loadError"
          color="error"
          variant="subtle"
          description="Impossibile caricare le news."
        />
        <div
          v-if="loadStatus === 'pending'"
          class="h-32 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]"
        />
        <UCard
          v-for="post in posts ?? []"
          :key="post.id"
          class="border border-white/10 bg-white/[0.04]"
        >
          <div
            class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <UBadge
                  :color="post.status === 'published' ? 'success' : 'neutral'"
                  variant="subtle"
                  :label="post.status"
                />
                <span class="text-xs text-white/35">/{{ post.slug }}</span>
              </div>
              <h2 class="font-display mt-3 text-xl font-semibold text-white">
                {{ post.title }}
              </h2>
              <p class="mt-2 line-clamp-2 text-sm leading-6 text-white/50">
                {{ post.excerpt || post.content }}
              </p>
            </div>
            <UButton
              variant="outline"
              size="sm"
              label="Modifica"
              @click="editPost(post)"
            />
          </div>
        </UCard>
        <p
          v-if="loadStatus !== 'pending' && !posts?.length"
          class="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-white/55"
        >
          Nessuna news presente.
        </p>
      </section>

      <UCard class="h-fit border border-white/10 bg-white/[0.04]">
        <h2 class="font-display text-xl font-semibold text-white">
          {{ editingId ? 'Modifica news' : 'Nuova news' }}
        </h2>
        <form class="mt-6 space-y-4" @submit.prevent="savePost">
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
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Stato" name="status"
              ><USelect
                v-model="form.status"
                :items="statusOptions"
                class="w-full"
            /></UFormField>
            <UFormField label="Data pubblicazione" name="publishedAt"
              ><UInput
                v-model="form.publishedAt"
                type="datetime-local"
                class="w-full"
            /></UFormField>
          </div>
          <AdminAssetUploader
            v-model="form.coverImagePath"
            label="Cover news"
          />
          <UFormField label="Cover image path" name="coverImagePath"
            ><UInput v-model="form.coverImagePath" class="w-full"
          /></UFormField>
          <UFormField label="SEO title" name="seoTitle"
            ><UInput v-model="form.seoTitle" class="w-full"
          /></UFormField>
          <UFormField label="SEO description" name="seoDescription"
            ><UTextarea v-model="form.seoDescription" class="w-full" :rows="3"
          /></UFormField>
          <div class="space-y-3 pt-2">
            <UCheckbox v-model="form.showOnHome" label="Mostra in homepage" />
            <UCheckbox v-model="form.showInApp" label="Mostra nell'app" />
            <UCheckbox
              v-model="form.pushOnPublish"
              label="Prepara push alla pubblicazione"
            />
          </div>
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
