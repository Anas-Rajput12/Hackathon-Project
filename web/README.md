# AquaTrace web application

AquaTrace is an evidence-led water integrity platform for documenting pollution incidents, reviewing supporting evidence, assessing risk, coordinating action, and tracking outcomes. Its AI pipeline provides decision support only; field verification and regulatory decisions remain human responsibilities.

## Architecture

- **Web:** Next.js App Router, React, TypeScript, Tailwind CSS
- **Data:** PostgreSQL with Prisma
- **Authentication:** Better Auth with role-based access control
- **Uploads:** Cloudinary in production; local mock storage is development-only
- **Mapping:** MapLibre GL with OpenFreeMap tiles
- **AI service:** FastAPI with a five-stage evidence, water-quality, verification, risk, and resolution pipeline

## Prerequisites

- Node.js 20 or later
- npm 10 or later
- PostgreSQL 15 or later
- Python 3.11 through 3.13 for the AI service
- A Cloudinary account for production uploads

## Local setup

1. Install web dependencies:

   ```bash
   cd web
   npm ci
   ```

2. Copy the web environment template and configure a local PostgreSQL database:

   ```bash
   cp .env.example .env
   ```

3. Generate the Prisma client and apply migrations to a new local database:

   ```bash
   npm run db:generate
   npx prisma migrate dev
   ```

4. Seed the optional demonstration dataset:

   ```bash
   npm run db:seed
   ```

   Seeding only runs when the database has no users. It is intended for local demos, not production data.

5. Start the AI service in a separate terminal:

   ```bash
   cd ../ai
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env
   uvicorn main:app --reload --port 8000
   ```

   On Windows PowerShell, activate the virtual environment with:

   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```

6. Start the web application:

   ```bash
   cd ../web
   npm run dev
   ```

## Environment configuration

### Web (`web/.env`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | Long, unique production session secret |
| `BETTER_AUTH_URL` | Yes | Canonical web application URL |
| `SMTP_HOST` | Yes for public signup/recovery | SMTP server hostname |
| `SMTP_PORT` | Yes for public signup/recovery | SMTP server port, typically `587` for STARTTLS or `465` for TLS |
| `SMTP_USER` | Yes for public signup/recovery | SMTP authentication username |
| `SMTP_PASSWORD` | Yes for public signup/recovery | SMTP authentication password or app password |
| `SMTP_SECURE` | Yes for public signup/recovery | Set `true` for implicit TLS on port `465`; otherwise use `false` |
| `EMAIL_FROM` | Yes for public signup/recovery | Sender, e.g. `AquaTrace <no-reply@yourdomain.com>` |
| `NEXT_PUBLIC_APP_URL` | Yes | Canonical public URL used for metadata, robots, and sitemap |
| `CLOUDINARY_CLOUD_NAME` | Production | Cloudinary upload configuration |
| `CLOUDINARY_API_KEY` | Production | Cloudinary upload configuration |
| `CLOUDINARY_API_SECRET` | Production | Cloudinary upload configuration |
| `AI_SERVICE_URL` | When AI analysis is enabled | Internal FastAPI base URL |
| `AI_SERVICE_SECRET` | When AI analysis is enabled | Shared secret for web-to-AI requests |

### AI service (`ai/.env`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Same PostgreSQL database used by the web app |
| `AI_SERVICE_SECRET` | Yes | Must exactly match the web service secret |
| `ALLOWED_ORIGINS` | Yes | Comma-separated trusted web origins |
| `OPENROUTER_API_KEY` | Optional | OpenRouter key for live agent execution |
| `OPENAI_API_KEY` | Optional | OpenAI-compatible key for live agent execution |
| `OPENAI_BASE_URL` | Optional | OpenAI-compatible API base URL; defaults to OpenRouter for `sk-or-...` keys |
| `OPENAI_MODEL` | Optional | Model identifier for live agent execution |
| `PORT` | Optional | FastAPI port; defaults to `8000` |

Never commit real environment files. The repository ignores all environment files except `.env.example` templates.

## Demo accounts

After a successful local seed, each account uses the development-only password `password123`:

| Role | Account |
| --- | --- |
| Citizen | `alex@aquatrace.dev` |
| Inspector | `irene@aquatrace.dev` |
| NGO | `waterwatch@aquatrace.dev` |
| Authority | `epa@aquatrace.dev` |
| Administrator | `admin@aquatrace.dev` |

Do not seed these accounts or use this password in production.

## Security and operations

- Public signup creates a `CITIZEN` account only; provision Inspector, NGO, Authority, and Administrator roles through controlled organization workflows.
- Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURE`, and a valid `EMAIL_FROM` sender. Email/password accounts must verify their email before signing in, and password resets revoke active sessions.
- Use a unique, high-entropy `BETTER_AUTH_SECRET` and `AI_SERVICE_SECRET` per environment.
- Set `ALLOWED_ORIGINS` to explicit deployed web origins; do not use wildcard CORS.
- Configure Cloudinary before production. The application refuses in-memory evidence storage in production.
- Upload validation checks type, extension, size, and recognized file signatures; application authorization still governs evidence retrieval.
- Rotate any external credentials that were ever stored outside secure secret management.
- Restrict database and AI service network access to the web service and trusted operators.
- Review database backups, audit-log retention, and incident data handling policies before deployment.

## Production deployment

1. Provision PostgreSQL and configure production environment variables in secret management.
2. Build and deploy the AI service as an internal service; set its allowed web origin and shared secret.
3. Install web dependencies and apply committed database migrations:

   ```bash
   cd web
   npm ci
   npm run db:generate
   npx prisma migrate deploy
   npm run build
   npm run start
   ```

4. Configure HTTPS, the canonical `NEXT_PUBLIC_APP_URL`, Cloudinary, and the AI service URL.
5. Verify `/api/health` equivalents, authentication, uploads, map loading, an incident report, AI analysis, and authority alerts before announcing the deployment.

## Vercel, Render, and Neon deployment path

1. **Neon:** Create a PostgreSQL database and put its pooled connection string in `DATABASE_URL` for both services. Run `npx prisma migrate deploy` from the web deployment or a trusted release job before serving traffic.
2. **Render:** Deploy `ai/` as a Python web service with the start command `uvicorn main:app --host 0.0.0.0 --port $PORT`. Set `DATABASE_URL`, `AI_SERVICE_SECRET`, and `ALLOWED_ORIGINS` to the deployed web origin. Keep the service private when the hosting plan supports it.
3. **Vercel:** Set `web/` as the project root. Configure every web environment variable, including the Render AI service URL and its matching secret. Use the standard `npm run build` build command and ensure `NEXT_PUBLIC_APP_URL` is the final HTTPS domain.
4. After deployment, use the real Vercel URL in `ALLOWED_ORIGINS`; do not leave local development origins enabled in production.

## Quality checks

Run these before release:

```bash
cd web
npm run typecheck
npm run lint
npx prisma validate
npm run build

cd ../ai
pytest -q
```

The web application includes a public sitemap only when `NEXT_PUBLIC_APP_URL` is configured. Dashboard, admin, and API routes are excluded from crawling.
