<script setup lang="ts">
import type { VrsusRole } from '~/composables/useVrsusAuth'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
  requiredRoles: ['staff', 'admin'] satisfies VrsusRole[],
})

// Le voci sono le stesse della colonna di sinistra: su schermo largo si
// leggono direttamente li, qui servono al telefono, dove la barra in basso non
// ha spazio per tutto (DEC-040).
const { groups } = useAdminMenu()

useSeoMeta({ title: 'Altro — Admin VRSUS', robots: 'noindex, nofollow' })
</script>

<template>
  <div>
    <header>
      <p
        class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
      >
        Console
      </p>
      <h1 class="font-display mt-3 text-3xl font-semibold text-white">Altro</h1>
      <p class="mt-2 max-w-2xl text-white/50">
        Le sezioni che si usano di rado, raccolte in un posto solo.
      </p>
    </header>

    <section v-for="group in groups" :key="group.title" class="mt-10">
      <h2 class="font-display text-lg font-semibold text-white">
        {{ group.title }}
      </h2>

      <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          class="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-white/25"
        >
          <UIcon :name="item.icon" class="text-brand-red-400 size-5" />
          <p class="font-display mt-3 font-semibold text-white">
            {{ item.label }}
          </p>
          <p class="mt-1 text-sm text-white/50">{{ item.description }}</p>
        </NuxtLink>
      </div>
    </section>

    <!--
      L uscita sta qui perche e l unico posto della console che il telefono
      raggiunge sempre: la plancia Live e le schede sono piene di comandi
      operativi e un logout in mezzo sarebbe un incidente in attesa.
    -->
    <section class="mt-10 max-w-md">
      <h2 class="font-display text-lg font-semibold text-white">Sessione</h2>
      <div
        class="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center sm:text-left"
      >
        <UiVrsusSessionCard />
      </div>
    </section>
  </div>
</template>
