/** Titolo breve della rotta, adatto alla toolbar anche su telefoni stretti. */
export function useShellPageTitle(area: 'app' | 'admin') {
  const route = useRoute()

  return computed(() => {
    const path = route.path
    if (area === 'app') {
      if (path === '/app') return 'Bacheca'
      if (path.startsWith('/app/prenotazioni/')) return 'Biglietto'
      if (path.startsWith('/app/eventi/')) return 'Evento'
      if (path.startsWith('/app/tornei/') && path.endsWith('/prenota'))
        return 'Iscrizione torneo'
      if (path.startsWith('/app/tornei/')) return 'Torneo'
      if (path.startsWith('/app/eventi')) return 'Eventi'
      if (path.startsWith('/app/tornei')) return 'Tornei'
      if (path.startsWith('/app/ranking')) return 'Ranking'
      if (path.startsWith('/app/impostazioni')) return 'Impostazioni'
      if (path.startsWith('/app/notifiche')) return 'Notifiche'
      if (path.startsWith('/app/live')) return 'Live'
      return 'VRSUS'
    }

    if (path === '/admin') return 'Live'
    if (path.includes('/tornei/nuovo')) return 'Nuovo torneo'
    if (path.startsWith('/admin/eventi/') && path.endsWith('/modifica'))
      return 'Modifica evento'
    if (path.startsWith('/admin/eventi/') && path.endsWith('/nuovo'))
      return 'Nuovo evento'
    if (path.startsWith('/admin/eventi/')) return 'Evento'
    if (path.startsWith('/admin/eventi')) return 'Eventi'
    if (path.startsWith('/admin/tornei/')) return 'Torneo'
    if (path.startsWith('/admin/tornei')) return 'Tornei'
    if (path.startsWith('/admin/piattaforme')) return 'Postazioni'
    if (path.startsWith('/admin/giochi')) return 'Giochi'
    if (path.startsWith('/admin/checkin')) return 'Check-in'
    if (path.startsWith('/admin/utenti')) return 'Utenti'
    if (path.startsWith('/admin/impostazioni')) return 'Impostazioni'
    if (path.startsWith('/admin/altro')) return 'Altro'
    if (path.startsWith('/admin/bacheca')) return 'Bacheca'
    if (path.startsWith('/admin/richieste')) return 'Richieste'
    if (path.startsWith('/admin/ranking')) return 'Ranking'
    if (path.startsWith('/admin/servizi')) return 'Servizi'
    return 'Console'
  })
}
