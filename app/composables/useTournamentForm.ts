import type { TournamentRules } from '~~/shared/types/tournament-view'

// Configurazione di un torneo lato maschera.
//
// Le tre domande che descrivono un torneo (chi gioca, come ci si affronta,
// come si vince) hanno qui la loro forma editabile. Il preset e solo una
// scorciatoia che le precompila: quello che viene salvato sono sempre i
// singoli campi, cosi il motore non deve conoscere i preset.

export type TournamentFormState = {
  entrySize: number
  teamFormation: 'solo' | 'open' | 'invite' | 'admin'
  format: string
  groupSize: number
  roundsCount: number
  resultKind: string
  scoreDirection: 'asc' | 'desc'
  heatSeeding: 'rotation' | 'standings'
  allowDraw: boolean
  /** Punti per posizione, scritti come "10/8/6/4". */
  placementPoints: string
}

export function defaultTournamentForm(): TournamentFormState {
  return {
    entrySize: 1,
    teamFormation: 'solo',
    format: 'single_elimination',
    groupSize: 2,
    roundsCount: 3,
    resultKind: 'win_loss',
    scoreDirection: 'desc',
    heatSeeding: 'rotation',
    allowDraw: false,
    placementPoints: '',
  }
}

export type TournamentPreset = {
  value: string
  label: string
  description: string
  apply: Partial<TournamentFormState>
}

export const TOURNAMENT_PRESETS: TournamentPreset[] = [
  {
    value: 'duel_ko',
    label: 'Duello a eliminazione',
    description: 'Uno contro uno, chi perde esce. Tekken, Street Fighter, FC.',
    apply: {
      entrySize: 1,
      format: 'single_elimination',
      resultKind: 'win_loss',
      groupSize: 2,
    },
  },
  {
    value: 'round_robin',
    label: 'Tutti contro tutti',
    description:
      'Ogni coppia si incontra una volta, vince chi fa piu vittorie.',
    apply: {
      entrySize: 1,
      format: 'round_robin',
      resultKind: 'win_loss',
      groupSize: 2,
    },
  },
  {
    value: 'heats_points',
    label: 'Manche a punti',
    description:
      'Gruppi che corrono insieme piu volte, punti per posizione. Mario Kart, Smash.',
    apply: {
      entrySize: 1,
      format: 'heats',
      resultKind: 'placement',
      groupSize: 4,
      roundsCount: 3,
    },
  },
  {
    value: 'time_attack',
    label: 'Time attack',
    description:
      'Si gioca uno alla volta, vince il tempo migliore. Simulatori di guida.',
    apply: {
      entrySize: 1,
      format: 'time_trial',
      resultKind: 'time',
      groupSize: 1,
      roundsCount: 2,
    },
  },
  {
    value: 'score_attack',
    label: 'Sfida a punteggio',
    description: 'Si gioca uno alla volta, vince il punteggio piu alto.',
    apply: {
      entrySize: 1,
      format: 'time_trial',
      resultKind: 'points',
      groupSize: 1,
      roundsCount: 2,
    },
  },
  {
    value: 'team_ko',
    label: 'Coppie a eliminazione',
    description:
      'Squadre da due che si sfidano, chi perde esce. Overcooked, FC.',
    apply: {
      entrySize: 2,
      teamFormation: 'open',
      format: 'single_elimination',
      resultKind: 'points',
      groupSize: 2,
    },
  },
  {
    value: 'team_points',
    label: 'Squadre a punti',
    description:
      'Squadre che giocano tutte contro tutte, vince chi somma di piu.',
    apply: {
      entrySize: 2,
      teamFormation: 'open',
      format: 'round_robin',
      resultKind: 'points',
      groupSize: 2,
    },
  },
]

export const TOURNAMENT_FORMAT_OPTIONS = [
  { value: 'single_elimination', label: 'Eliminazione diretta' },
  { value: 'round_robin', label: 'Tutti contro tutti' },
  {
    value: 'double_round_robin',
    label: 'Tutti contro tutti, andata e ritorno',
  },
  { value: 'heats', label: 'Manche a gruppi' },
  { value: 'time_trial', label: 'Uno alla volta (tempo o punteggio)' },
]

export const TOURNAMENT_RESULT_OPTIONS = [
  { value: 'win_loss', label: 'Vittoria o sconfitta' },
  { value: 'points', label: 'Punteggio' },
  { value: 'time', label: 'Tempo' },
  { value: 'placement', label: 'Ordine di arrivo' },
]

export const TOURNAMENT_TEAM_OPTIONS = [
  { value: 'open', label: 'Squadre aperte: chiunque puo entrare' },
  { value: 'invite', label: 'Squadre a invito: serve il codice del capitano' },
  { value: 'admin', label: 'Squadre composte dallo staff' },
]

/**
 * Le stesse regole di coerenza del database, applicate mentre si compila:
 * l'anteprima deve mostrare il torneo che verra salvato davvero.
 */
export function normalizeTournamentForm(form: TournamentFormState) {
  if (form.entrySize <= 1) {
    form.entrySize = 1
    form.teamFormation = 'solo'
  } else if (form.teamFormation === 'solo') {
    form.teamFormation = 'open'
  }

  if (form.format === 'time_trial') {
    form.groupSize = 1
    if (!['time', 'points'].includes(form.resultKind)) form.resultKind = 'time'
  } else if (form.format === 'heats') {
    form.groupSize = Math.max(2, form.groupSize || 4)
    if (form.groupSize > 2 && form.resultKind === 'win_loss') {
      form.resultKind = 'placement'
    }
  } else {
    form.groupSize = 2
  }

  if (form.resultKind === 'time') form.scoreDirection = 'asc'
  if (['single_elimination', 'time_trial'].includes(form.format)) {
    form.allowDraw = false
  }
  if (form.format === 'heats' && form.groupSize > 2) form.allowDraw = false
}

function parsePlacementPoints(value: string, groupSize: number) {
  const parsed = value
    .split(/[^0-9.-]+/)
    .map((part) => Number(part))
    .filter((part) => Number.isFinite(part))
  if (parsed.length) return parsed
  // Scala di scorta: dal primo all'ultimo, due punti di scarto per posizione.
  const size = Math.max(groupSize, 2)
  return Array.from({ length: size }, (_, index) => (size - index) * 2 + 2)
}

/** Colonne del torneo, pronte per l'insert o l'update. */
export function tournamentRulesPayload(form: TournamentFormState) {
  const isPlacement =
    form.resultKind === 'placement' ||
    (form.format === 'heats' && form.groupSize > 2)

  return {
    entry_size: form.entrySize,
    team_formation: form.teamFormation,
    format: form.format,
    group_size: form.groupSize,
    rounds_count: ['heats', 'time_trial'].includes(form.format)
      ? form.roundsCount
      : null,
    result_kind: form.resultKind,
    score_direction: form.resultKind === 'points' ? form.scoreDirection : null,
    heat_seeding: form.heatSeeding,
    allow_draw: form.allowDraw,
    scoring_config: isPlacement
      ? {
          placement_points: parsePlacementPoints(
            form.placementPoints,
            form.groupSize,
          ),
        }
      : {},
  }
}

/**
 * Anteprima della configurazione, con la stessa forma che avra il torneo
 * salvato: serve alla frase di riepilogo mostrata nella maschera.
 */
export function previewTournamentRules(
  form: TournamentFormState,
): TournamentRules {
  const isPlacement =
    form.resultKind === 'placement' ||
    (form.format === 'heats' && form.groupSize > 2)

  return {
    format: form.format,
    resultKind: form.resultKind,
    standingMetric:
      form.format === 'single_elimination'
        ? 'bracket'
        : isPlacement
          ? 'placement_points'
          : form.resultKind === 'time'
            ? 'best_time'
            : form.resultKind === 'points'
              ? 'points_sum'
              : 'wins',
    scoreDirection:
      form.resultKind === 'time'
        ? 'asc'
        : form.resultKind === 'points'
          ? form.scoreDirection
          : null,
    entrySize: form.entrySize,
    teamFormation: form.teamFormation,
    groupSize: form.groupSize,
    roundsCount: ['heats', 'time_trial'].includes(form.format)
      ? form.roundsCount
      : null,
    heatSeeding: form.heatSeeding,
    allowDraw: form.allowDraw,
    placementPoints: isPlacement
      ? parsePlacementPoints(form.placementPoints, form.groupSize)
      : [],
  }
}

/** Quante partite verranno create, per l'anteprima del calendario. */
export function previewSchedule(
  form: TournamentFormState,
  entriesCount: number,
) {
  const count = Math.max(0, entriesCount)
  if (count < 2) return null

  switch (form.format) {
    case 'single_elimination': {
      let slots = 2
      while (slots < count) slots *= 2
      return `${slots - 1} partite, ${Math.log2(slots)} round`
    }
    case 'round_robin':
      return `${(count * (count - 1)) / 2} partite`
    case 'double_round_robin':
      return `${count * (count - 1)} partite`
    case 'heats': {
      const groups = Math.ceil(count / Math.max(2, form.groupSize))
      return `${groups} gruppi per manche, ${groups * form.roundsCount} partite in tutto`
    }
    case 'time_trial':
      return `${count * form.roundsCount} tentativi`
    default:
      return null
  }
}
