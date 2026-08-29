<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: string
    label?: string
  }>(),
  { label: 'Immagine' },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const client = useSupabaseClient()
const input = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const errorMessage = ref('')

const publicUrl = computed(() => {
  if (!props.modelValue) return ''
  return client.storage.from('vrsus-assets').getPublicUrl(props.modelValue).data
    .publicUrl
})

function extensionFor(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  return extension && /^[a-z0-9]+$/.test(extension) ? extension : 'bin'
}

async function uploadFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  errorMessage.value = ''
  if (!file.type.startsWith('image/')) {
    errorMessage.value = 'Seleziona un file immagine.'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    errorMessage.value = 'L’immagine deve essere più piccola di 5 MB.'
    return
  }

  uploading.value = true
  const path = `cms/${crypto.randomUUID()}.${extensionFor(file)}`
  const { error } = await client.storage
    .from('vrsus-assets')
    .upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    })
  uploading.value = false
  if (error) {
    errorMessage.value = 'Upload non riuscito. Controlla il file e riprova.'
    return
  }
  emit('update:modelValue', path)
  if (input.value) input.value.value = ''
}

function clearFile() {
  errorMessage.value = ''
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-center gap-3">
      <span class="text-sm text-white/60">{{ label }}</span>
      <UButton
        type="button"
        variant="outline"
        size="sm"
        :loading="uploading"
        label="Carica immagine"
        @click="input?.click()"
      />
      <UButton
        v-if="modelValue"
        type="button"
        variant="ghost"
        size="sm"
        label="Rimuovi"
        @click="clearFile"
      />
    </div>
    <input
      ref="input"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml"
      class="sr-only"
      @change="uploadFile"
    />
    <div
      v-if="modelValue"
      class="flex items-center gap-3 rounded-xl border border-white/10 p-2"
    >
      <img
        v-if="publicUrl"
        :src="publicUrl"
        alt="Anteprima asset"
        class="size-12 rounded-lg object-cover"
      />
      <span class="min-w-0 truncate text-xs text-white/50">{{
        modelValue
      }}</span>
    </div>
    <p v-if="errorMessage" class="text-xs text-red-300">{{ errorMessage }}</p>
  </div>
</template>
