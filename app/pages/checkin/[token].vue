<script setup lang="ts">
const route = useRoute()
const token = computed(() => String(route.params.token || ''))

useSeoMeta({
  title: 'Codice ingresso â€” VRSUS',
  robots: 'noindex, nofollow',
})
</script>

<template>
  <main
    class="mx-auto flex min-h-[calc(100vh-9rem)] max-w-xl items-center px-5 py-16 text-center sm:px-8"
  >
    <UCard class="w-full border border-white/10 bg-white/[0.04]">
      <div
        class="bg-brand-red-500/15 text-brand-red-300 mx-auto grid size-16 place-items-center rounded-2xl"
      >
        <UIcon name="i-lucide-qr-code" class="size-8" />
      </div>
      <p
        class="text-brand-blue-300 mt-7 text-xs font-semibold tracking-[0.24em] uppercase"
      >
        Codice ingresso VRSUS
      </p>
      <h1 class="font-display mt-3 text-3xl font-semibold text-white">
        Mostra questo codice allo staff.
      </h1>
      <p class="mx-auto mt-4 max-w-md text-sm leading-6 text-white/55">
        Il codice è stato generato per la tua prenotazione. Il check-in viene
        completato soltanto da personale autorizzato.
      </p>
      <p
        class="mt-8 rounded-xl border border-white/10 bg-black/20 p-4 font-mono text-xs break-all text-white/40"
      >
        {{ token.slice(0, 12) }}…
      </p>
      <UButton
        class="mt-7"
        to="/app"
        variant="soft"
        color="secondary"
        label="Torna all’area personale"
      />
    </UCard>
  </main>
</template>
