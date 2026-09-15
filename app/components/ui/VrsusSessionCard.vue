<script setup lang="ts">
// Chi e collegato, come si cambia area e come si esce. Vive nel piede della
// colonna di sinistra e nella pagina Altro della console: prima un
// amministratore non aveva nessun modo di uscire senza cancellare i cookie del
// browser, ne di tornare alla propria area cliente (DEC-045).
defineProps<{ compact?: boolean }>()

const { user, signOut } = useVrsusAuth()
const pending = ref(false)

async function logout() {
  pending.value = true
  try {
    await signOut()
    await navigateTo('/')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div>
    <UiVrsusWorkspaceSwitch :class="compact ? 'mx-2 mb-3' : 'mb-4'" />
    <p
      v-if="user?.email"
      class="truncate text-white/35"
      :class="compact ? 'px-4 text-xs' : 'text-sm'"
    >
      {{ user.email }}
    </p>
    <UButton
      class="mt-2"
      :color="compact ? 'neutral' : 'error'"
      :variant="compact ? 'ghost' : 'outline'"
      :size="compact ? 'md' : 'lg'"
      :block="!compact"
      icon="i-lucide-log-out"
      :loading="pending"
      label="Esci"
      @click="logout"
    />
  </div>
</template>
