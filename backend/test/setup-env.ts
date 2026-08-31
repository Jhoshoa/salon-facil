// Runs before each e2e spec file loads AppModule (via jest-e2e.json's `setupFiles`), so
// PrismaService and the BullMQ/Redis connection point at an isolated test database/queue
// instead of the dev database used for manual QA. Without this, every e2e run permanently
// wrote throwaway users/venues/bookings into the same DB a developer is testing against by
// hand (see docs/app-flows/README.md and `backend/scripts/setup-e2e-db.js`, which provisions
// this database before the suite runs).
//
// Setting these directly (not via dotenv) guarantees they win: dotenv never overrides an
// already-present process.env value, so ConfigModule.forRoot's own .env.local/.env loading
// (triggered later, when AppModule is imported) fills in everything else — JWT secrets,
// bcrypt rounds, etc. — without touching these two.
process.env.DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  'postgresql://salonfacil:salonfacil_dev_password@localhost:5434/salonfacil_test';
process.env.REDIS_URL = process.env.E2E_REDIS_URL ?? 'redis://localhost:6379/1';
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
