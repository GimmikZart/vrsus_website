<script setup lang="ts">
import type { Database, Json } from '~/types/database.types'
import type { VrsusRole } from '~/composables/useVrsusAuth'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'super_admin'] satisfies VrsusRole[],
})

const client = useSupabaseClient<Database>()
const { user } = useVrsusAuth()
type SiteSetting = Database['public']['Tables']['site_settings']['Row']

const {
  data: settings,
  status,
  error,
  refresh,
} = await useAsyncData<SiteSetting[]>('admin-site-settings', async () => {
  const { data, error } = await client
    .from('site_settings')
    .select('*')
    .order('key', { ascending: true })
  if (error) throw error
  return data ?? []
})

const form = reactive({ key: '', value: '{}' })
const pending = ref(false)
const message = ref('')
const errorMessage = ref('')

function editSetting(setting: SiteSetting) {
  form.key = setting.key
  form.value = JSON.stringify(setting.value, null, 2)
  message.value = ''
  errorMessage.value = ''
}

function resetForm() {
  form.key = ''
  form.value = '{}'
  message.value = ''
  errorMessage.value = ''
}

async function saveSetting() {
  const key = form.key.trim()
  if (!/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(key)) {
    errorMessage.value =
      'La chiave deve usare solo minuscole, numeri, punti, trattini o underscore.'
    return
  }

  let value: Json
  try {
    value = JSON.parse(form.value) as Json
  } catch {
    errorMessage.value = 'Il valore deve essere JSON valido.'
    return
  }

  pending.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    const { error } = await client.from('site_settings').upsert({
      key,
      value,
      updated_by: user.value?.sub ?? null,
    })
    if (error) throw error
    resetForm()
    message.value = 'Impostazione salvata.'
    await refresh()
  } catch {
    errorMessage.value = 'Non è stato possibile salvare l’impostazione.'
  } finally {
    pending.value = false
  }
}

useSeoMeta({ title: 'Impostazioni — Admin VRSUS', robots: 'noindex, nofollow' })
</script>

<template>
  <main
    class="mx-auto min-h-[calc(100vh-9rem)] max-w-6xl px-5 py-16 sm:px-8 lg:py-24"
  >
    <NuxtLink to="/admin" class="text-sm text-white/50 hover:text-white"
      >← Console</NuxtLink
    >
    <header class="mt-8 max-w-3xl">
      <p
        class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
      >
        Configurazione
      </p>
      <h1 class="font-display mt-3 text-4xl font-semibold text-white">
        Impostazioni applicative<span class="text-brand-red-500">.</span>
      </h1>
      <p class="mt-4 text-white/55">
        Gestisci configurazioni leggere e strutturate. Non inserire password,
        token o secret in questa tabella.
      </p>
    </header>

    <UAlert
      v-if="message"
      class="mt-8 max-w-xl"
      color="success"
      variant="subtle"
      :description="message"
    />
    <UAlert
      v-if="errorMessage"
      class="mt-8 max-w-xl"
      color="error"
      variant="subtle"
      :description="errorMessage"
    />

    <section
      class="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]"
    >
      <UCard class="border border-white/10 bg-white/[0.04]">
        <template #header
          ><h2 class="font-display text-xl font-semibold text-white">
            Nuova impostazione
          </h2></template
        >
        <div class="space-y-5">
          <UFormField label="Chiave" name="key"
            ><UInput
              v-model="form.key"
              placeholder="booking.almost-full-threshold"
          /></UFormField>
          <UFormField label="Valore JSON" name="value"
            ><UTextarea
              v-model="form.value"
              :rows="8"
              class="font-mono text-sm"
          /></UFormField>
          <div class="flex flex-wrap gap-3">
            <UButton
              :loading="pending"
              color="primary"
              label="Salva"
              @click="saveSetting"
            /><UButton
              color="neutral"
              variant="outline"
              label="Pulisci"
              @click="resetForm"
            />
          </div>
        </div>
      </UCard>
      <div>
        <h2 class="font-display text-xl font-semibold text-white">
          Impostazioni presenti
        </h2>
        <div v-if="status === 'pending'" class="mt-4 text-sm text-white/50">
          Caricamento…
        </div>
        <UAlert
          v-else-if="error"
          class="mt-4"
          color="error"
          variant="subtle"
          description="Non è stato possibile caricare le impostazioni."
        />
        <div
          v-else-if="!settings?.length"
          class="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/50"
        >
          Nessuna impostazione salvata.
        </div>
        <div v-else class="mt-4 space-y-3">
          <button
            v-for="setting in settings"
            :key="setting.key"
            type="button"
            class="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition-colors hover:border-white/25"
            @click="editSetting(setting)"
          >
            <p class="font-mono text-sm text-white">{{ setting.key }}</p>
            <p
              class="mt-2 line-clamp-3 text-xs whitespace-pre-wrap text-white/45"
            >
              {{ JSON.stringify(setting.value, null, 2) }}
            </p>
          </button>
        </div>
      </div>
    </section>
  </main>
</template>
