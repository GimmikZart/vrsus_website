<script setup lang="ts">
// Passaggio fra l'app del cliente e l'area operativa.
//
// Chi ha un ruolo speciale resta comunque un cliente del circolo: prenota,
// gioca, ha i suoi punti. Lo staff non e un'identita diversa, e un permesso in
// piu (DEC-045), quindi il passaggio e un interruttore a due posizioni e non
// un collegamento a senso unico.
//
// Sta sempre accanto all'uscita: nella colonna di sinistra su schermo largo,
// nella pagina Altro della console e nelle impostazioni dell'app su telefono.
const route = useRoute()
const { isAdmin, isStaff } = useVrsusAuth()

// Un account con il solo ruolo `staff` non entra in `/admin`, che chiede
// admin o super-admin: la sua porta e il check-in.
const operationsTarget = computed(() =>
  isAdmin.value ? '/admin' : '/admin/checkin',
)
const operationsLabel = computed(() => (isAdmin.value ? 'Console' : 'Staff'))
const onOperations = computed(() => route.path.startsWith('/admin'))

const base =
  'flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors'
const active = 'bg-white/12 text-white'
const idle = 'text-white/45 hover:text-white/80'
</script>

<template>
  <div
    v-if="isStaff"
    class="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1"
    role="group"
    aria-label="Cambia area"
  >
    <NuxtLink
      to="/app"
      :class="[base, onOperations ? idle : active]"
      :aria-current="onOperations ? undefined : 'true'"
    >
      <UIcon name="i-lucide-user" class="size-4 shrink-0" />
      <span>Cliente</span>
    </NuxtLink>
    <NuxtLink
      :to="operationsTarget"
      :class="[base, onOperations ? active : idle]"
      :aria-current="onOperations ? 'true' : undefined"
    >
      <UIcon name="i-lucide-sliders-horizontal" class="size-4 shrink-0" />
      <span>{{ operationsLabel }}</span>
    </NuxtLink>
  </div>
</template>
