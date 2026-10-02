<script setup lang="ts">
import type { Database } from '~/types/database.types'

definePageMeta({ layout: 'app', middleware: ['auth'] })

const client = useSupabaseClient<Database>()
const user = useSupabaseUser()
const { signOut } = useVrsusAuth()

const { data: profile, refresh: refreshProfile } = await useAsyncData(
  'my-profile',
  async () => {
    const { data } = await client
      .from('profiles')
      .select('nickname, first_name, last_name, birth_date')
      .eq('id', String(user.value?.sub))
      .maybeSingle()
    return data
  },
)

const { data: consent, refresh: refreshConsent } = await useAsyncData(
  'settings-consent',
  async () => {
    const { data } = await client.rpc('my_consent_status')
    return data?.[0] ?? null
  },
)

const nickname = ref(profile.value?.nickname ?? '')
const nicknameOpen = ref(false)
const nicknamePending = ref(false)
const nicknameMessage = ref('')
const nicknameError = ref('')

function editNickname() {
  nickname.value = profile.value?.nickname ?? ''
  nicknameError.value = ''
  nicknameOpen.value = true
}

async function saveNickname() {
  nicknamePending.value = true
  nicknameMessage.value = ''
  nicknameError.value = ''

  const { error } = await client.rpc('update_my_nickname', {
    p_nickname: nickname.value.trim(),
  })

  nicknamePending.value = false

  if (error) {
    // I codici arrivano dalla RPC: si traducono invece di mostrare l'errore SQL.
    const raw = String(error.message ?? '')
    nicknameError.value = raw.includes('NICKNAME_TAKEN')
      ? 'Questo nickname è già in uso.'
      : raw.includes('INVALID_NICKNAME_CHARS')
        ? 'Sono ammessi solo lettere, numeri, punto, trattino e underscore.'
        : raw.includes('INVALID_NICKNAME')
          ? 'Il nickname deve avere fra 3 e 24 caratteri.'
          : 'Non è stato possibile aggiornare il nickname.'
    return
  }

  nicknameMessage.value = 'Nickname aggiornato.'
  await refreshProfile()
  nicknameOpen.value = false
}

// Un minore senza consenso non puo prenotare: si permette di registrarlo qui.
const guardian = reactive({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  relationship: 'parent' as 'parent' | 'legal_guardian' | 'other',
  consent: false,
})
const guardianPending = ref(false)
const guardianMessage = ref('')

async function saveConsent() {
  if (!guardian.consent) {
    guardianMessage.value = 'Serve la spunta di consenso.'
    return
  }
  guardianPending.value = true
  guardianMessage.value = ''

  const { error } = await client.rpc('record_guardian_consent', {
    p_first_name: guardian.firstName.trim(),
    p_last_name: guardian.lastName.trim(),
    p_email: guardian.email.trim(),
    p_phone: guardian.phone.trim() || undefined,
    p_relationship: guardian.relationship,
  })

  guardianPending.value = false

  if (error) {
    guardianMessage.value = 'Dati non validi: controlla nome, cognome ed email.'
    return
  }

  guardianMessage.value = 'Consenso registrato.'
  await refreshConsent()
}

const signingOut = ref(false)

async function logout() {
  signingOut.value = true
  await signOut()
  await navigateTo('/')
}

useSeoMeta({ title: 'Impostazioni — VRSUS', robots: 'noindex, nofollow' })
</script>

<template>
  <div class="space-y-6">
    <header>
      <p
        class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
      >
        Account
      </p>
      <h1
        class="font-display mt-2 text-2xl font-semibold text-white sm:text-3xl"
      >
        Impostazioni
      </h1>
    </header>

    <section class="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 class="font-display text-base font-semibold text-white">Nickname</h2>
      <p class="mt-1 text-sm text-white/50">
        È il nome con cui compari in classifica e nelle liste partecipanti.
      </p>

      <div
        class="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3"
      >
        <span class="truncate font-medium text-white">{{
          profile?.nickname || 'Non impostato'
        }}</span>
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-pencil"
          aria-label="Modifica nickname"
          @click="editNickname"
        />
      </div>

      <p v-if="nicknameMessage" class="mt-3 text-sm text-green-400">
        {{ nicknameMessage }}
      </p>
    </section>

    <UiVrsusBottomSheet
      v-model="nicknameOpen"
      title="Modifica nickname"
      :pending="nicknamePending"
    >
      <div class="space-y-4">
        <UFormField
          label="Nickname"
          help="Da 3 a 24 caratteri: lettere, numeri, punto, trattino e underscore."
        >
          <UInput
            v-model="nickname"
            class="w-full"
            autofocus
            @keyup.enter="saveNickname"
          />
        </UFormField>
        <p v-if="nicknameError" class="text-sm text-red-300">
          {{ nicknameError }}
        </p>
        <div class="flex gap-2">
          <UButton
            color="neutral"
            variant="outline"
            class="flex-1 justify-center"
            label="Annulla"
            :disabled="nicknamePending"
            @click="nicknameOpen = false"
          />
          <UButton
            color="primary"
            class="flex-1 justify-center"
            label="Salva"
            :loading="nicknamePending"
            :disabled="!nickname.trim() || nicknamePending"
            @click="saveNickname"
          />
        </div>
      </div>
    </UiVrsusBottomSheet>

    <section
      v-if="consent?.is_minor"
      class="rounded-2xl border p-5"
      :class="
        consent?.has_consent
          ? 'border-green-500/40 bg-green-500/[0.05]'
          : 'border-amber-500/40 bg-amber-500/[0.05]'
      "
    >
      <h2 class="font-display text-base font-semibold text-white">
        Consenso di un genitore o tutore
      </h2>

      <p v-if="consent?.has_consent" class="mt-2 text-sm text-white/60">
        Il consenso risulta registrato. Puoi prenotare eventi e tornei.
      </p>

      <template v-else>
        <p class="mt-2 text-sm text-white/60">
          Hai meno di 18 anni: senza il consenso di un genitore o tutore non è
          possibile prenotare.
        </p>

        <div class="mt-4 space-y-3">
          <div class="grid gap-3 sm:grid-cols-2">
            <UInput v-model="guardian.firstName" placeholder="Nome" />
            <UInput v-model="guardian.lastName" placeholder="Cognome" />
          </div>
          <UInput v-model="guardian.email" type="email" placeholder="Email" />
          <UInput
            v-model="guardian.phone"
            type="tel"
            placeholder="Telefono (facoltativo)"
          />
          <select v-model="guardian.relationship" class="vrsus-select">
            <option value="parent">Genitore</option>
            <option value="legal_guardian">Tutore legale</option>
            <option value="other">Altro</option>
          </select>

          <label
            class="flex cursor-pointer items-start gap-3 text-sm text-white/70"
          >
            <input
              v-model="guardian.consent"
              type="checkbox"
              class="mt-1 size-4 rounded border-white/20 bg-white/5"
            />
            <span>
              Dichiaro di essere il genitore o tutore e acconsento al
              trattamento dei dati per la partecipazione agli eventi VRSUS.
            </span>
          </label>

          <UButton
            color="primary"
            block
            :loading="guardianPending"
            label="Registra il consenso"
            @click="saveConsent"
          />
        </div>
      </template>

      <p v-if="guardianMessage" class="mt-3 text-sm text-white/70">
        {{ guardianMessage }}
      </p>
    </section>

    <section class="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 class="font-display text-base font-semibold text-white">
        Collegamenti
      </h2>
      <div class="mt-4 space-y-2">
        <NuxtLink
          to="/app/notifiche"
          class="flex min-h-11 items-center justify-between rounded-xl px-3 text-sm text-white/75 hover:bg-white/5"
        >
          <span>Notifiche</span>
          <UIcon name="i-lucide-chevron-right" class="size-4 text-white/30" />
        </NuxtLink>
      </div>
    </section>

    <section class="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 class="font-display text-base font-semibold text-white">Sessione</h2>
      <p class="mt-1 text-sm text-white/50">{{ user?.email }}</p>
      <UiVrsusWorkspaceSwitch class="mt-4" />
      <UButton
        class="mt-3"
        color="neutral"
        variant="outline"
        block
        :loading="signingOut"
        label="Esci"
        @click="logout"
      />
    </section>
  </div>
</template>
