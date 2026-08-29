# VRSUS Web App

PWA responsive per gli eventi VRSUS: il prodotto è progettato attorno
all'evento e alle esperienze, con Nuxt 4, Supabase e deployment Cloudflare
Pages.

## Sviluppo locale

Prerequisiti:

- Node.js 22.x;
- pnpm 10.x (il progetto lo dichiara in `package.json` e può essere fornito da
  Corepack);
- Docker Desktop, necessario per Supabase DEV.

```bash
corepack enable
pnpm install
pnpm dev
```

L'applicazione è disponibile su `http://127.0.0.1:3000`.

Per configurare Supabase locale:

```bash
supabase start
Copy-Item .env.example .env
```

Inserire in `.env` le chiavi anon e service-role mostrate da `supabase
status`. Il file `.env` è ignorato da Git.

Comandi database disponibili:

```bash
pnpm db:start
pnpm db:reset
pnpm db:types
pnpm db:test
```

VRSUS usa porte locali dedicate per non interferire con altri progetti:
API `54331`, database `54332`, Studio `54333` e Inbucket `54334`.
`pnpm db:reset` ricrea schema e fixture fittizie locali: non contiene utenti,
credenziali o contenuti VRSUS reali.

## Verifiche

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Per un build Cloudflare esplicito:

```bash
pnpm exec nuxt build --preset=cloudflare_pages
```

## Struttura principale

- `app/`: pagine, layout, componenti, composable e token UI;
- `server/`: servizi e logica server-side;
- `shared/`: tipi, schemi e costanti condivisi;
- `supabase/`: configurazione, migration e funzioni Edge;
- `tests/`: test unitari ed E2E;
- `docs/ai/`: stato, handoff, decisioni e report di verifica;
- `docs/technical/`: specifica tecnica e roadmap approvate.

La source of truth dello schema Supabase sarà `supabase/migrations/`. La
service-role key non deve mai arrivare al browser.
