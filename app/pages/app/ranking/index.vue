<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: ['auth'] })

useSeoMeta({ title: 'Ranking — VRSUS', robots: 'noindex, nofollow' })
</script>

<template>
  <RankingGallery base-path="/app/ranking" />
</template>
