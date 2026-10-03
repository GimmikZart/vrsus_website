<script setup lang="ts">
import type { VrsusRole } from '~/composables/useVrsusAuth'

type FeedbackKind = 'message' | 'suggestion' | 'review' | 'problem'
type InboxItem = {
  id: string
  kind: FeedbackKind
  rating: number | null
  body: string
  status: 'new' | 'reviewed' | 'archived'
  created_at: string
  profiles: {
    nickname: string | null
    first_name: string | null
    last_name: string | null
  } | null
}

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
  requiredRoles: ['admin'] satisfies VrsusRole[],
})

const tabs: { value: FeedbackKind; label: string; icon: string }[] = [
  { value: 'message', label: 'Messaggi', icon: 'i-lucide-message-square' },
  { value: 'suggestion', label: 'Consigli', icon: 'i-lucide-lightbulb' },
  { value: 'review', label: 'Recensioni', icon: 'i-lucide-star' },
  { value: 'problem', label: 'Problemi', icon: 'i-lucide-triangle-alert' },
]
const activeTab = ref<FeedbackKind>('message')
const { data, status, refresh } = await useFetch<InboxItem[]>(
  '/api/admin/inbox',
  {
    default: () => [],
  },
)
const filteredItems = computed(() =>
  data.value.filter((item) => item.kind === activeTab.value),
)
const unreadByKind = computed(() =>
  data.value.reduce<Record<FeedbackKind, number>>(
    (counts, item) => {
      if (item.status === 'new') counts[item.kind] += 1
      return counts
    },
    { message: 0, suggestion: 0, review: 0, problem: 0 },
  ),
)

function sender(item: InboxItem) {
  const profile = item.profiles
  if (!profile) return 'Utente'
  return (
    profile.nickname ||
    [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
    'Utente'
  )
}

async function markRead(id: string) {
  await $fetch(`/api/admin/board/feedback/${id}`, {
    method: 'PATCH',
    body: { status: 'reviewed' },
  })
  await refresh()
}

useSeoMeta({ title: 'Inbox — Admin VRSUS', robots: 'noindex, nofollow' })
</script>

<template>
  <div>
    <NuxtLink to="/admin/altro" class="text-sm text-white/45 hover:text-white"
      >← Altro</NuxtLink
    >
    <header class="mt-6">
      <p
        class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
      >
        Comunicazioni interne
      </p>
      <h1 class="font-display mt-3 text-3xl font-semibold text-white">Inbox</h1>
      <p class="mt-2 max-w-2xl text-white/50">
        I messaggi inviati dalle persone sono separati per tipo e non vengono
        mai pubblicati.
      </p>
    </header>

    <div
      class="sticky top-16 z-10 mt-8 overflow-x-auto border-b border-white/10 bg-[#08090d]/95 backdrop-blur-xl"
    >
      <div class="flex min-w-max gap-1 pb-2">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          type="button"
          class="relative flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm transition-colors"
          :class="
            activeTab === tab.value
              ? 'bg-white/10 text-white'
              : 'text-white/50 hover:text-white/80'
          "
          @click="activeTab = tab.value"
        >
          <UIcon :name="tab.icon" class="size-4" />
          <span>{{ tab.label }}</span>
          <span
            v-if="unreadByKind[tab.value]"
            class="grid min-w-5 place-items-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white"
            :aria-label="`${unreadByKind[tab.value]} non letti`"
            >{{ unreadByKind[tab.value] }}</span
          >
        </button>
      </div>
    </div>

    <div v-if="status === 'pending'" class="mt-6 space-y-3">
      <div
        v-for="index in 3"
        :key="index"
        class="h-32 animate-pulse rounded-2xl bg-white/[0.04]"
      />
    </div>
    <p
      v-else-if="!filteredItems.length"
      class="mt-8 rounded-2xl border border-dashed border-white/15 p-8 text-center text-white/45"
    >
      Nessun messaggio in questa sezione.
    </p>
    <div v-else class="mt-6 space-y-3">
      <article
        v-for="item in filteredItems"
        :key="item.id"
        class="rounded-2xl border p-5"
        :class="
          item.status === 'new'
            ? 'border-brand-red-500/35 bg-brand-red-500/[0.05]'
            : 'border-white/10 bg-white/[0.03]'
        "
      >
        <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div class="flex items-center gap-2">
            <span class="font-medium text-white/80">{{ sender(item) }}</span>
            <span
              v-if="item.status === 'new'"
              class="rounded-full bg-red-500/20 px-2 py-0.5 font-semibold text-red-300"
              >Non letto</span
            >
            <span v-if="item.rating" class="text-brand-red-300"
              >{{ item.rating }}/5</span
            >
          </div>
          <time class="text-white/35">{{
            new Intl.DateTimeFormat('it-IT', {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(new Date(item.created_at))
          }}</time>
        </div>
        <p class="mt-3 text-sm leading-6 whitespace-pre-line text-white/70">
          {{ item.body }}
        </p>
        <UButton
          v-if="item.status === 'new'"
          class="mt-4"
          color="neutral"
          variant="ghost"
          size="xs"
          icon="i-lucide-mail-open"
          label="Segna come letto"
          @click="markRead(item.id)"
        />
      </article>
    </div>
  </div>
</template>
