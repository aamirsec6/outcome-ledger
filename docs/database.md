# Database — Outcome Ledger

## Railway (production)

- **Service:** `Postgres-Xstw` in project `outcome-ledger`
- **API wiring:** `DATABASE_URL=${{Postgres-Xstw.DATABASE_URL}}`
- **Not shared** with Authon / `aware-insight` / legacy `Postgres` service

Schema is applied on API boot (`init_db()` in app lifespan).

Manual init (from Railway network):

```bash
railway service link outcome-ledger
railway run -- python scripts/init_database.py
```

## Multi-tenant model

Every tenant is an `organizations` row. All fact tables include `org_id` with:

- **Foreign key** → `organizations.id` `ON DELETE CASCADE`
- **Unique constraints** per tenant (`org_id` + `external_id`, etc.)
- **Clerk mapping** in `organization_clerk_links` (partial unique index for personal workspaces on Postgres)

API requests resolve `org_id` from Clerk JWT or `ol_*` API key before any query.

## ACID

- **PostgreSQL** provides atomicity, consistency, isolation, durability.
- **SQLAlchemy sessions:** one transaction per request (`get_db()` commits on success, rolls back on error).
- **Connection pool:** `pool_pre_ping`, bounded pool size on Postgres.
- **Idempotent ingest:** `external_id` uniqueness prevents duplicate spend/outcome rows.

## Local dev

```bash
cd api
DATABASE_URL=sqlite:///./outcome_ledger.db uvicorn app.main:app --reload
```

SQLite skips Postgres-only indexes; FKs are enforced where supported.
