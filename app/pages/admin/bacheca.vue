<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { VrsusRole } from '~/composables/useVrsusAuth'
import { slugify } from '~/utils/slugify'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'super_admin'] satisfies VrsusRole[],
})

type BoardPayload = {
  posts: (Database['public']['Tables']['board_posts']['Row'] & {
    options: { id: string; label: string; votes: number }[]
  })[]
  feedback: Database['public']['Tables']['user_feedback']['Row'][]
}

const { data, refresh, status } =
  await useFetch<BoardPayload>('/api/admin/board')

const creating = ref(false)
const saving = ref(false)
const message = ref('')
const errorMessage = ref('')

const form = reactive({
  title: '',
  body: '',
  postType: 'announcement' as 'announcement' | 'poll',
  imagePath: '',
  pinned: false,
  publish: true,
  options: ['', ''],
})

function addOption() {
  form.options.push('')
}
function removeOption(index: number) {
  if (form.options.length > 2) form.options.splice(index, 1)
}

async function create() {
  errorMessage.value = ''
  message.value = ''

  const title = form.title.trim()
  const slug = slugify(title)
  if (!title || !slug) {
    errorMessage.value = 'Il titolo è obbligatorio.'
    return
  }

  const options = form.options.map((option) => option.trim()).filter(Boolean)
  if (form.postType === 'poll' && options.length < 2) {
    errorMessage.value = 'Un sondaggio ha bisogno di almeno due opzioni.'
    return
  }

  saving.value = true
  try {
    await $fetch('/api/admin/board', {
      method: 'POST',
      body: {
        title,
        slug,
        body: form.body,
        postType: form.postType,
        imagePath: form.imagePath,
        pinned: form.pinned,
        publish: form.publish,
        options,
      },
    })
    message.value = 'Post pubblicato.'
    Object.assign(form, {
      title: '',
      body: '',
      postType: 'announcement',
      imagePath: '',
      pinned: false,
      publish: true,
      options: ['', ''],
    })
    creating.value = false
    await refresh()
  } catch (error) {
    errorMessage.value =
      (error as { statusCode?: number })?.statusCode === 409
        ? 'Pubblicazione in conflitto: riprova.'
        : 'Pubblicazione non riuscita. Controlla i dati.'
  } finally {
    saving.value = false
  }
}

async function setStatus(postId: string, newStatus: string) {
  await $fetch(`/api/admin/board/${postId}`, {
    method: 'PATCH',
    body: { status: newStatus },
  })
  await refresh()
}

const feedbackLabels: Record<string, string> = {
  message: 'Messaggio',
  suggestion: 'Consiglio',
  review: 'Recensione',
}

async function markFeedbackReviewed(feedbackId: string) {
  await $fetch(`/api/admin/board/feedback/${feedbackId}`, {
    method: 'PATCH',
    body: { status: 'reviewed' },
  })
  await refresh()
}

useSeoMeta({ title: 'Bacheca — Admin VRSUS', robots: 'noindex, nofollow' })
</script>

<template>
  <div>
    <NuxtLink to="/admin/altro" class="text-sm text-white/45 hover:text-white">
      ← Altro
    </NuxtLink>

    <header
      class="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <p
          class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
        >
          Contenuti
        </p>
        <h1 class="font-display mt-3 text-3xl font-semibold text-white">
          Bacheca
        </h1>
        <p class="mt-2 max-w-2xl text-white/50">
          Annunci e sondaggi mostrati agli utenti autenticati.
        </p>
      </div>
      <UButton
        :color="creating ? 'neutral' : 'primary'"
        :variant="creating ? 'outline' : 'solid'"
        :label="creating ? 'Chiudi' : 'Nuovo post'"
        @click="creating = !creating"
      />
    </header>

    <UAlert
      v-if="message"
      class="mt-6 max-w-xl"
      color="success"
      variant="subtle"
      :description="message"
    />

    <section
      v-if="creating"
      class="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="Titolo"
          ><UInput v-model="form.title" class="w-full"
        /></UFormField>
        <UFormField label="Tipo">
          <select v-model="form.postType" class="vrsus-select">
            <option value="announcement">Annuncio</option>
            <option value="poll">Sondaggio</option>
          </select>
        </UFormField>
        <UFormField label="Immagine">
          <AdminAssetUploader v-model="form.imagePath" />
        </UFormField>
      </div>

      <UFormField class="mt-4" label="Testo">
        <UTextarea v-model="form.body" :rows="4" class="w-full" />
      </UFormField>

      <div v-if="form.postType === 'poll'" class="mt-4">
        <p class="mb-2 text-xs tracking-wide text-white/45 uppercase">
          Opzioni del sondaggio
        </p>
        <div class="space-y-2">
          <div
            v-for="(_, index) in form.options"
            :key="index"
            class="flex gap-2"
          >
            <UInput
              v-model="form.options[index]"
              class="flex-1"
              :placeholder="`Opzione ${index + 1}`"
            />
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              :disabled="form.options.length <= 2"
              @click="removeOption(index)"
            />
          </div>
        </div>
        <UButton
          class="mt-2"
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-plus"
          label="Aggiungi opzione"
          @click="addOption"
        />
      </div>

      <div class="mt-4 flex flex-wrap gap-5 text-sm text-white/70">
        <label class="flex items-center gap-2">
          <input v-model="form.pinned" type="checkbox" class="size-4" />
          In evidenza
        </label>
        <label class="flex items-center gap-2">
          <input v-model="form.publish" type="checkbox" class="size-4" />
          Pubblica subito
        </label>
      </div>

      <UAlert
        v-if="errorMessage"
        class="mt-4"
        color="error"
        variant="subtle"
        :description="errorMessage"
      />

      <UButton
        class="mt-5"
        color="primary"
        :loading="saving"
        label="Salva post"
        @click="create"
      />
    </section>

    <div v-if="status === 'pending'" class="mt-8 space-y-3">
      <div
        v-for="index in 3"
        :key="index"
        class="h-28 animate-pulse rounded-2xl bg-white/[0.03]"
      />
    </div>

    <template v-else>
      <section class="mt-10">
        <h2 class="font-display text-xl font-semibold text-white">Post</h2>

        <p v-if="!data?.posts.length" class="mt-3 text-sm text-white/45">
          Nessun post creato.
        </p>

        <div class="mt-4 space-y-3">
          <article
            v-for="post in data?.posts ?? []"
            :key="post.id"
            class="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          >
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] tracking-wide text-white/60 uppercase"
              >
                {{ post.post_type === 'poll' ? 'Sondaggio' : 'Annuncio' }}
              </span>
              <span
                class="rounded-full px-2.5 py-0.5 text-[11px] tracking-wide uppercase"
                :class="
                  post.status === 'published'
                    ? 'bg-green-500/15 text-green-300'
                    : 'bg-white/10 text-white/50'
                "
              >
                {{ post.status }}
              </span>
              <span v-if="post.pinned" class="text-brand-red-400 text-[11px]"
                >In evidenza</span
              >
            </div>

            <h3 class="font-display mt-3 font-semibold text-white">
              {{ post.title }}
            </h3>
            <p v-if="post.body" class="mt-1 line-clamp-2 text-sm text-white/50">
              {{ post.body }}
            </p>

            <ul
              v-if="post.options.length"
              class="mt-3 space-y-1 text-sm text-white/60"
            >
              <li
                v-for="option in post.options"
                :key="option.id"
                class="flex justify-between"
              >
                <span>{{ option.label }}</span>
                <span class="text-white/40">{{ option.votes }} voti</span>
              </li>
            </ul>

            <div class="mt-4 flex flex-wrap gap-2">
              <UButton
                v-if="post.status !== 'published'"
                color="primary"
                variant="outline"
                size="xs"
                label="Pubblica"
                @click="setStatus(post.id, 'published')"
              />
              <UButton
                v-if="post.status === 'published'"
                color="neutral"
                variant="outline"
                size="xs"
                label="Archivia"
                @click="setStatus(post.id, 'archived')"
              />
            </div>
          </article>
        </div>
      </section>

      <section class="mt-10">
        <h2 class="font-display text-xl font-semibold text-white">
          Messaggi dagli utenti
        </h2>
        <p class="mt-1 text-sm text-white/45">
          Materiale interno: non compare in nessuna pagina pubblica.
        </p>

        <p v-if="!data?.feedback.length" class="mt-3 text-sm text-white/45">
          Nessun messaggio ricevuto.
        </p>

        <div class="mt-4 space-y-3">
          <article
            v-for="item in data?.feedback ?? []"
            :key="item.id"
            class="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div class="flex flex-wrap items-center gap-2 text-xs">
              <span class="rounded-full bg-white/10 px-2 py-0.5 text-white/60">
                {{ feedbackLabels[item.kind] ?? item.kind }}
              </span>
              <span v-if="item.rating" class="text-brand-red-400"
                >{{ item.rating }}/5</span
              >
              <span class="text-white/35">{{ item.status }}</span>
            </div>
            <p class="mt-2 text-sm whitespace-pre-line text-white/70">
              {{ item.body }}
            </p>
            <UButton
              v-if="item.status === 'new'"
              class="mt-3"
              color="neutral"
              variant="ghost"
              size="xs"
              label="Segna come letto"
              @click="markFeedbackReviewed(item.id)"
            />
          </article>
        </div>
      </section>
    </template>
  </div>
</template>
