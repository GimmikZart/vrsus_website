import type { motionDirective } from '~/utils/motion'

declare module 'vue' {
  interface GlobalDirectives {
    vVrsusMotion: typeof motionDirective
  }
}

export {}
