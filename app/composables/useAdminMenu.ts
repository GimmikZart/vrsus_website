// Le voci della console che non stanno nella barra principale.
//
// Su telefono vivono nella pagina "Altro", perche la barra in basso tiene solo
// cinque icone. Su schermo largo la colonna di sinistra ha spazio: le stesse
// voci si leggono direttamente li e la pagina Altro non serve piu (DEC-040).
// Sorgente unica, cosi i due posti non possono divergere.

export type AdminMenuItem = {
  to: string
  label: string
  description: string
  icon: string
}

export type AdminMenuGroup = {
  title: string
  items: AdminMenuItem[]
}

export function useAdminMenu() {
  const { isAdmin, hasAnyRole } = useVrsusAuth()

  // Le console assorbite dalla riorganizzazione V2 restano qui: nulla di
  // funzionante e stato buttato via (DEC-025).
  //
  // Le operazioni della serata invece non compaiono: live evento e check-in si
  // raggiungono dalla plancia Live, che e il posto dove si lavora durante
  // l'evento (DEC-036).
  const groups = computed<AdminMenuGroup[]>(() =>
    [
      {
        title: 'Contenuti',
        items: [
          {
            to: '/admin/bacheca',
            label: 'Bacheca',
            description: 'Annunci e sondaggi pubblicati nell’area utente.',
            icon: 'i-lucide-newspaper',
            visible: isAdmin.value,
          },
          {
            to: '/admin/servizi',
            label: 'Servizi',
            description: 'Pagine dei servizi mostrate in vetrina.',
            icon: 'i-lucide-briefcase',
            visible: isAdmin.value,
          },
          {
            to: '/admin/richieste',
            label: 'Richieste servizi',
            description: 'Lead arrivati dai form pubblici.',
            icon: 'i-lucide-inbox',
            visible: isAdmin.value,
          },
        ],
      },
      {
        title: 'Amministrazione',
        items: [
          {
            to: '/admin/ranking',
            label: 'Rettifiche ranking',
            description: 'Aggiustamenti auditabili dei punti VRSUS.',
            icon: 'i-lucide-trophy',
            visible: isAdmin.value,
          },
          {
            to: '/admin/utenti',
            label: 'Utenti e ruoli',
            description: 'Assegnazione dei ruoli agli account.',
            icon: 'i-lucide-users',
            visible: hasAnyRole(['super_admin']),
          },
          {
            to: '/admin/impostazioni',
            label: 'Impostazioni sito',
            description: 'Tessere ARCI e configurazioni della piattaforma.',
            icon: 'i-lucide-settings',
            visible: isAdmin.value,
          },
        ],
      },
    ]
      // Un gruppo senza voci visibili non deve lasciare il titolo da solo.
      .map((group) => ({
        title: group.title,
        items: group.items
          .filter((item) => item.visible)
          .map(({ to, label, description, icon }) => ({
            to,
            label,
            description,
            icon,
          })),
      }))
      .filter((group) => group.items.length > 0),
  )

  return { groups }
}
