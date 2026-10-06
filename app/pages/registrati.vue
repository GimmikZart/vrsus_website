<script setup lang="ts">
import type { Database } from '~/types/database.types'

definePageMeta({ layout: 'site' })

const client = useSupabaseClient<Database>()
const user = useSupabaseUser()
const appBaseUrl = useRuntimeConfig().public.appBaseUrl

// Quando il progetto Supabase chiede la conferma via email, `signUp` non apre
// nessuna sessione: l'account esiste ma non e utilizzabile finche non si apre
// il link. Prima la pagina andava comunque su `/app`, dove la guardia
// rimbalzava su `/login` senza spiegare niente, e sembrava che la
// registrazione non avesse funzionato.
const awaitingConfirmation = ref(false)
const consentPending = ref(false)

const form = reactive({
  firstName: '',
  lastName: '',
  nickname: '',
  birthDate: '',
  email: '',
  password: '',
})

const guardian = reactive({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  relationship: 'parent' as 'parent' | 'legal_guardian' | 'other',
  consent: false,
})

const pending = ref(false)
const errorMessage = ref('')
const nicknameState = ref<'idle' | 'checking' | 'free' | 'taken'>('idle')

useSeoMeta({
  title: 'Registrati — VRSUS',
  description: 'Crea il tuo account VRSUS per prenotare eventi e tornei.',
  robots: 'noindex, nofollow',
})

if (user.value) {
  await navigateTo('/app')
}

// L'eta si deriva dalla data di nascita: un numero memorizzato diventerebbe
// falso al primo compleanno (DEC-024).
const age = computed(() => {
  if (!form.birthDate) return null
  const birth = new Date(form.birthDate)
  if (Number.isNaN(birth.getTime())) return null
  const today = new Date()
  let years = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    years -= 1
  }
  return years
})

const isMinor = computed(() => age.value !== null && age.value < 18)
const ageIsValid = computed(
  () => age.value === null || (age.value >= 0 && age.value < 120),
)

const relationshipOptions = [
  { value: 'parent', label: 'Genitore' },
  { value: 'legal_guardian', label: 'Tutore legale' },
  { value: 'other', label: 'Altro' },
]

let nicknameTimer: ReturnType<typeof setTimeout> | undefined

// La verifica anticipata e una cortesia: la garanzia resta l'indice unico.
watch(
  () => form.nickname,
  (value) => {
    clearTimeout(nicknameTimer)
    const clean = value.trim()
    if (clean.length < 3) {
      nicknameState.value = 'idle'
      return
    }
    nicknameState.value = 'checking'
    nicknameTimer = setTimeout(async () => {
      const { data, error } = await client.rpc('nickname_available', {
        p_nickname: clean,
      })
      if (error) {
        nicknameState.value = 'idle'
        return
      }
      nicknameState.value = data ? 'free' : 'taken'
    }, 400)
  },
)

onUnmounted(() => clearTimeout(nicknameTimer))

function validate() {
  if (!form.firstName.trim() || !form.lastName.trim()) {
    return 'Nome e cognome sono obbligatori.'
  }
  if (form.nickname.trim().length < 3 || form.nickname.trim().length > 24) {
    return 'Il nickname deve avere fra 3 e 24 caratteri.'
  }
  if (!/^[A-Za-z0-9_.-]+$/.test(form.nickname.trim())) {
    return 'Il nickname può contenere solo lettere, numeri, punto, trattino e underscore.'
  }
  if (nicknameState.value === 'taken') {
    return 'Questo nickname è già in uso.'
  }
  if (!form.birthDate || !ageIsValid.value) {
    return 'Inserisci una data di nascita valida.'
  }
  if (form.password.length < 8) {
    return 'La password deve avere almeno 8 caratteri.'
  }
  if (isMinor.value) {
    if (!guardian.firstName.trim() || !guardian.lastName.trim()) {
      return 'Servono nome e cognome di un genitore o tutore.'
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardian.email.trim())) {
      return 'Inserisci un’email valida del genitore o tutore.'
    }
    if (!guardian.consent) {
      return 'Serve il consenso esplicito del genitore o tutore.'
    }
  }
  return ''
}

async function submit() {
  errorMessage.value = validate()
  if (errorMessage.value) return

  pending.value = true

  const { data, error } = await client.auth.signUp({
    email: form.email.trim(),
    password: form.password,
    options: {
      // Dove torna chi apre il link della mail. Senza, l'indirizzo lo decide
      // la voce `Site URL` del progetto Supabase, che di suo punta ancora
      // all'ambiente di sviluppo.
      emailRedirectTo: `${appBaseUrl}/confirm`,
      data: {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        nickname: form.nickname.trim(),
        birth_date: form.birthDate,
      },
    },
  })

  if (error) {
    errorMessage.value = error.message.toLowerCase().includes('already')
      ? 'Esiste già un account con questa email.'
      : 'Registrazione non riuscita. Controlla i dati e riprova.'
    pending.value = false
    return
  }

  // Il consenso si registra subito dopo la creazione dell'account: senza, un
  // minore non riesce a prenotare (la guardia vive nel database). Serve una
  // sessione, quindi con la conferma via email attiva il gesto si sposta dopo
  // il primo accesso e lo diciamo nella schermata di attesa.
  if (!data.session) {
    awaitingConfirmation.value = true
    consentPending.value = isMinor.value
    pending.value = false
    return
  }

  if (isMinor.value) {
    const { error: consentError } = await client.rpc(
      'record_guardian_consent',
      {
        p_first_name: guardian.firstName.trim(),
        p_last_name: guardian.lastName.trim(),
        p_email: guardian.email.trim(),
        p_phone: guardian.phone.trim() || undefined,
        p_relationship: guardian.relationship,
      },
    )

    if (consentError) {
      errorMessage.value =
        'Account creato, ma il consenso non è stato registrato. Aprilo dalle impostazioni prima di prenotare.'
      pending.value = false
      return
    }
  }

  await navigateTo('/app')
}
</script>

<template>
  <main class="mx-auto max-w-lg px-5 py-12 sm:px-8 lg:py-16">
    <UCard
      class="border border-white/10 bg-white/[0.04]"
      :ui="{ body: 'p-6 sm:p-8' }"
    >
      <!--
        Account creato ma non ancora confermato: qui non c'e niente da fare
        nell'app, solo da aprire la posta. Il modulo sparisce per non far
        credere che vada ricompilato.
      -->
      <div v-if="awaitingConfirmation">
        <div
          class="bg-brand-red-500/15 grid size-14 place-items-center rounded-2xl"
        >
          <UIcon name="i-lucide-mail-check" class="text-brand-red-300 size-7" />
        </div>
        <h1 class="font-display mt-6 text-2xl font-semibold text-white">
          Controlla la posta
        </h1>
        <p class="mt-3 text-sm leading-6 text-white/55">
          Abbiamo inviato un messaggio a
          <span class="text-white">{{ form.email.trim() }}</span
          >. Apri il link che trovi dentro per confermare l'account: solo allora
          potrai accedere.
        </p>
        <p class="mt-3 text-sm leading-6 text-white/45">
          Se non arriva entro qualche minuto, guarda nella posta indesiderata.
        </p>
        <p
          v-if="consentPending"
          class="border-brand-red-500/30 bg-brand-red-500/10 mt-4 rounded-xl border px-4 py-3 text-sm leading-6 text-white/70"
        >
          Dopo il primo accesso apri
          <span class="text-white">Impostazioni</span>
          e completa il consenso del genitore: senza, non si possono fare
          prenotazioni.
        </p>
        <UButton
          class="mt-6"
          to="/login"
          size="lg"
          block
          label="Vai all'accesso"
        />
      </div>

      <template v-else>
        <div class="mb-8">
          <p
            class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
          >
            Nuovo account
          </p>
          <h1 class="font-display mt-3 text-3xl font-semibold text-white">
            Registrati a VRSUS
          </h1>
          <p class="mt-3 text-sm leading-6 text-white/55">
            Serve per prenotare eventi, iscriverti ai tornei e seguire il tuo
            ranking.
          </p>
        </div>

        <form class="space-y-5" @submit.prevent="submit">
          <div class="grid gap-5 sm:grid-cols-2">
            <UFormField label="Nome" name="firstName">
              <UInput
                v-model="form.firstName"
                autocomplete="given-name"
                required
                class="w-full"
              />
            </UFormField>
            <UFormField label="Cognome" name="lastName">
              <UInput
                v-model="form.lastName"
                autocomplete="family-name"
                required
                class="w-full"
              />
            </UFormField>
          </div>

          <UFormField label="Nickname" name="nickname">
            <UInput
              v-model="form.nickname"
              autocomplete="nickname"
              required
              class="w-full"
            />
            <template #help>
              <span v-if="nicknameState === 'checking'" class="text-white/45"
                >Verifica in corso…</span
              >
              <span v-else-if="nicknameState === 'free'" class="text-green-400"
                >Nickname disponibile.</span
              >
              <span v-else-if="nicknameState === 'taken'" class="text-red-400"
                >Nickname già in uso.</span
              >
              <span v-else class="text-white/45"
                >È il nome con cui comparirai in classifica.</span
              >
            </template>
          </UFormField>

          <UFormField label="Data di nascita" name="birthDate">
            <UInput
              v-model="form.birthDate"
              type="date"
              required
              class="w-full"
            />
            <template #help>
              <span v-if="age !== null && ageIsValid" class="text-white/45"
                >{{ age }} anni</span
              >
            </template>
          </UFormField>

          <UFormField label="Email" name="email">
            <UInput
              v-model="form.email"
              type="email"
              autocomplete="email"
              required
              class="w-full"
            />
          </UFormField>

          <UFormField label="Password" name="password">
            <UInput
              v-model="form.password"
              type="password"
              autocomplete="new-password"
              required
              class="w-full"
            />
            <template #help>
              <span class="text-white/45">Almeno 8 caratteri.</span>
            </template>
          </UFormField>

          <!--
          La sezione compare e scompare al variare della data di nascita senza
          ricaricare la pagina e senza perdere quanto gia digitato (DEC-026).
        -->
          <Transition name="content">
            <section
              v-if="isMinor"
              class="rounded-2xl border border-white/15 bg-white/[0.03] p-5"
            >
              <h2 class="font-display text-base font-semibold text-white">
                Consenso di un genitore o tutore
              </h2>
              <p class="mt-2 text-sm leading-6 text-white/55">
                Hai meno di 18 anni: per completare la registrazione serve il
                consenso di chi esercita la responsabilità genitoriale.
              </p>

              <div class="mt-5 space-y-4">
                <div class="grid gap-4 sm:grid-cols-2">
                  <UFormField label="Nome" name="guardianFirstName">
                    <UInput v-model="guardian.firstName" class="w-full" />
                  </UFormField>
                  <UFormField label="Cognome" name="guardianLastName">
                    <UInput v-model="guardian.lastName" class="w-full" />
                  </UFormField>
                </div>

                <UFormField label="Email" name="guardianEmail">
                  <UInput
                    v-model="guardian.email"
                    type="email"
                    class="w-full"
                  />
                </UFormField>

                <UFormField label="Telefono (facoltativo)" name="guardianPhone">
                  <UInput v-model="guardian.phone" type="tel" class="w-full" />
                </UFormField>

                <UFormField label="Relazione" name="guardianRelationship">
                  <select v-model="guardian.relationship" class="vrsus-select">
                    <option
                      v-for="option in relationshipOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </option>
                  </select>
                </UFormField>

                <!-- Una spunta pre-selezionata non sarebbe un consenso. -->
                <label
                  class="flex cursor-pointer items-start gap-3 text-sm text-white/70"
                >
                  <input
                    v-model="guardian.consent"
                    type="checkbox"
                    class="mt-1 size-4 rounded border-white/20 bg-white/5"
                  />
                  <span>
                    Dichiaro di essere il genitore o tutore di chi si sta
                    registrando e acconsento al trattamento dei suoi dati per la
                    partecipazione agli eventi VRSUS. Posso revocare il consenso
                    in qualsiasi momento.
                  </span>
                </label>
              </div>
            </section>
          </Transition>

          <UAlert
            v-if="errorMessage"
            color="error"
            variant="subtle"
            title="Registrazione non riuscita"
            :description="errorMessage"
          />

          <UButton
            type="submit"
            block
            size="lg"
            :loading="pending"
            label="Crea account"
          />
        </form>

        <div
          class="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm"
        >
          <NuxtLink
            to="/"
            class="text-white/55 transition-colors hover:text-white"
          >
            ← Torna al sito
          </NuxtLink>
          <NuxtLink
            to="/login"
            class="text-brand-red-400 hover:text-brand-red-300"
          >
            Hai già un account? Accedi
          </NuxtLink>
        </div>
      </template>
    </UCard>
  </main>
</template>
