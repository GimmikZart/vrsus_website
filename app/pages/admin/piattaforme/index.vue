<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { VrsusRole } from '~/composables/useVrsusAuth'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
  requiredRoles: ['admin'] satisfies VrsusRole[],
})

type PlatformRow = Database['public']['Tables']['platforms']['Row'] & {
  games_count: number
}
type Payload = {
  platforms: PlatformRow[]
  categories: Database['public']['Tables']['platform_categories']['Row'][]
}

// `platforms` non ha grant per il browser: si passa dagli endpoint.
const { data, refresh, status } = await useFetch<Payload>(
  '/api/admin/platforms',
)

const creating = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const form = reactive({
  name: '',
  code: '',
  description: '',
  imagePath: '',
  categoryId: '',
  defaultCapacity: undefined as number | undefined,
  internal: false,
  active: true,
})

function resetForm() {
  Object.assign(form, {
    name: '',
    code: '',
    description: '',
    imagePath: '',
    categoryId: '',
    defaultCapacity: undefined,
    internal: false,
    active: true,
  })
}

async function create() {
  errorMessage.value = ''
  successMessage.value = ''

  if (!form.name.trim() || !form.code.trim()) {
    errorMessage.value = 'Nome e codice sono obbligatori.'
    return
  }

  saving.value = true
  try {
    await $fetch('/api/admin/platforms', {
      method: 'POST',
      body: {
        name: form.name,
        code: form.code,
        description: form.description,
        imagePath: form.imagePath,
        categoryId: form.categoryId || null,
        defaultCapacity: form.defaultCapacity ?? null,
        internal: form.internal,
        active: form.active,
      },
    })
    successMessage.value = 'Postazione creata.'
    resetForm()
    creating.value = false
    await refresh()
  } catch (error) {
    errorMessage.value =
      (error as { statusCode?: number })?.statusCode === 409
        ? 'Esiste già una postazione con questo codice.'
        : 'Creazione non riuscita. Controlla i dati.'
  } finally {
    saving.value = false
  }
}

usePageActions(
  computed(() =>
    creating.value
      ? [
          {
            label: 'Chiudi',
            icon: 'i-lucide-x',
            onClick: () => {
              creating.value = false
            },
          },
          {
            label: 'Crea postazione',
            icon: 'i-lucide-plus',
            color: 'primary' as const,
            onClick: create,
            loading: saving.value,
            disabled: !form.name.trim() || !form.code.trim() || saving.value,
          },
        ]
      : [
          {
            label: 'Nuova postazione',
            onClick: async () => {
              creating.value = true
              await nextTick()
              document
                .getElementById('new-platform-form')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            },
          },
        ],
  ),
)

useSeoMeta({ title: 'Postazioni — Admin VRSUS', robots: 'noindex, nofollow' })
</script>

<template>
  <div>
    <header
      class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <p
          class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
        >
          Catalogo
        </p>
        <h1 class="font-display mt-3 text-3xl font-semibold text-white">
          Postazioni
        </h1>
        <p class="mt-2 max-w-2xl text-white/50">
          Le postazioni marcate come interne restano invisibili in vetrina ma
          restano utilizzabili per eventi e tornei.
        </p>
      </div>
    </header>

    <UAlert
      v-if="successMessage"
      class="mt-6 max-w-xl"
      color="success"
      variant="subtle"
      :description="successMessage"
    />

    <section
      v-if="creating"
      id="new-platform-form"
      class="mt-6 scroll-mt-20 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
    >
      <h2 class="font-display text-lg font-semibold text-white">
        Nuova postazione
      </h2>

      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <UFormField label="Nome">
          <UInput v-model="form.name" class="w-full" />
        </UFormField>
        <UFormField
          label="Codice"
          help="Label breve mostrata sulle card dei giochi."
        >
          <UInput v-model="form.code" class="w-full" placeholder="PS5" />
        </UFormField>
        <UFormField label="Categoria">
          <select v-model="form.categoryId" class="vrsus-select">
            <option value="">Nessuna</option>
            <option
              v-for="category in data?.categories ?? []"
              :key="category.id"
              :value="category.id"
            >
              {{ category.name }}
            </option>
          </select>
        </UFormField>
        <UFormField label="Capienza standard">
          <UInput
            v-model.number="form.defaultCapacity"
            type="number"
            min="1"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Immagine">
          <AdminAssetUploader v-model="form.imagePath" />
        </UFormField>
      </div>

      <UFormField class="mt-4" label="Descrizione">
        <UInput v-model="form.description" class="w-full" />
      </UFormField>

      <div class="mt-4 flex flex-wrap gap-5 text-sm text-white/70">
        <label class="flex items-center gap-2">
          <input v-model="form.internal" type="checkbox" class="size-4" />
          Solo uso interno
        </label>
        <label class="flex items-center gap-2">
          <input v-model="form.active" type="checkbox" class="size-4" />
          Attiva
        </label>
      </div>

      <UAlert
        v-if="errorMessage"
        class="mt-4"
        color="error"
        variant="subtle"
        :description="errorMessage"
      />
    </section>

    <!--
      Due colonne gia da mobile: le card sono corte e in colonna singola
      costringevano a scorrere per contare le postazioni.
    -->
    <div
      v-if="status === 'pending'"
      class="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3"
    >
      <div
        v-for="index in 6"
        :key="index"
        class="h-40 animate-pulse rounded-2xl bg-white/[0.03]"
      />
    </div>

    <div
      v-else
      v-vrsus-motion="'cards'"
      class="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3"
    >
      <NuxtLink
        v-for="platform in data?.platforms ?? []"
        :key="platform.id"
        :to="`/admin/piattaforme/${platform.id}`"
        class="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-colors hover:border-white/25"
      >
        <UiVrsusEntityImage
          :src="platform.image_path"
          :alt="platform.name"
          kind="platform"
          class="aspect-[16/9] w-full"
        />
        <div class="p-3.5 sm:p-5">
          <div class="flex items-start justify-between gap-3">
            <span
              class="rounded-lg bg-white/10 px-2 py-1 text-[11px] font-semibold tracking-wider text-white/70"
            >
              {{ platform.code }}
            </span>
            <div class="flex flex-col items-end gap-1">
              <span
                v-if="platform.internal"
                class="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-300"
                >Interna</span
              >
              <span
                v-if="!platform.active"
                class="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/50"
                >Disattivata</span
              >
            </div>
          </div>

          <h2
            class="font-display mt-3 text-base leading-tight font-semibold text-white sm:mt-4 sm:text-lg"
          >
            {{ platform.name }}
          </h2>
          <p
            v-if="platform.description"
            class="mt-2 line-clamp-2 text-[13px] text-white/50 sm:text-sm"
          >
            {{ platform.description }}
          </p>
          <p class="mt-3 text-xs text-white/40">
            {{ platform.games_count }} giochi
          </p>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
