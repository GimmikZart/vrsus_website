export function useMotion() {
  const prefersReducedMotion = useState('prefers-reduced-motion', () => false)

  if (import.meta.client) {
    onMounted(() => {
      prefersReducedMotion.value = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
    })
  }

  return { prefersReducedMotion }
}
