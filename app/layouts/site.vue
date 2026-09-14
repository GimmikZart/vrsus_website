<script setup lang="ts">
// Shell della vetrina pubblica. Mobile-first: le voci vivono dentro un
// pannello a scomparsa aperto dall'hamburger in alto a destra e si distendono
// in orizzontale solo da lg in su (DEC-025).
const open = ref(false)
const route = useRoute()
const { isAuthenticated } = useVrsusAuth()

const links = [
  { to: '/', label: 'Home' },
  { to: '/postazioni', label: 'Postazioni' },
  { to: '/chi-siamo', label: 'Chi siamo' },
  { to: '/servizi', label: 'Servizi' },
]

// Il pannello non deve sopravvivere a un cambio pagina.
watch(
  () => route.fullPath,
  () => (open.value = false),
)

watch(open, (value) => {
  if (import.meta.client) {
    document.body.style.overflow = value ? 'hidden' : ''
  }
})

onUnmounted(() => {
  if (import.meta.client) document.body.style.overflow = ''
})
</script>

<template>
  <div class="flex min-h-screen flex-col overflow-x-hidden">
    <header
      class="sticky top-0 z-40 border-b border-white/10 bg-[#08090d]/85 backdrop-blur-xl"
    >
      <div
        class="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8"
      >
        <NuxtLink
          to="/"
          aria-label="VRSUS home"
          class="inline-flex items-center gap-3"
        >
          <span
            class="bg-brand-red-500 font-display grid size-9 place-items-center rounded-xl text-sm font-bold text-white shadow-[0_0_28px_rgb(239_51_64/25%)]"
            >V</span
          >
          <span
            class="font-display text-lg font-bold tracking-[0.18em] text-white"
            >VRSUS</span
          >
        </NuxtLink>

        <nav
          aria-label="Navigazione principale"
          class="hidden items-center gap-7 text-sm text-white/65 lg:flex"
        >
          <NuxtLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="transition-colors hover:text-white"
            >{{ link.label }}</NuxtLink
          >
        </nav>

        <div class="hidden items-center gap-2 lg:flex">
          <UButton
            v-if="!isAuthenticated"
            to="/login"
            color="neutral"
            variant="ghost"
            size="sm"
            label="Accedi"
          />
          <UButton
            v-if="!isAuthenticated"
            to="/registrati"
            color="primary"
            size="sm"
            label="Registrati"
          />
          <UButton
            v-else
            to="/app"
            color="primary"
            size="sm"
            label="Area personale"
          />
        </div>

        <button
          type="button"
          class="grid size-11 place-items-center rounded-xl border border-white/10 text-white lg:hidden"
          :aria-expanded="open"
          aria-controls="site-menu"
          aria-label="Apri il menu"
          @click="open = !open"
        >
          <UIcon :name="open ? 'i-lucide-x' : 'i-lucide-menu'" class="size-5" />
        </button>
      </div>
    </header>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        id="site-menu"
        class="fixed inset-x-0 top-16 bottom-0 z-30 overflow-y-auto bg-[#08090d]/98 backdrop-blur-xl lg:hidden"
      >
        <nav class="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-6">
          <NuxtLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="flex min-h-12 items-center rounded-xl px-4 text-base text-white/80 transition-colors hover:bg-white/5 hover:text-white"
            >{{ link.label }}</NuxtLink
          >

          <div class="mt-6 flex flex-col gap-3 border-t border-white/10 pt-6">
            <template v-if="!isAuthenticated">
              <UButton
                to="/login"
                color="neutral"
                variant="outline"
                block
                size="lg"
                label="Accedi"
              />
              <UButton
                to="/registrati"
                color="primary"
                block
                size="lg"
                label="Registrati"
              />
            </template>
            <UButton
              v-else
              to="/app"
              color="primary"
              block
              size="lg"
              label="Area personale"
            />
          </div>
        </nav>
      </div>
    </Transition>

    <main class="flex-1">
      <slot />
    </main>

    <footer class="border-t border-white/10">
      <div
        class="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-white/45 sm:flex-row sm:items-center sm:justify-between sm:px-8"
      >
        <span class="font-display font-semibold tracking-[0.16em] text-white/70"
          >VRSUS</span
        >
        <span>Gioco, eventi e socialità.</span>
      </div>
    </footer>
  </div>
</template>
