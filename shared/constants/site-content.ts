/**
 * CONTENUTI SEGNAPOSTO — DA SOSTITUIRE CON I TESTI APPROVATI.
 *
 * Tutta la copy editoriale della vetrina vive qui, cosi la sostituzione con i
 * testi reali e una singola operazione e non una caccia al tesoro fra i
 * componenti.
 *
 * Vincolo rispettato (AGENT_START_HERE): questi testi non contengono storia,
 * date di fondazione, numeri, statistiche, testimonianze o partner inventati.
 * Descrivono soltanto come funziona il servizio. Non aggiungere claim
 * verificabili finche non arrivano dal proprietario.
 */

export const HOME_CONTENT = {
  hero: {
    eyebrow: 'VRSUS',
    title: 'Il gioco è il punto di partenza.',
    body: 'Uno spazio dove console, visori, cabinati e tavoli stanno nella stessa stanza. Si viene per giocare e si resta per la compagnia.',
  },
  intro: {
    eyebrow: 'Cosa facciamo',
    title: 'Una sala, tante postazioni, nessuna competenza richiesta.',
    description:
      'Ogni evento mette a disposizione un insieme di postazioni e una selezione di giochi. Puoi girare liberamente, fermarti dove ti diverti di più o iscriverti a un torneo.',
  },
  steps: [
    {
      title: 'Scegli l’evento',
      body: 'Ogni evento ha una data, un tipo e le postazioni disponibili. Trovi tutto nella locandina.',
      icon: 'i-lucide-calendar-days',
    },
    {
      title: 'Prenota il posto',
      body: 'Confermi la prenotazione e ricevi il tuo biglietto con QR code nell’area personale.',
      icon: 'i-lucide-ticket',
    },
    {
      title: 'Presentati e gioca',
      body: 'Mostri il QR all’ingresso e la serata è tua. Si paga sul posto, quando previsto.',
      icon: 'i-lucide-gamepad-2',
    },
  ],
  platforms: {
    eyebrow: 'Postazioni',
    title: 'Quello che trovi in sala.',
    description:
      'Le postazioni cambiano da evento a evento. Qui c’è il catalogo completo di quelle che possiamo mettere a disposizione.',
  },
  services: {
    eyebrow: 'Servizi',
    title: 'Anche su misura.',
    description:
      'Compleanni, team building, giornate a tema o spazi riservati: raccontaci cosa ti serve e prepariamo la configurazione adatta.',
  },
  closing: {
    title: 'Ci vediamo in sala.',
    body: 'Crea il tuo account per prenotare, seguire i tornei e tenere traccia dei tuoi punteggi.',
  },
} as const

export const ABOUT_CONTENT = {
  hero: {
    eyebrow: 'Chi siamo',
    title: 'VRSUS nasce da una convinzione semplice.',
    body: 'Giocare insieme, nello stesso posto, è un’esperienza diversa dal giocare online. Abbiamo costruito uno spazio che parte da lì.',
  },
  sections: [
    {
      title: 'Lo spazio',
      body: 'Una sala pensata perché le persone si incontrino: le postazioni non sono isolate, si gioca guardandosi in faccia e chi aspetta il proprio turno guarda gli altri giocare.',
    },
    {
      title: 'Il modo di stare insieme',
      body: 'Nessuna gerarchia fra chi gioca da vent’anni e chi prende in mano un controller per la prima volta. Le postazioni sono pensate per essere accessibili subito, e chi vuole qualcosa di più competitivo trova i tornei.',
    },
    {
      title: 'Gli eventi',
      body: 'Ogni evento ha una configurazione propria: le postazioni disponibili, i giochi selezionati e i tornei in programma. Non è mai due volte la stessa serata.',
    },
    {
      title: 'I tornei e il ranking',
      body: 'Chi partecipa ai tornei accumula punti che confluiscono in una classifica generale. Su ogni gioco resta anche il record assoluto, per chi punta a quello.',
    },
  ],
  values: [
    {
      title: 'Accessibile',
      body: 'Si può arrivare senza sapere niente di videogiochi.',
    },
    {
      title: 'Condiviso',
      body: 'Le postazioni sono un pretesto per stare insieme.',
    },
    {
      title: 'Organizzato',
      body: 'Prenotazione, check-in e tornei gestiti senza confusione.',
    },
  ],
} as const

export const SERVICES_INTRO = {
  eyebrow: 'Servizi',
  title: 'Costruiamo la giornata attorno al tuo gruppo.',
  description:
    'Ogni servizio parte dalle stesse postazioni e cambia in base a quante persone siete, quanto tempo avete e cosa volete ottenere dalla giornata.',
} as const

export const PLATFORMS_INTRO = {
  eyebrow: 'Postazioni',
  title: 'Il catalogo delle postazioni.',
  description:
    'Console, realtà virtuale, cabinati arcade e tavoli da gioco. La disponibilità effettiva dipende dall’evento.',
} as const
