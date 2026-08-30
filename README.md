# Termin — футсал сала Ресен

Mobile-first booking for the local futsal pitch. Guests reserve a slot with name and phone — no account required.

## Run locally

PostgreSQL must be running. Default `.env` uses your local Homebrew Postgres:

```bash
createdb termin_mk
cp .env.example .env
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

- Public calendar: [http://localhost:3000](http://localhost:3000)
- Admin: [http://localhost:3000/admin](http://localhost:3000/admin) (password from `ADMIN_PASSWORD`)

Optional Docker Postgres is in `docker-compose.yml` (port `5435`). Point `DATABASE_URL` at it if you use that instead.
