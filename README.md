# AquaTrace

AquaTrace is an evidence-led water integrity platform for reporting pollution incidents, monitoring water bodies, reviewing evidence, assessing risk, and coordinating accountable responses.

The project combines a Next.js web application, PostgreSQL/Prisma data services, Sentinel-2 satellite monitoring, and an optional FastAPI AI service. AI output is decision support only; field verification and regulatory decisions remain human responsibilities.

## Features

- Role-based workspaces for citizens, inspectors, NGOs, authorities, and administrators.
- Pollution incident reporting with evidence uploads and review workflows.
- Incident assignment, verification, resolution tracking, alerts, and audit logs.
- Interactive water-body and incident maps.
- Dashboard metrics and geographic analytics.
- Sentinel-2 satellite monitoring with water-area change detection.
- Before/after RGB and NDWI satellite previews.
- Date-based previous-observation lookup from Copernicus Data Space.
- Optional AI analysis pipeline for evidence, water quality, verification, risk, and resolution guidance.
- Email verification and password-reset workflows.

## Repository structure

```text
AquaTrace/
├── web/                    # Next.js frontend, API routes, Prisma database layer
│   ├── app/                # App Router pages and API endpoints
│   ├── components/         # Reusable UI and dashboard components
│   ├── lib/                # Auth, database, validation, satellite, and services
│   └── prisma/             # Schema, migrations, and seed data
├── ai/                     # Optional FastAPI AI service
│   ├── core/               # Settings, database, and pipeline logic
│   ├── routers/            # Health and analysis endpoints
│   └── requirements.txt
└── README.md
```

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- PostgreSQL 15 or newer
- Python 3.11–3.13 for the AI service
- Copernicus Data Space credentials for live satellite scans
- Cloudinary credentials for production evidence uploads

## Web application setup

```powershell
Set-Location web
npm ci
```

Create `web/.env` or `web/.env.local` with the required values:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/aquatrace"
BETTER_AUTH_SECRET="replace-with-a-long-random-secret"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Email/password verification and password reset
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_SECURE="false"
EMAIL_FROM="AquaTrace <no-reply@example.com>"

# Optional live satellite monitoring
COPERNICUS_CLIENT_ID=""
COPERNICUS_CLIENT_SECRET=""

# Optional production uploads
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# Optional AI service integration
AI_SERVICE_URL="http://localhost:8000"
AI_SERVICE_SECRET=""
```

Initialize the database and start the web app:

```powershell
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For a database that does not use migrations yet, `npm run db:push` can be used during local development.

## AI service setup

Create a virtual environment and install dependencies:

```powershell
Set-Location ai
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Configure `ai/.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/aquatrace"
AI_SERVICE_SECRET=""
ALLOWED_ORIGINS="http://localhost:3000"
OPENAI_API_KEY=""
OPENAI_BASE_URL=""
OPENAI_MODEL=""
PORT="8000"
```

Start the service:

```powershell
uvicorn main:app --reload --port 8000
```

The service exposes:

- `GET /` - service status
- `GET /health` - health check
- `POST /analyze` - AI analysis endpoint

## Demo accounts

After seeding a local database, the development accounts use the password `password123`:

| Role | Email |
| --- | --- |
| Citizen | `alex@aquatrace.dev` |
| Inspector | `irene@aquatrace.dev` |
| NGO | `waterwatch@aquatrace.dev` |
| Authority | `epa@aquatrace.dev` |
| Administrator | `admin@aquatrace.dev` |

These credentials are for local demos only and must not be used in production.

## Satellite monitoring

Live satellite scans use Sentinel-2 L2A imagery from Copernicus Data Space. A monitoring area includes:

- Water-body coordinates
- A bounding box for the scan area
- Water-change thresholds
- Latest and previous observation values

The monitoring dashboard supports:

- Running a scan for the latest available observation
- Selecting a date and checking the latest imagery available up to that date
- Preventing duplicate observations for the same monitoring area and date
- Comparing latest and previous observation imagery
- RGB and NDWI preview links

Copernicus imagery availability depends on satellite revisit timing, cloud coverage, processing time, and the selected area. A scan request may therefore return the latest available observation rather than the current calendar day.

## Useful commands

### Web

```powershell
Set-Location web
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run db:generate
npm run db:migrate
npm run db:push
npm run db:seed
npm run db:studio
```

### AI

```powershell
Set-Location ai
pytest -q
uvicorn main:app --reload --port 8000
```

## Production checklist

1. Use unique high-entropy values for `BETTER_AUTH_SECRET` and `AI_SERVICE_SECRET`.
2. Configure PostgreSQL and run committed Prisma migrations with `npx prisma migrate deploy`.
3. Configure SMTP before enabling public verification and password-reset flows.
4. Configure Cloudinary for persistent production evidence storage.
5. Restrict `ALLOWED_ORIGINS` to trusted deployed web origins.
6. Keep Copernicus credentials and API keys in secret management.
7. Build the web app with `npm run build`.
8. Run `npm run typecheck`, `npm run lint`, and the AI test suite before release.

## Security notes

- Never commit `.env`, `.env.local`, API keys, database passwords, or service secrets.
- AI results are advisory and must not replace human investigation or regulatory decisions.
- Use role-based authorization for incident, evidence, monitoring, and administration workflows.
- Review audit logs, backups, retention, and access policies before production deployment.

## License

Add the project license here before public distribution.
