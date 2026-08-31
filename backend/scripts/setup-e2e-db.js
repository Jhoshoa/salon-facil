#!/usr/bin/env node
// Provisions the isolated database e2e tests run against (see test/setup-env.ts). Runs
// automatically before `npm run test:e2e` via the `pretest:e2e` npm lifecycle hook.
//
// 1. Creates the target database if it doesn't exist yet (idempotent — connects to the
//    server's built-in `postgres` maintenance database to do this, which is always present,
//    so this works the same whether the database lives on the shared local dev Postgres
//    container or a fresh one-off CI service container).
// 2. Applies migrations (`prisma migrate deploy`).
// 3. Reseeds it (`prisma db seed`) so every e2e run starts from the same known state —
//    reusing the project's own seed script (including the ADMIN account venue.e2e-spec.ts
//    logs in as) instead of hand-rolling fixtures.
const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  'postgresql://salonfacil:salonfacil_dev_password@localhost:5434/salonfacil_test';

async function ensureDatabaseExists(targetUrl) {
  const url = new URL(targetUrl);
  const dbName = decodeURIComponent(url.pathname.slice(1));
  const maintenanceUrl = new URL(targetUrl);
  maintenanceUrl.pathname = '/postgres';

  const client = new PrismaClient({ datasources: { db: { url: maintenanceUrl.toString() } } });
  try {
    await client.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
    console.log(`[e2e] Created database "${dbName}"`);
  } catch (err) {
    if (!/already exists/i.test(err.message)) throw err;
  } finally {
    await client.$disconnect();
  }
}

async function main() {
  const redactedUrl = DATABASE_URL.replace(/:[^:@/]+@/, ':***@');
  console.log(`[e2e] Preparing test database: ${redactedUrl}`);

  await ensureDatabaseExists(DATABASE_URL);

  const env = { ...process.env, DATABASE_URL, NODE_ENV: 'test' };
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env });
  execSync('npx prisma db seed', { stdio: 'inherit', env });
}

main().catch((err) => {
  console.error('[e2e] Failed to prepare test database:', err);
  process.exit(1);
});
