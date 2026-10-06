import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { motionDirective } from '../../app/utils/motion'

const animation = vi.hoisted(() => ({
  set: vi.fn(),
  fromTo: vi.fn(),
  revert: vi.fn(),
  context: vi.fn((callback: () => void) => {
    callback()
    return { revert: animation.revert }
  }),
}))
vi.mock('gsap', () => ({ gsap: animation }))

let wrapper: VueWrapper | undefined
let frames: FrameRequestCallback[] = []
let observers: FakeObserver[] = []
let preferenceListener: (() => void) | undefined
let media: {
  matches: boolean
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
}

class FakeObserver {
  targets = new Set<HTMLElement>()
  constructor(private callback: IntersectionObserverCallback) {
    observers.push(this)
  }
  observe(element: HTMLElement) {
    this.targets.add(element)
  }
  unobserve(element: HTMLElement) {
    this.targets.delete(element)
  }
  disconnect() {
    this.targets.clear()
  }
  reveal() {
    this.callback(
      Array.from(this.targets).map(
        (target) =>
          ({ target, isIntersecting: true }) as IntersectionObserverEntry,
      ),
      this as unknown as IntersectionObserver,
    )
  }
}

function render(motion: unknown = 'rows') {
  wrapper = mount(
    defineComponent({
      props: ['items', 'motion'],
      template:
        '<div v-vrsus-motion="motion"><a v-for="item in items" :key="item" href="#">{{ item }}</a></div>',
    }),
    {
      attachTo: document.body,
      props: { items: ['one', 'two', 'three'], motion },
      global: { directives: { 'vrsus-motion': motionDirective } },
    },
  )
  return wrapper
}

async function tick() {
  const pendingFrames = frames.splice(0)
  for (const callback of pendingFrames) callback(0)
  await flushPromises()
}

beforeEach(() => {
  vi.clearAllMocks()
  frames = []
  observers = []
  media = {
    matches: false,
    addEventListener: vi.fn((_name, callback) => {
      preferenceListener = callback
    }),
    removeEventListener: vi.fn(),
  }
  vi.stubGlobal('IntersectionObserver', FakeObserver)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.push(callback)
    return frames.length
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.spyOn(window, 'matchMedia').mockReturnValue(
    media as unknown as MediaQueryList,
  )
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
    {},
  ] as unknown as DOMRectList)
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('motion accessibility and lifecycle', () => {
  it('keeps offscreen content readable until it is revealed', async () => {
    const view = render()
    await tick()
    expect(animation.fromTo).not.toHaveBeenCalled()
    expect(view.findAll('a').every((item) => !item.attributes('style'))).toBe(
      true,
    )
    observers[0].reveal()
    expect(animation.fromTo).toHaveBeenCalledOnce()
  })

  it('reveals only new rows on a data refresh and bounds long-list delay', async () => {
    const view = render()
    await tick()
    observers[0].reveal()
    await view.setProps({ items: ['one', 'two', 'three', 'four'] })
    await tick()
    observers[0].reveal()
    expect(animation.fromTo.mock.calls[1][0]).toHaveLength(1)
    await view.setProps({
      items: Array.from({ length: 100 }, (_, index) => `row-${index}`),
    })
    await tick()
    observers[0].reveal()
    const [targets, , config] = animation.fromTo.mock.calls[2]
    expect(config.stagger * (targets.length - 1)).toBeLessThanOrEqual(0.36)
    expect(config.duration).toBe(0.56)
    expect(config.ease).toBe('power2.out')
  })

  it('replays a changed filter without replaying unchanged updates', async () => {
    const view = render({ preset: 'cards', key: 'all' })
    await tick()
    observers[0].reveal()
    await view.setProps({ motion: { preset: 'cards', key: 'all' } })
    await tick()
    observers[0].reveal()
    expect(animation.fromTo).toHaveBeenCalledOnce()
    await view.setProps({ motion: { preset: 'cards', key: 'ps5' } })
    await tick()
    observers[0].reveal()
    expect(animation.fromTo).toHaveBeenCalledTimes(2)
    expect(animation.revert).toHaveBeenCalled()
  })

  it('disables decorative movement and restores active animations on preference change', async () => {
    media.matches = true
    render()
    await tick()
    expect(animation.fromTo).not.toHaveBeenCalled()
    media.matches = false
    preferenceListener?.()
    await tick()
    observers[0].reveal()
    expect(animation.fromTo).toHaveBeenCalledOnce()
    media.matches = true
    preferenceListener?.()
    expect(animation.revert).toHaveBeenCalledOnce()
  })

  it('makes focused controls immediately available and cleans up on unmount', async () => {
    const view = render()
    await tick()
    observers[0].reveal()
    view.find('a').element.focus()
    expect(animation.revert).toHaveBeenCalled()
    view.unmount()
    wrapper = undefined
    expect(observers[0].targets.size).toBe(0)
    expect(media.removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    )
  })

  it('does not start an animation after the view is removed', async () => {
    const view = render()
    view.unmount()
    wrapper = undefined
    await tick()
    expect(animation.fromTo).not.toHaveBeenCalled()
  })
})
