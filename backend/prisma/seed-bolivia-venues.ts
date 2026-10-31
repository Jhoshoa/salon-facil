import { NestFactory } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { VenueService } from '../src/modules/venue/application/services/venue.service';
import { CreateVenueDto } from '../src/modules/venue/application/dto/create-venue.dto';
import { readVenueRows, tieneWebPropia } from './seed-data/venue-csv';

// Bulk-imports venues scraped into a CSV (nombre_local,departamento,ciudad,telefono,facebook,
// tiktok,otra_referencia,fuente,notas -- see research_notes/Locales Bolivia/*.csv, never
// committed to git since it's third-party contact data) as ADMIN-owned placeholder venues, the
// same state a venue is in right after "Registro por telefono" -- ready for "Invitar dueno" once
// a real owner confirms. Every value here is a generic placeholder the admin or the eventual
// owner edits later; this just gets a local off the ground instead of typing each one by hand.
//
// Safe to re-run: skips a row if a venue with that exact name already exists (case-insensitive),
// and never touches anything it didn't just create.
//
// Usage (run from the server, against the real database -- this session has no network path to
// production Postgres, so this always runs where DATABASE_URL already points at the right db):
//   node dist/prisma/seed-bolivia-venues.js <csv-path> 1       # just the first eligible row, to check it works
//   node dist/prisma/seed-bolivia-venues.js <csv-path> 10      # first 10 eligible rows
//   node dist/prisma/seed-bolivia-venues.js <csv-path> --all   # every eligible row in the file
//
// Dev (ts-node): npx ts-node prisma/seed-bolivia-venues.ts <csv-path> 1

const DEPARTAMENTO_MAP: Record<string, string> = {
  'la paz': 'LA_PAZ',
  'santa cruz': 'SANTA_CRUZ',
  cochabamba: 'COCHABAMBA',
  oruro: 'ORURO',
  potosi: 'POTOSI',
  chuquisaca: 'CHUQUISACA',
  tarija: 'TARIJA',
  beni: 'BENI',
  pando: 'PANDO',
};

// Only the 5 event types that already exist in the catalog (see prisma/seed-data/catalogs.ts) --
// "Bautizo" and "Cabo de ano" were asked for too but aren't seeded, so they're left out on
// purpose rather than silently invented.
const USE_TYPE_KEYS = ['WEDDING', 'BIRTHDAY', 'CORPORATE_EVENT', 'PRIVATE_PARTY', 'GRADUATION'];
const SPACE_TYPE_KEY = 'EVENT_HALL';
const AMENITY_KEY = 'bathrooms';

const GENERIC_CAPACITY_MIN = 20;
const GENERIC_CAPACITY_MAX = 150;
const GENERIC_BASE_PRICE = 1500;

/** Keeps only the first number when a cell has more than one ("71467697 / 71940412"), strips
 * everything but digits, drops a leading 591 country code if it's already there, and accepts the
 * result only if it's a clean 8-digit Bolivian number -- otherwise the venue is created without
 * a phone rather than failing the whole row over one unparsable value. */
function normalizePhone(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const firstCandidate = raw.split(/[/,;]/)[0];
  const digits = firstCandidate.replace(/\D/g, '');
  const local = digits.startsWith('591') && digits.length > 8 ? digits.slice(-8) : digits;
  return /^\d{8}$/.test(local) ? `+591${local}` : undefined;
}

function normalizeUrl(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function parseLimitArg(arg: string | undefined): { mode: 'all' | 'count'; count?: number } {
  if (arg === '--all') return { mode: 'all' };
  const n = Number(arg);
  if (!arg || !Number.isInteger(n) || n <= 0) {
    console.error(
      'Uso: seed-bolivia-venues.ts <csv-path> <N | --all>\n' +
        '  N       -- crea los primeros N locales elegibles (ej. 1, 10)\n' +
        '  --all   -- crea todos los locales elegibles del archivo',
    );
    process.exit(1);
  }
  return { mode: 'count', count: n };
}

async function main(): Promise<void> {
  const [, , csvPath, limitArg] = process.argv;
  if (!csvPath) {
    console.error('Uso: seed-bolivia-venues.ts <csv-path> <N | --all>');
    process.exit(1);
  }
  const limit = parseLimitArg(limitArg);

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.error(
      'ADMIN_EMAIL no esta configurado -- hace falta para saber a que cuenta asignar estos locales.',
    );
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const venueService = app.get(VenueService);

  try {
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin || admin.role !== 'ADMIN') {
      console.error(`No se encontro una cuenta ADMIN con el email ${adminEmail}.`);
      process.exit(1);
    }

    const spaceType = await prisma.spaceType.findUnique({ where: { key: SPACE_TYPE_KEY } });
    const amenity = await prisma.amenity.findUnique({ where: { key: AMENITY_KEY } });
    const useTypes = await prisma.useType.findMany({ where: { key: { in: USE_TYPE_KEYS } } });
    if (!spaceType || !amenity || useTypes.length !== USE_TYPE_KEYS.length) {
      console.error(
        'Faltan filas del catalogo (space type, amenity o tipos de evento) -- corre primero npm run prisma:seed:catalog.',
      );
      process.exit(1);
    }

    const rows = readVenueRows(csvPath);
    console.log(`Leidas ${rows.length} filas del CSV.`);

    let attempted = 0;
    let created = 0;
    let skippedExisting = 0;
    let skippedOwnSite = 0;
    let skippedBadData = 0;

    for (const row of rows) {
      if (limit.mode === 'count' && attempted >= limit.count!) break;

      if (!row.nombre_local) continue;

      if (tieneWebPropia(row)) {
        skippedOwnSite += 1;
        continue;
      }

      const existing = await prisma.venue.findFirst({
        where: { name: { equals: row.nombre_local, mode: 'insensitive' } },
      });
      if (existing) {
        skippedExisting += 1;
        console.log(`  [ya existe] ${row.nombre_local}`);
        continue;
      }

      const departamento = DEPARTAMENTO_MAP[row.departamento.trim().toLowerCase()];
      if (!departamento) {
        skippedBadData += 1;
        console.warn(
          `  [departamento desconocido "${row.departamento}"] ${row.nombre_local} -- omitido`,
        );
        continue;
      }

      attempted += 1;

      const dto: CreateVenueDto = Object.assign(new CreateVenueDto(), {
        name: row.nombre_local,
        address: 'calle',
        district: 'Zona',
        departamento,
        contactPhone: normalizePhone(row.telefono),
        facebookUrl: normalizeUrl(row.facebook),
        tiktokUrl: normalizeUrl(row.tiktok),
        capacityMax: GENERIC_CAPACITY_MAX,
        capacityMin: GENERIC_CAPACITY_MIN,
        spaceTypeId: spaceType.id,
        prices: [{ priceType: 'BASE', price: GENERIC_BASE_PRICE }],
        amenities: [{ amenityId: amenity.id, isIncluded: true }],
        useTypes: useTypes.map((ut) => ({ useTypeId: ut.id, isPrimary: false })),
        openingHours: Array.from({ length: 7 }, (_, dayOfWeek) => ({
          dayOfWeek,
          opensAt: '09:00',
          closesAt: '23:59',
          isClosed: false,
        })),
      });

      try {
        const venue = await venueService.createVenue(dto, admin.id);
        created += 1;
        console.log(`  [creado] ${venue.name} (${venue.id}) -- ${row.ciudad}, ${row.departamento}`);
      } catch (error) {
        skippedBadData += 1;
        console.error(`  [error] ${row.nombre_local}:`, (error as Error).message);
      }
    }

    console.log('\nResumen:');
    console.log(`  Creados:              ${created}`);
    console.log(`  Ya existian:          ${skippedExisting}`);
    console.log(`  Con web propia:       ${skippedOwnSite} (se contactan aparte)`);
    console.log(`  Con error/datos malos:${skippedBadData}`);
  } finally {
    await app.close();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
