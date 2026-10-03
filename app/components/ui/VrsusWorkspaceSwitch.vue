<script setup lang="ts">
const route = useRoute()
const { isStaff } = useVrsusAuth()
const { availableRoles, operationalMode, selectRole } = useRoleMode()

const labels = { user: 'User', staff: 'Staff', admin: 'Admin' } as const
const icons = {
  user: 'i-lucide-user',
  staff: 'i-lucide-headset',
  admin: 'i-lucide-shield-check',
} as const
const activeRole = computed(() =>
  route.path.startsWith('/admin') ? operationalMode.value : 'user',
)

const base =
  'flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors'
const active = 'bg-white/12 text-white'
const idle = 'text-white/45 hover:text-white/80'
</script>

<template>
  <div
    v-if="isStaff"
    class="grid gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1"
    :style="{
      gridTemplateColumns: `repeat(${availableRoles.length}, minmax(0, 1fr))`,
    }"
    role="group"
    aria-label="Cambia area"
  >
    <button
      v-for="role in availableRoles"
      :key="role"
      type="button"
      :class="[base, activeRole === role ? active : idle]"
      :aria-current="activeRole === role ? 'true' : undefined"
      @click="selectRole(role)"
    >
      <UIcon :name="icons[role]" class="size-4 shrink-0" />
      <span>{{ labels[role] }}</span>
    </button>
  </div>
</template>
