<template>
  <div class="min-h-screen overflow-x-hidden">
    <header class="border-b border-white/10 bg-[#08090d]/85 backdrop-blur-xl">
      <div
        class="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8"
      >
        <NuxtLink
          to="/"
          aria-label="VRSUS home"
          class="group inline-flex items-center gap-3"
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
          class="hidden items-center gap-7 text-sm text-white/65 md:flex"
        >
          <NuxtLink to="/esperienze" class="transition-colors hover:text-white"
            >Esperienze</NuxtLink
          >
          <NuxtLink to="/eventi" class="transition-colors hover:text-white"
            >Eventi</NuxtLink
          >
          <NuxtLink to="/tornei" class="transition-colors hover:text-white"
            >Tornei</NuxtLink
          >
          <NuxtLink to="/ranking" class="transition-colors hover:text-white"
            >Ranking</NuxtLink
          >
          <NuxtLink to="/news" class="transition-colors hover:text-white"
            >News</NuxtLink
          >
          <NuxtLink to="/servizi" class="transition-colors hover:text-white"
            >Servizi</NuxtLink
          >
        </nav>

        <div class="flex items-center gap-2">
          <UButton
            to="/login"
            color="neutral"
            variant="ghost"
            size="sm"
            label="Accedi"
          />
          <UButton
            to="/eventi"
            color="primary"
            size="sm"
            label="Scopri l'evento"
          />
        </div>
      </div>
    </header>

    <main>
      <slot />
    </main>

    <footer class="border-t border-white/10">
      <div
        class="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-white/45 sm:flex-row sm:items-center sm:justify-between sm:px-8"
      >
        <span class="font-display font-semibold tracking-[0.16em] text-white/70"
          >VRSUS</span
        >
        <span>Eventi, gioco e socialità.</span>
      </div>
    </footer>
  </div>
</template>
