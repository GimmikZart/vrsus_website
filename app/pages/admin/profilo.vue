<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { VrsusRole } from '~/composables/useVrsusAuth'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
  requiredRoles: ['staff', 'admin'] satisfies VrsusRole[],
})

const client = useSupabaseClient<Database>()
const user = useSupabaseUser()
const { signOut } = useVrsusAuth()
const { data: profile, refresh } = await useAsyncData(
  'staff-profile-settings',
  async () => {
    const { data } = await client
      .from('profiles')
      .select('nickname')
      .eq('id', String(user.value?.sub))
      .maybeSingle()
    return data
  },
)

const nickname = ref(profile.value?.nickname ?? '')
const editing = ref(false)
const pending = ref(false)
const message = ref('')
const errorMessage = ref('')
const signingOut = ref(false)

function openEditor() {
  nickname.value = profile.value?.nickname ?? ''
  message.value = ''
  errorMessage.value = ''
  editing.value = true
}

async function saveNickname() {
  pending.value = true
  message.value = ''
  errorMessage.value = ''
  const { error } = await client.rpc('update_my_nickname', {
    p_nickname: nickname.value.trim(),
  })
  pending.value = false
  if (error) {
    const raw = String(error.message ?? '')
    errorMessage.value = raw.includes('NICKNAME_TAKEN')
      ? 'Questo nickname è già in uso.'
      : 'Non è stato possibile aggiornare il nickname.'
    return
  }
  await refresh()
  editing.value = false
  message.value = 'Nickname aggiornato.'
}

async function logout() {
  signingOut.value = true
  await signOut()
  await navigateTo('/')
}

useSeoMeta({ title: 'Impostazioni Staff — VRSUS', robots: 'noindex, nofollow' })
</script>

<template>
  <div class="space-y-6">
    <header>
      <p
        class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
      >
        Staff
      </p>
      <h1
        class="font-display mt-2 text-2xl font-semibold text-white sm:text-3xl"
      >
        Impostazioni
      </h1>
    </header>

    <section class="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 class="font-display text-base font-semibold text-white">Nickname</h2>
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
          @click="openEditor"
        />
      </div>
      <p v-if="message" class="mt-3 text-sm text-green-400">{{ message }}</p>
    </section>

    <UiVrsusBottomSheet
      v-model="editing"
      title="Modifica nickname"
      :pending="pending"
    >
      <div class="space-y-4">
        <UFormField label="Nickname">
          <UInput
            v-model="nickname"
            class="w-full"
            autofocus
            @keyup.enter="saveNickname"
          />
        </UFormField>
        <p v-if="errorMessage" class="text-sm text-red-300">
          {{ errorMessage }}
        </p>
        <div class="flex gap-2">
          <UButton
            color="neutral"
            variant="outline"
            class="flex-1 justify-center"
            label="Annulla"
            :disabled="pending"
            @click="editing = false"
          />
          <UButton
            color="primary"
            class="flex-1 justify-center"
            label="Salva"
            :loading="pending"
            :disabled="!nickname.trim() || pending"
            @click="saveNickname"
          />
        </div>
      </div>
    </UiVrsusBottomSheet>

    <section class="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 class="font-display text-base font-semibold text-white">
        Ruolo attivo
      </h2>
      <UiVrsusWorkspaceSwitch class="mt-4" />
    </section>

    <section class="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 class="font-display text-base font-semibold text-white">Sessione</h2>
      <p class="mt-1 text-sm text-white/50">{{ user?.email }}</p>
      <UButton
        class="mt-4"
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
