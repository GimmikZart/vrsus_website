<script setup lang="ts">
import { detectPlatform, detectStandalone } from '~/composables/usePwaInstall'

defineOptions({ inheritAttrs: false })

const scrollArea = ref<HTMLElement | null>(null)
const enabled = ref(false)
const dragging = ref(false)
const refreshing = ref(false)
const offset = ref(0)
const ready = computed(() => offset.value >= 64)

let mobileQuery: MediaQueryList | null = null
let reloadTimer: number | undefined
let tracking = false
let startX = 0
let startY = 0

function resetGesture() {
  tracking = false
  dragging.value = false
  if (!refreshing.value) offset.value = 0
}

function hasScrolledChild(target: EventTarget | null, container: HTMLElement) {
  let element = target instanceof Element ? target : null

  while (element && element !== container) {
    if (
      element.scrollTop > 1 &&
      element.scrollHeight > element.clientHeight + 1 &&
      /auto|scroll/.test(getComputedStyle(element).overflowY)
    ) {
      return true
    }
    element = element.parentElement
  }

  return false
}

function onTouchStart(event: TouchEvent) {
  const container = scrollArea.value
  if (event.touches.length !== 1) {
    resetGesture()
    return
  }
  if (
    !enabled.value ||
    refreshing.value ||
    !container ||
    container.scrollTop > 1 ||
    hasScrolledChild(event.target, container)
  ) {
    return
  }

  tracking = true
  startX = event.touches[0]!.clientX
  startY = event.touches[0]!.clientY
}

function onTouchMove(event: TouchEvent) {
  if (!tracking) return
  if (event.touches.length !== 1) {
    resetGesture()
    return
  }

  const touch = event.touches[0]!
  const deltaX = touch.clientX - startX
  const deltaY = touch.clientY - startY

  if (
    !dragging.value &&
    Math.abs(deltaX) > 8 &&
    Math.abs(deltaX) > Math.abs(deltaY)
  ) {
    resetGesture()
    return
  }
  if (deltaY < -8) {
    resetGesture()
    return
  }
  if (deltaY <= 5) return
  if (scrollArea.value && scrollArea.value.scrollTop > 1) {
    resetGesture()
    return
  }

  event.preventDefault()
  dragging.value = true
  offset.value = Math.min(84, deltaY * 0.55)
}

function onTouchEnd() {
  if (!tracking) return

  const shouldRefresh = ready.value
  resetGesture()
  if (!shouldRefresh) return

  refreshing.value = true
  offset.value = 56
  reloadTimer = window.setTimeout(() => window.location.reload(), 350)
}

function updateEnabled() {
  enabled.value = mobileQuery?.matches ?? false
  if (!enabled.value) resetGesture()
}

const route = useRoute()
watch(() => route.fullPath, resetGesture)

onMounted(() => {
  if (detectPlatform() !== 'ios' || !detectStandalone()) return

  mobileQuery = window.matchMedia('(max-width: 1023px)')
  mobileQuery.addEventListener('change', updateEnabled)
  updateEnabled()

  const container = scrollArea.value
  if (!container) return
  container.addEventListener('touchstart', onTouchStart, { passive: true })
  container.addEventListener('touchmove', onTouchMove, { passive: false })
  container.addEventListener('touchend', onTouchEnd)
  container.addEventListener('touchcancel', resetGesture)
})

onBeforeUnmount(() => {
  mobileQuery?.removeEventListener('change', updateEnabled)
  if (reloadTimer !== undefined) window.clearTimeout(reloadTimer)

  const container = scrollArea.value
  container?.removeEventListener('touchstart', onTouchStart)
  container?.removeEventListener('touchmove', onTouchMove)
  container?.removeEventListener('touchend', onTouchEnd)
  container?.removeEventListener('touchcancel', resetGesture)
})
</script>

<template>
  <main
    ref="scrollArea"
    v-bind="$attrs"
    :style="{
      transform: offset > 0 ? `translate3d(0, ${offset}px, 0)` : undefined,
      transition: dragging ? 'none' : 'transform 220ms ease-out',
      overscrollBehaviorY: enabled ? 'contain' : undefined,
    }"
  >
    <slot />
  </main>

  <div
    v-if="enabled && (offset > 0 || refreshing)"
    role="status"
    aria-live="polite"
    class="pt-safe pointer-events-none fixed inset-x-0 top-14 z-20 flex justify-center"
  >
    <div
      class="flex items-center gap-2 rounded-full border border-white/15 bg-[#171a24] px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-black/40"
    >
      <UIcon
        :name="refreshing ? 'i-lucide-loader-circle' : 'i-lucide-arrow-down'"
        class="size-4"
        :class="refreshing ? 'animate-spin' : ready ? 'rotate-180' : ''"
      />
      <span>{{
        refreshing
          ? 'Aggiornamento...'
          : ready
            ? 'Rilascia per aggiornare'
            : 'Trascina per aggiornare'
      }}</span>
    </div>
  </div>
</template>
