<script setup lang="ts">
function reloadPage() {
  window.location.reload()
}

useSeoMeta({ title: 'Offline — VRSUS', robots: 'noindex, nofollow' })
</script>

<template>
  <main
    class="mx-auto flex min-h-[calc(100vh-9rem)] max-w-xl flex-col items-center justify-center px-5 py-16 text-center"
  >
    <div
      class="bg-brand-red-500/15 grid size-16 place-items-center rounded-2xl"
    >
      <UIcon name="i-lucide-wifi-off" class="text-brand-red-300 size-8" />
    </div>
    <p
      class="text-brand-red-400 mt-8 text-xs font-semibold tracking-[0.24em] uppercase"
    >
      Connessione assente
    </p>
    <h1 class="font-display mt-4 text-4xl font-semibold text-white">
      Sei offline.
    </h1>
    <p class="mt-4 leading-7 text-white/55">
      Le pagine già visitate restano disponibili. Torna online per prenotare,
      mostrare il QR o aggiornare i dati.
    </p>
    <UButton class="mt-8" color="primary" label="Riprova" @click="reloadPage" />
  </main>
</template>
