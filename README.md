# Evidencija radnika

Web aplikacija za evidenciju sati, sklopljenog nameštaja, bodova i stimulacije.

Lokalno koristi PostgreSQL (Neon). Podaci nisu u pregledaču — idu u bazu.

## Nalozi

| Uloga | Korisničko ime | Lozinka |
| --- | --- | --- |
| Vlasnik | `vlasnik` | `vlasnik123` |
| Operater na terenu | `operater` | `operater123` |

Promeni lozinke u Podešavanjima čim aplikacija bude online.

## Pokretanje lokalno

1. Kopiraj `.env.example` u `.env`
2. Ubaci Neon `DATABASE_URL` i `DIRECT_URL` (isti string može za oba dok radiš lokalno)
3. Ubaci `AUTH_SECRET`
4. Pokreni:

```bash
npm install
npm run db:setup
npm run db:restore
npm run dev
```

Otvori [http://localhost:3000](http://localhost:3000).

`db:restore` vraća radnike, nameštaj i unose sačuvane iz starog lokalnog SQLite fajla.

## Online (besplatno)

1. Napravi privatni repo na GitHubu i push-uj ovaj projekat
2. Napravi besplatnu bazu na [Neon](https://console.neon.tech)
3. Na [Vercel](https://vercel.com) uvezi GitHub repo
4. U Vercel Environment Variables stavi:
   - `DATABASE_URL` — Neon **pooled** connection
   - `DIRECT_URL` — Neon **direct** connection
   - `AUTH_SECRET` — dug, nasumičan string
5. Deploy. Vercel na buildu pokreće migracije.
6. Jednom, lokalno ili preko Vercel CLI, pokreni `npm run db:restore` sa produkcijskim `DATABASE_URL` da prebaciš postojeće podatke

Ne commituj `.env` ni `prisma/dev.db`.
