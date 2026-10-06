import { motionDirective } from '~/utils/motion'

export default defineNuxtPlugin((nuxtApp) => {
  // Also register for SSR: server markup remains fully visible and readable.
  nuxtApp.vueApp.directive('vrsus-motion', motionDirective)
})
