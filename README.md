# laryscleaningservices.org stack

Production-ready web stack for **Lary's Cleaning Services** modeled after the `jeremythevet` pattern:

- **Frontend:** Next.js (App Router)
- **Backend:** FastAPI
- **Reverse Proxy:** Traefik
- **Orchestration:** Docker Compose (dev + prod)
- **Target host:** OCI VM `161.153.103.253`
- **Primary domain:** `laryscleaningservices.org`

## Project Layout

```text
backend/                      FastAPI API
frontend/app/                 Next.js app
infra/                        Compose + Traefik configs
```

## Local Development

From repository root:

```bash
docker compose -f infra/docker-compose.dev.yml up --build
```

Local URLs:

- `http://app.localhost` → frontend
- `http://api.localhost` → backend
- `http://localhost:8080` → Traefik dashboard

## Production Deployment (OCI)

Use this on your **separate OCI host** (`161.153.103.253`) after cloning the repo there.

### 1) DNS records

Point these records to `161.153.103.253`:

- `laryscleaningservices.org`
- `www.laryscleaningservices.org`
- `api.laryscleaningservices.org`

### 2) Create production env file

Copy the template and set values:

```bash
cp infra/.env.prod.example infra/.env.prod
```

### 3) Start production stack

```bash
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod pull
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod up -d
```

### 4) Required OCI networking

Open inbound ports on the OCI instance/security list:

- TCP `80`
- TCP `443`

## Notes

- Traefik is configured with Let's Encrypt TLS (`tlschallenge`) and HTTP→HTTPS redirect.
- Update `LETSENCRYPT_EMAIL` in `infra/.env.prod` before go-live.
