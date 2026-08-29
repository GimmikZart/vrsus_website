<script setup lang="ts">
useSeoMeta({
  title: 'Regolamento — VRSUS',
  description:
    'Il regolamento VRSUS sarà pubblicato prima del prossimo evento.',
  robots: publicEventsRobots(),
})
</script>

<template>
  <div
    class="mx-auto flex min-h-[620px] max-w-3xl flex-col justify-center px-5 py-20 text-center sm:px-8"
  >
    <p
      class="text-brand-blue-300 text-xs font-semibold tracking-[0.24em] uppercase"
    >
      Regolamento
    </p>
    <h1
      class="font-display mt-5 text-5xl font-semibold tracking-tight text-white sm:text-7xl"
    >
      Regole chiare per giocare insieme<span class="text-brand-red-500">.</span>
    </h1>
    <p class="mx-auto mt-7 max-w-xl text-lg leading-8 text-white/60">
      Il regolamento ufficiale sarà pubblicato qui prima dell’apertura del
      prossimo evento. Torna presto per consultare la versione aggiornata.
    </p>
    <div class="mt-9">
      <UButton to="/eventi" color="primary" label="Scopri gli eventi" />
    </div>
  </div>
</template>
