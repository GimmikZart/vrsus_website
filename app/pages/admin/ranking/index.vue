<script setup lang="ts">
import type { VrsusRole } from '~/composables/useVrsusAuth'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
  requiredRoles: ['staff', 'admin'] satisfies VrsusRole[],
})

const route = useRoute()
const selectedUserId = computed(() => String(route.query.userId ?? ''))
const selectedUserName = computed(() =>
  String(route.query.userName ?? 'utente selezionato'),
)

useSeoMeta({ title: 'Ranking — VRSUS', robots: 'noindex, nofollow' })
</script>

<template>
  <RankingGallery
    base-path="/admin/ranking"
    :selected-user-id="selectedUserId"
    :selected-user-name="selectedUserName"
  />
</template>
