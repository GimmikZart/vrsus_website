<script setup lang="ts">
defineProps<{ title: string; home: string }>()
const { unreadCount } = useNotificationRealtime()
</script>

<template>
  <header
    class="pt-safe fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-[#08090d]/95 backdrop-blur-xl lg:left-64"
  >
    <div
      class="mx-auto grid h-14 max-w-7xl grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)] items-center px-4 lg:px-8"
    >
      <NuxtLink
        :to="home"
        class="inline-flex min-w-0 items-center gap-1.5"
        aria-label="VRSUS, pagina iniziale"
      >
        <UiVrsusBrandMark compact />
      </NuxtLink>
      <p
        class="font-display truncate text-center text-sm font-semibold text-white sm:text-base"
      >
        {{ title }}
      </p>
      <NuxtLink
        to="/app/notifiche"
        class="relative grid size-10 place-items-center justify-self-end rounded-xl text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        :aria-label="
          unreadCount
            ? `Apri notifiche, ${unreadCount} non lette`
            : 'Apri notifiche'
        "
        :aria-current="title === 'Notifiche' ? 'page' : undefined"
      >
        <UIcon name="i-lucide-bell" class="size-5" />
        <Transition name="badge" mode="out-in">
          <span
            v-if="unreadCount"
            :key="unreadCount"
            class="bg-brand-red-500 absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold text-white"
            aria-hidden="true"
            >{{ unreadCount > 99 ? '99+' : unreadCount }}</span
          >
        </Transition>
      </NuxtLink>
    </div>
  </header>
</template>
