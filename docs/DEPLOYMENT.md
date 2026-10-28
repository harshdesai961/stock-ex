# Deployment

Filled in at M3 (staging) and M7 (production). Today only the local, production-like run exists.

## Local production-like run

```bash
docker compose --profile full up --build
```

Builds `docker/app.Dockerfile` for web, server and worker, and connects them to the Compose Postgres and Redis by service name. Ports stay bound to 127.0.0.1.

## Plan

| Environment | When | Deployed from | Notes |
|---|---|---|---|
| Staging | End of M3 | Every merge to `main`, from CI | Own secrets and database; test accounts only |
| Production | M7 | Release from `main` after staging is checked | Managed Postgres + Redis (`noeviction`) near India; Cloudflare DNS/TLS |

Migrations run in CI as a separate step with the migration role, before the deploy. Rollback, backup-restore test and load-test results go here at M7.
