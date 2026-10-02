import {
  inject,
  onScopeDispose,
  provide,
  shallowRef,
  toValue,
  watchEffect,
  type InjectionKey,
  type MaybeRefOrGetter,
  type ShallowRef,
} from 'vue'

export type PageAction = {
  label: string
  icon?: string
  color?: 'primary' | 'secondary' | 'neutral' | 'error'
  to?: string | { path: string; query?: Record<string, string> }
  onClick?: () => void | Promise<void>
  loading?: boolean
  disabled?: boolean
}

type PageActionHost = {
  actions: ShallowRef<PageAction[]>
  set: (owner: symbol, actions: PageAction[]) => void
  clear: (owner: symbol) => void
}

const pageActionKey: InjectionKey<PageActionHost> = Symbol('page-actions')

export function providePageActions() {
  const actions = shallowRef<PageAction[]>([])
  let owner: symbol | null = null

  provide(pageActionKey, {
    actions,
    set(nextOwner, nextActions) {
      owner = nextOwner
      actions.value = nextActions
    },
    clear(previousOwner) {
      if (owner !== previousOwner) return
      owner = null
      actions.value = []
    },
  })

  return actions
}

/** Registra le azioni della pagina nel layout che la ospita. */
export function usePageActions(source: MaybeRefOrGetter<PageAction[]>) {
  const host = inject(pageActionKey, null)
  if (!host) return

  const owner = Symbol('page')
  watchEffect(() => host.set(owner, toValue(source)))
  onScopeDispose(() => host.clear(owner))
}
