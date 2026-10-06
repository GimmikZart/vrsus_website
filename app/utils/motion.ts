import type { Directive } from 'vue'
import type { gsap as Gsap } from 'gsap'

type Preset = 'cards' | 'rows' | 'hero' | 'reveal'
type MotionOptions = { preset?: Preset; key?: unknown }
type Binding = Preset | MotionOptions | undefined

// One shared, client-only chunk. No ScrollTrigger, no route transition.
let engine: Promise<typeof Gsap> | undefined
const presets = {
  cards: { y: 14, duration: 0.68, stagger: 0.1, delayLimit: 0.48 },
  rows: { y: 8, duration: 0.56, stagger: 0.065, delayLimit: 0.36 },
  hero: { y: 18, duration: 0.9, stagger: 0.13, delayLimit: 0.5 },
  reveal: { y: 8, duration: 0.58, stagger: 0, delayLimit: 0 },
} as const

function options(value: Binding): Required<MotionOptions> {
  return typeof value === 'string'
    ? { preset: value, key: undefined }
    : { preset: value?.preset ?? 'cards', key: value?.key }
}

function createScope(root: HTMLElement, initial: Binding) {
  let settings = options(initial)
  let seen = new WeakSet<HTMLElement>()
  let disposed = false
  let generation = 0
  let frame = 0
  let gsap: typeof Gsap | undefined
  const contexts = new Set<ReturnType<typeof Gsap.context>>()
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  const waiting = new Set<HTMLElement>()

  function finish() {
    generation += 1
    waiting.clear()
    observer?.disconnect()
    for (const context of contexts) context.revert()
    contexts.clear()
  }

  function animate(items: HTMLElement[]) {
    if (!gsap || disposed || media.matches || !root.isConnected) return
    const targets = items.filter(
      (item) => item.isConnected && !item.contains(document.activeElement),
    )
    if (!targets.length) return
    const opacityByTarget = new Map(
      targets.map((target) => [
        target,
        Number(getComputedStyle(target).opacity),
      ]),
    )
    const preset = presets[settings.preset]
    // Bounded delay: the end of a long leaderboard never waits seconds.
    const step = Math.min(
      preset.stagger,
      preset.delayLimit / Math.max(1, targets.length - 1),
    )
    const context = gsap.context(() => {
      gsap!.set(targets, {
        transition: 'none',
        willChange: 'transform,opacity',
      })
      gsap!.fromTo(
        targets,
        { opacity: 0, y: preset.y },
        {
          opacity: (_index: number, target: HTMLElement) =>
            opacityByTarget.get(target) ?? 1,
          y: 0,
          duration: preset.duration,
          stagger: step,
          ease: 'power2.out',
          onComplete: () => {
            // Restore original inline styles, including hover transforms.
            context.revert()
            contexts.delete(context)
          },
        },
      )
    }, root)
    contexts.add(context)
  }

  const observer =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) => {
            const visible = entries
              .filter((entry) => entry.isIntersecting)
              .map((entry) => entry.target as HTMLElement)
            for (const item of visible) {
              waiting.delete(item)
              observer!.unobserve(item)
            }
            // Observer order is not guaranteed; preserve reading order.
            animate(
              visible.sort((a, b) =>
                a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
                  ? -1
                  : 1,
              ),
            )
          },
          { threshold: 0.08 },
        )
      : undefined

  async function scan() {
    if (disposed || media.matches) return
    const currentGeneration = generation
    try {
      gsap = await (engine ??= import('gsap').then((module) => module.gsap))
    } catch {
      // Content stays visible even if the optional animation chunk fails.
      return
    }
    if (disposed || media.matches || currentGeneration !== generation) return
    const children =
      settings.preset === 'reveal'
        ? [root]
        : Array.from(root.children).filter(
            (element): element is HTMLElement => element instanceof HTMLElement,
          )
    const targets = children.filter(
      (item) =>
        !seen.has(item) &&
        !item.hasAttribute('data-motion-skip') &&
        item.getClientRects().length > 0,
    )
    for (const item of targets) {
      seen.add(item)
      // Offscreen content is never hidden; reveal only when it enters view.
      if (observer) {
        waiting.add(item)
        observer.observe(item)
      }
    }
    if (!observer) animate(targets)
  }

  function schedule() {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      void scan()
    })
  }

  function onPreferenceChange() {
    finish()
    // Enabling motion does not replay all the content already read.
    if (!media.matches) schedule()
  }

  // Keyboard focus must never wait for a decorative entrance.
  function onFocus() {
    finish()
  }
  media.addEventListener('change', onPreferenceChange)
  root.addEventListener('focusin', onFocus)
  schedule()

  return {
    update(value: Binding) {
      const next = options(value)
      if (next.key !== settings.key || next.preset !== settings.preset) {
        finish()
        seen = new WeakSet()
      }
      settings = next
      // Remove observations of children replaced by a filter/tab update.
      for (const item of waiting) {
        if (!root.contains(item)) {
          observer?.unobserve(item)
          waiting.delete(item)
        }
      }
      schedule()
    },
    destroy() {
      disposed = true
      cancelAnimationFrame(frame)
      finish()
      media.removeEventListener('change', onPreferenceChange)
      root.removeEventListener('focusin', onFocus)
    },
  }
}

const scopes = new WeakMap<HTMLElement, ReturnType<typeof createScope>>()

export const motionDirective: Directive<HTMLElement, Binding> = {
  getSSRProps(binding) {
    return { 'data-motion': options(binding.value).preset }
  },
  mounted(element, binding) {
    element.dataset.motion = options(binding.value).preset
    scopes.set(element, createScope(element, binding.value))
  },
  updated(element, binding) {
    element.dataset.motion = options(binding.value).preset
    scopes.get(element)?.update(binding.value)
  },
  beforeUnmount(element) {
    scopes.get(element)?.destroy()
    scopes.delete(element)
  },
}
