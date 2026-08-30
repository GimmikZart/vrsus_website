<script setup lang="ts">
import type { Database } from '~/types/database.types'

definePageMeta({ middleware: ['auth'] })

const client = useSupabaseClient<Database>()
const user = useSupabaseUser()
const userId = user.value?.sub ?? ''

if (!userId) {
  throw createError({
    statusCode: 401,
    statusMessage: 'Autenticazione richiesta',
  })
}

const {
  data: profile,
  status,
  error,
  refresh,
} = await useAsyncData(`my-profile-${userId}`, async () => {
  const { data, error } = await client
    .from('profiles')
    .select('id,display_name,first_name,last_name,phone,is_public_profile')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data
})

const form = reactive({
  displayName: '',
  firstName: '',
  lastName: '',
  phone: '',
  isPublicProfile: false,
})
const pending = ref(false)
const message = ref('')
const errorMessage = ref('')

watch(
  profile,
  (value) => {
    if (!value) return
    form.displayName = value.display_name
    form.firstName = value.first_name ?? ''
    form.lastName = value.last_name ?? ''
    form.phone = value.phone ?? ''
    form.isPublicProfile = value.is_public_profile
  },
  { immediate: true },
)

async function saveProfile() {
  if (!form.displayName.trim()) {
    errorMessage.value = 'Inserisci un nome visualizzato.'
    return
  }

  pending.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    const { error } = await client
      .from('profiles')
      .update({
        display_name: form.displayName.trim(),
        first_name: form.firstName.trim() || null,
        last_name: form.lastName.trim() || null,
        phone: form.phone.trim() || null,
        is_public_profile: form.isPublicProfile,
      })
      .eq('id', userId)
    if (error) throw error
    message.value = 'Profilo aggiornato.'
    await refresh()
  } catch {
    errorMessage.value = 'Non è stato possibile aggiornare il profilo.'
  } finally {
    pending.value = false
  }
}

useSeoMeta({ title: 'Profilo — VRSUS', robots: 'noindex, nofollow' })
</script>

<template>
  <main
    class="mx-auto min-h-[calc(100vh-9rem)] max-w-3xl px-5 py-16 sm:px-8 lg:py-24"
  >
    <NuxtLink to="/app" class="text-sm text-white/50 hover:text-white"
      >← Area personale</NuxtLink
    >
    <header class="mt-8">
      <p
        class="text-brand-blue-400 text-xs font-semibold tracking-[0.24em] uppercase"
      >
        Account
      </p>
      <h1 class="font-display mt-3 text-4xl font-semibold text-white">
        Il tuo profilo<span class="text-brand-red-500">.</span>
      </h1>
      <p class="mt-4 text-white/55">
        Gestisci le informazioni che utilizzi nell’area VRSUS.
      </p>
    </header>

    <UAlert
      v-if="error"
      class="mt-8"
      color="error"
      variant="subtle"
      description="Non è stato possibile caricare il profilo."
    />
    <UCard v-else class="mt-10 border border-white/10 bg-white/[0.04]">
      <div v-if="status === 'pending'" class="space-y-4">
        <div class="h-10 animate-pulse rounded bg-white/10" />
        <div class="h-10 animate-pulse rounded bg-white/10" />
      </div>
      <div v-else class="space-y-5">
        <UFormField label="Email account"
          ><UInput :model-value="user?.email ?? ''" disabled
        /></UFormField>
        <UFormField label="Nome visualizzato" name="displayName"
          ><UInput v-model="form.displayName" autocomplete="nickname"
        /></UFormField>
        <div class="grid gap-5 sm:grid-cols-2">
          <UFormField label="Nome" name="firstName"
            ><UInput v-model="form.firstName" autocomplete="given-name"
          /></UFormField>
          <UFormField label="Cognome" name="lastName"
            ><UInput v-model="form.lastName" autocomplete="family-name"
          /></UFormField>
        </div>
        <UFormField label="Telefono" name="phone"
          ><UInput v-model="form.phone" type="tel" autocomplete="tel"
        /></UFormField>
        <label class="flex items-start gap-3 text-sm text-white/65"
          ><input
            v-model="form.isPublicProfile"
            type="checkbox"
            class="mt-1"
          /><span>Mostra il mio nome nelle classifiche pubbliche.</span></label
        >
        <UAlert
          v-if="message"
          color="success"
          variant="subtle"
          :description="message"
        />
        <UAlert
          v-if="errorMessage"
          color="error"
          variant="subtle"
          :description="errorMessage"
        />
        <div class="flex flex-wrap gap-3">
          <UButton
            :loading="pending"
            color="primary"
            label="Salva profilo"
            @click="saveProfile"
          /><UButton
            to="/app/notifiche"
            color="neutral"
            variant="outline"
            label="Preferenze notifiche"
          />
        </div>
      </div>
    </UCard>
  </main>
</template>
