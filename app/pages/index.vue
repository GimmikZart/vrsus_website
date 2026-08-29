<script setup lang="ts">
const {
  data: nextEvent,
  status: nextEventStatus,
  error: nextEventError,
} = await usePublicNextEvent()

useSeoMeta({
  robots: publicEventsRobots(),
  title: 'VRSUS — Gioco e socialità',
  description:
    'VRSUS è il centro digitale per eventi, esperienze e tornei dedicati al gioco e alla socialità.',
})
</script>

<template>
  <div>
    <section class="relative isolate">
      <div
        class="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        aria-hidden="true"
      >
        <div
          class="bg-brand-red-500/12 absolute top-16 left-[12%] size-64 rounded-full blur-[100px]"
        />
        <div
          class="bg-brand-blue-500/12 absolute top-40 right-[8%] size-80 rounded-full blur-[120px]"
        />
      </div>
      <div
        class="mx-auto grid min-h-[620px] max-w-7xl items-center gap-16 px-5 py-20 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-28"
      >
        <div>
          <p
            class="text-brand-red-400 mb-7 flex items-center gap-3 text-xs font-semibold tracking-[0.28em] uppercase"
          >
            <span class="bg-brand-red-500 h-px w-8" />
            VRSUS community events
          </p>
          <h1
            class="font-display max-w-3xl text-5xl leading-[0.98] font-semibold tracking-[-0.04em] text-white sm:text-7xl"
          >
            Il gioco è il punto di partenza<span class="text-brand-red-500"
              >.</span
            >
          </h1>
          <p class="mt-8 max-w-xl text-lg leading-8 text-white/62">
            Un evento ricorrente dedicato al gioco e alla socialità, con
            esperienze da vivere insieme e un luogo digitale per orientarsi
            prima, durante e dopo.
          </p>
          <div class="mt-10 flex flex-col gap-3 sm:flex-row">
            <UButton
              to="/evento"
              color="primary"
              size="xl"
              trailing-icon="i-lucide-arrow-right"
              label="Scopri il prossimo evento"
            />
            <UButton
              to="#esperienze"
              color="neutral"
              variant="ghost"
              size="xl"
              label="Esplora le esperienze"
            />
          </div>
        </div>

        <div class="relative mx-auto w-full max-w-lg">
          <div
            class="border-brand-blue-500/15 bg-brand-blue-500/5 absolute -inset-5 rounded-[2.5rem] border blur-sm"
            aria-hidden="true"
          />
          <div
            class="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-white/10 bg-[#11141d] p-5 shadow-2xl shadow-black/50 sm:p-7"
          >
            <div
              class="flex items-center justify-between text-xs text-white/45"
            >
              <span
                class="font-display font-semibold tracking-[0.22em] text-white/75"
                >VRSUS / 01</span
              >
              <span class="flex items-center gap-2"
                ><span class="bg-brand-red-500 size-2 rounded-full" /> LIVE
                SPIRIT</span
              >
            </div>
            <div
              class="mt-12 flex h-[68%] items-center justify-center rounded-2xl border border-white/8 bg-[radial-gradient(circle_at_50%_45%,rgb(47_128_237/20%),transparent_24%),linear-gradient(145deg,#171a24,#0c0e14)]"
            >
              <div class="text-center">
                <div
                  class="font-display text-8xl font-bold tracking-[-0.12em] text-white/90"
                >
                  V<span class="text-brand-red-500">/</span>
                </div>
                <p
                  class="mt-3 text-xs tracking-[0.32em] text-white/45 uppercase"
                >
                  play together
                </p>
              </div>
            </div>
            <div class="mt-5 grid grid-cols-2 gap-3">
              <div class="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                <p class="text-xs text-white/40">FORMAT</p>
                <p class="mt-2 font-medium text-white/80">Esperienze</p>
              </div>
              <div class="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                <p class="text-xs text-white/40">ACCESSO</p>
                <p class="mt-2 font-medium text-white/80">Per tutti</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="prossimo-evento" class="mx-auto max-w-7xl px-5 py-16 sm:px-8">
      <PublicSectionHeading
        eyebrow="Prossimo appuntamento"
        title="Tutto quello che serve, in un unico posto."
        description="Il centro digitale VRSUS accompagnerà ogni appuntamento: scoperta, prenotazione e accesso alle esperienze."
      />
      <div class="mt-9">
        <div
          v-if="nextEventStatus === 'pending'"
          class="h-52 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]"
          aria-label="Caricamento prossimo evento"
        />
        <div
          v-else-if="nextEventError"
          class="border-brand-red-500/30 bg-brand-red-500/10 rounded-3xl border p-6 text-sm text-white/75"
          role="alert"
        >
          Non è stato possibile caricare il prossimo evento. Riprova tra poco.
        </div>
        <div
          v-else-if="!nextEvent"
          class="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-sm text-white/60"
        >
          Non ci sono ancora eventi pubblicati. Torna presto per scoprire il
          prossimo appuntamento.
        </div>
        <PublicEventCard v-else :event="nextEvent" />
      </div>
    </section>

    <section
      id="esperienze"
      class="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24"
    >
      <PublicSectionHeading
        eyebrow="Il mondo VRSUS"
        title="Esperienze diverse. La stessa voglia di esserci."
        description="Videogiochi, VR, tavoli, tornei e attività organizzate: il catalogo cresce intorno alle persone e all'evento."
      />
      <div class="mt-10 grid gap-4 sm:grid-cols-3">
        <div
          v-for="(item, index) in [
            'Gioco libero',
            'Esperienze organizzate',
            'Tornei',
          ]"
          :key="item"
          class="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-white/20 hover:bg-white/[0.05]"
        >
          <span class="font-display text-sm text-white/35"
            >0{{ index + 1 }}</span
          >
          <h3 class="font-display mt-14 text-xl font-semibold text-white">
            {{ item }}
          </h3>
          <p class="mt-3 text-sm leading-6 text-white/50">
            Una sezione dedicata per trovare il modo giusto di partecipare.
          </p>
        </div>
      </div>
    </section>

    <section id="servizi" class="border-y border-white/10 bg-white/[0.025]">
      <div
        class="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-16 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:py-20"
      >
        <div>
          <p
            class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
          >
            Oltre l'evento
          </p>
          <h2 class="font-display mt-4 text-3xl font-semibold text-white">
            Un'esperienza da portare anche altrove.
          </h2>
          <p class="mt-3 max-w-xl text-white/55">
            Compleanni, team building ed eventi privati: scopri i servizi VRSUS
            dedicati ai gruppi.
          </p>
        </div>
        <UButton
          to="/servizi"
          color="neutral"
          variant="outline"
          trailing-icon="i-lucide-arrow-up-right"
          label="Scopri i servizi"
        />
      </div>
    </section>
  </div>
</template>
