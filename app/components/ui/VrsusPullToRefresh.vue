<script setup lang="ts">
import { detectPlatform, detectStandalone } from '~/composables/usePwaInstall'

const enabled = ref(false)
const dragging = ref(false)
const refreshing = ref(false)
const offset = ref(0)
const ready = computed(() => offset.value >= 64)

let mobileQuery: MediaQueryList | null = null
let reloadTimer: number | undefined
let scrollArea: Element | null = null
let tracking = false
let startX = 0
let startY = 0

function resetGesture() {
  tracking = false
  dragging.value = false
  scrollArea = null
  if (!refreshing.value) offset.value = 0
}

function hasScrolledChild(target: Element, container: Element) {
  let element: Element | null = target

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

function findScrollArea(target: Element): Element | null {
  // Le aree cliente e admin scorrono nel loro main; la vetrina e il login
  // scorrono invece sul documento. Evitiamo navbar, toolbar e dialog.
  if (
    target.closest(
      'input, textarea, select, [contenteditable="true"], [role="dialog"]',
    ) ||
    document.body.style.overflow === 'hidden'
  ) {
    return null
  }

  const appArea = document.querySelector('.app-scroll-area')
  if (appArea) return appArea.contains(target) ? appArea : null

  return document.scrollingElement
}

function onTouchStart(event: TouchEvent) {
  if (!enabled.value || refreshing.value || event.touches.length !== 1) {
    resetGesture()
    return
  }

  const target = event.target instanceof Element ? event.target : null
  const area = target ? findScrollArea(target) : null
  if (
    !target ||
    !area ||
    area.scrollTop > 1 ||
    hasScrolledChild(target, area)
  ) {
    resetGesture()
    return
  }

  scrollArea = area
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
  if (deltaY < -8 || (scrollArea && scrollArea.scrollTop > 1)) {
    resetGesture()
    return
  }
  if (deltaY <= 5) return

  event.preventDefault()
  dragging.value = true
  offset.value = Math.min(84, deltaY * 0.55)
}

function onTouchEnd() {
  if (!tracking) return

  const shouldRefresh = ready.value && (scrollArea?.scrollTop ?? 1) <= 1
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

  document.addEventListener('touchstart', onTouchStart, { passive: true })
  document.addEventListener('touchmove', onTouchMove, { passive: false })
  document.addEventListener('touchend', onTouchEnd)
  document.addEventListener('touchcancel', resetGesture)
})

onBeforeUnmount(() => {
  mobileQuery?.removeEventListener('change', updateEnabled)
  if (reloadTimer !== undefined) window.clearTimeout(reloadTimer)

  document.removeEventListener('touchstart', onTouchStart)
  document.removeEventListener('touchmove', onTouchMove)
  document.removeEventListener('touchend', onTouchEnd)
  document.removeEventListener('touchcancel', resetGesture)
})
</script>

<template>
  <div
    v-if="enabled && (offset > 0 || refreshing)"
    role="status"
    aria-live="polite"
    class="pt-safe pointer-events-none fixed inset-x-0 top-14 z-50 flex justify-center"
    :style="{
      transform: `translateY(${Math.min(offset * 0.45, 24)}px)`,
      transition: dragging ? 'none' : 'transform 220ms ease-out',
    }"
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
