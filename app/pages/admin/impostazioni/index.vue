<script setup lang="ts">
import type { Database, Json } from '~/types/database.types'
import type { VrsusRole } from '~/composables/useVrsusAuth'

definePageMeta({
  layout: 'admin',
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

// --- Tessere ARCI ----------------------------------------------------------
// La validita non e un campo che qualcuno deve ricordarsi di azzerare: una
// tessera vale finche siamo nella stagione in cui e stata vista. Qui si decide
// quando comincia la stagione nuova, e si puo chiuderla subito a mano.
const {
  data: arci,
  refresh: refreshArci,
  error: arciLoadError,
} = await useAsyncData('admin-arci-membership', async () => {
  const { data, error } = await client.rpc('arci_membership_overview')
  if (error) throw error
  return data?.[0] ?? null
})

const MONTHS = [
  'gennaio',
  'febbraio',
  'marzo',
  'aprile',
  'maggio',
  'giugno',
  'luglio',
  'agosto',
  'settembre',
  'ottobre',
  'novembre',
  'dicembre',
]

const renewal = reactive({
  month: arci.value?.renewal_month ?? 10,
  day: arci.value?.renewal_day ?? 1,
})

const arciPending = ref(false)
const arciMessage = ref('')
const arciError = ref('')
const askReset = ref(false)

const seasonStartLabel = computed(() => {
  const value = arci.value?.season_start
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
})

async function saveRenewal() {
  arciPending.value = true
  arciMessage.value = ''
  arciError.value = ''

  const { error } = await client.rpc('set_arci_renewal', {
    p_month: Number(renewal.month),
    p_day: Number(renewal.day),
  })

  arciPending.value = false

  if (error) {
    arciError.value = 'Data di rinnovo non valida.'
    return
  }

  arciMessage.value = 'Data di rinnovo aggiornata.'
  await refreshArci()
}

async function resetCards() {
  arciPending.value = true
  arciMessage.value = ''
  arciError.value = ''

  const { error } = await client.rpc('reset_arci_cards')

  arciPending.value = false
  askReset.value = false

  if (error) {
    arciError.value = 'Non e stato possibile azzerare le tessere.'
    return
  }

  arciMessage.value =
    'Tessere azzerate: da adesso vanno mostrate di nuovo alla porta.'
  await refreshArci()
}

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
  <div>
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

    <section class="mt-10">
      <UCard class="border border-white/10 bg-white/[0.04]">
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="font-display text-xl font-semibold text-white">
              Tessere ARCI
            </h2>
            <div v-if="arci" class="text-right">
              <p class="font-display text-2xl font-semibold text-white">
                {{ arci.valid_count
                }}<span class="text-base text-white/30"
                  >/{{ arci.member_count }}</span
                >
              </p>
              <p class="text-[11px] tracking-wide text-white/40 uppercase">
                Tesserati
              </p>
            </div>
          </div>
        </template>

        <UAlert
          v-if="arciLoadError"
          color="error"
          variant="subtle"
          description="Non è stato possibile leggere lo stato delle tessere."
        />

        <div v-else class="space-y-5">
          <p class="max-w-2xl text-sm leading-6 text-white/55">
            Una tessera vale finché siamo nella stagione associativa in cui lo
            staff l’ha vista. La stagione corrente è cominciata il
            <span class="text-white/85">{{ seasonStartLabel }}</span
            >: chi è stato registrato prima risulta da rinnovare.
          </p>

          <div class="flex flex-wrap items-end gap-3">
            <UFormField label="Rinnovo annuale" name="renewalDay">
              <select v-model.number="renewal.day" class="vrsus-select">
                <option v-for="day in 31" :key="day" :value="day">
                  {{ day }}
                </option>
              </select>
            </UFormField>
            <UFormField label="Mese" name="renewalMonth">
              <select v-model.number="renewal.month" class="vrsus-select">
                <option
                  v-for="(label, index) in MONTHS"
                  :key="label"
                  :value="index + 1"
                >
                  {{ label }}
                </option>
              </select>
            </UFormField>
            <UButton
              color="primary"
              :loading="arciPending"
              label="Salva data"
              @click="saveRenewal"
            />
          </div>

          <div class="border-t border-white/10 pt-5">
            <p class="text-sm text-white/55">
              Se la scadenza arriva prima del previsto puoi chiudere la stagione
              adesso: tutte le tessere tornano da mostrare, senza perdere lo
              storico.
            </p>
            <div class="mt-3 flex flex-wrap items-center gap-3">
              <template v-if="askReset">
                <span class="text-sm text-white/70"
                  >Azzerare ora tutte le tessere?</span
                >
                <UButton
                  color="error"
                  :loading="arciPending"
                  label="Conferma azzeramento"
                  @click="resetCards"
                />
                <UButton
                  color="neutral"
                  variant="ghost"
                  label="Annulla"
                  @click="askReset = false"
                />
              </template>
              <UButton
                v-else
                color="neutral"
                variant="outline"
                icon="i-lucide-rotate-ccw"
                label="Azzera tessere adesso"
                @click="askReset = true"
              />
            </div>
          </div>

          <p v-if="arciMessage" class="text-sm text-green-400">
            {{ arciMessage }}
          </p>
          <p v-if="arciError" class="text-sm text-red-400">{{ arciError }}</p>
        </div>
      </UCard>
    </section>

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
  </div>
</template>
