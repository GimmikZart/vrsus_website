<script setup lang="ts">
const client = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()
const email = ref('')
const password = ref('')
const pending = ref(false)
const errorMessage = ref('')

useSeoMeta({
  title: 'Accedi — VRSUS',
  description: 'Accedi all’area personale VRSUS.',
  robots: 'noindex, nofollow',
})

if (user.value) {
  await navigateTo('/app')
}

function safeRedirect() {
  const redirect = route.query.redirect

  if (
    typeof redirect === 'string' &&
    redirect.startsWith('/') &&
    !redirect.startsWith('//')
  ) {
    return redirect
  }

  return '/app'
}

async function submit() {
  pending.value = true
  errorMessage.value = ''

  const { error } = await client.auth.signInWithPassword({
    email: email.value.trim(),
    password: password.value,
  })

  if (error) {
    errorMessage.value = 'Email o password non validi.'
    pending.value = false
    return
  }

  await navigateTo(safeRedirect())
}
</script>

<template>
  <main
    class="mx-auto flex min-h-[calc(100vh-9rem)] max-w-md items-center px-5 py-16 sm:px-8"
  >
    <UCard
      class="w-full border border-white/10 bg-white/[0.04]"
      :ui="{ body: 'p-6 sm:p-8' }"
    >
      <div class="mb-8">
        <p
          class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
        >
          Area personale
        </p>
        <h1 class="font-display mt-3 text-3xl font-semibold text-white">
          Accedi a VRSUS
        </h1>
        <p class="mt-3 text-sm leading-6 text-white/55">
          Gestisci il tuo accesso agli eventi e alle esperienze VRSUS.
        </p>
      </div>

      <form class="space-y-5" @submit.prevent="submit">
        <UFormField label="Email" name="email">
          <UInput
            v-model="email"
            type="email"
            autocomplete="email"
            required
            class="w-full"
          />
        </UFormField>

        <UFormField label="Password" name="password">
          <UInput
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            class="w-full"
          />
        </UFormField>

        <UAlert
          v-if="errorMessage"
          color="error"
          variant="subtle"
          title="Accesso non riuscito"
          :description="errorMessage"
        />

        <UButton
          type="submit"
          block
          size="lg"
          :loading="pending"
          label="Accedi"
        />
      </form>

      <NuxtLink
        to="/"
        class="mt-6 inline-flex text-sm text-white/55 transition-colors hover:text-white"
      >
        ← Torna al sito
      </NuxtLink>
    </UCard>
  </main>
</template>
