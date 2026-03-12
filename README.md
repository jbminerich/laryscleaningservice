# laryscleaningservices.org stack

Production-ready web stack for **Lary's Cleaning Services**:

- **Frontend:** Next.js (App Router)
- **Reverse Proxy:** Traefik
- **Orchestration:** Docker Compose (dev + prod)
- **Target host:** OCI VM `132.226.99.124`
- **Primary domain:** `laryscleaningservices.org`

## Project Layout

```text
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
- `http://localhost:8080` → Traefik dashboard

## Production Deployment (OCI)

Use this on your **separate OCI host** (`132.226.99.124`) after cloning the repo there.

### 1) DNS records

Point these records to `132.226.99.124`:

- `laryscleaningservices.org`

`www.laryscleaningservices.org` is optional. Add it only after creating a valid DNS record, then update Traefik router rules to include `www`.

### 2) Create production env file

Copy the template and set values:

```bash
cp infra/.env.prod.example infra/.env.prod
```

### 3) Start production stack

```bash
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod pull
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod build backend
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod up -d --remove-orphans
```

### 4) Required OCI networking

Open inbound ports on the OCI instance/security list:

- TCP `80`
- TCP `443`

## Notes

- Traefik is configured with Let's Encrypt TLS (`httpchallenge`) and HTTP→HTTPS redirect.
- Update `LETSENCRYPT_EMAIL` in `infra/.env.prod` before go-live.

## GitHub Actions CI/CD (auto upload + deploy)

A deployment workflow is included at:

`/.github/workflows/deploy-oci.yml`

It does the following on every push to `main`:

1. Builds frontend Docker image
2. Pushes image to GHCR
3. SSHes into OCI VM and runs `docker compose pull && up -d`

Configure these repository **Actions secrets**:

- `OCI_HOST` (set to `132.226.99.124`)
- `OCI_USER`
- `OCI_SSH_KEY`
- `OCI_PORT` (usually `22`)
- `OCI_DEPLOY_PATH` (absolute path on VM where repo is checked out)
- `GHCR_USERNAME`
- `GHCR_TOKEN` (must include package read/write)
- `APP_DOMAIN` (`laryscleaningservices.org`)
- `LETSENCRYPT_EMAIL`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_HOURS` (example: `12`)
- `ADMIN_TOKEN` (optional fallback token; set a strong value)
