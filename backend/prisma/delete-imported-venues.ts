import { PrismaClient, VenueStatus } from '@prisma/client';
import { readVenueRows, tieneWebPropia } from './seed-data/venue-csv';

// Undoes seed-bolivia-venues.ts: permanently deletes the placeholder venues it created, with
// everything that cascades from them. There's no column marking them as imported, so a venue counts
// as imported when the ADMIN_EMAIL account owns it and either its name is in the CSV or it still has
// the script's placeholder address -- the second covers a venue renamed after the import.
//
// Only simulates unless told otherwise, and always prints the database it points at. Deleting takes
// the count the simulation showed, so a list that changed in between stops the run.
//
// Usage (see docs/deploy/importar-locales-csv.md):
//   node dist/prisma/delete-imported-venues.js <csv-path>
//   node dist/prisma/delete-imported-venues.js <csv-path> --execute --expected=<N>
//
// Options:
//   --keep-edited        also keeps venues that already have data added to them
//   --include-published  also deletes published venues and those under review

const PLACEHOLDER_ADDRESS = 'calle';
const PLACEHOLDER_DISTRICT = 'Zona';
const PLACEHOLDER_CAPACITY_MAX = 150;
const PUBLISHED_STATUSES: VenueStatus[] = [VenueStatus.ACTIVE, VenueStatus.PENDING];

function parseOptions(args: string[]) {
  const known = ['--execute', '--keep-edited', '--include-published'];
  const expectedArg = args.find((arg) => arg.startsWith('--expected='));
  const unknown = args.filter((arg) => !known.includes(arg) && arg !== expectedArg);
  const expected = expectedArg ? Number(expectedArg.split('=')[1]) : undefined;

  if (unknown.length > 0 || (expected !== undefined && !Number.isInteger(expected))) {
    console.error(
      'Uso: delete-imported-venues.ts <csv-path> [--execute --expected=<N>] [--keep-edited] [--include-published]',
    );
    process.exit(1);
  }

  return {
    execute: args.includes('--execute'),
    keepEdited: args.includes('--keep-edited'),
    includePublished: args.includes('--include-published'),
    expected,
  };
}

function targetDatabase(): string {
  try {
    const url = new URL(process.env.DATABASE_URL ?? '');
    return `${url.hostname}${url.pathname}`;
  } catch {
    return '(DATABASE_URL no valido)';
  }
}

async function main(): Promise<void> {
  const [, , csvPath, ...args] = process.argv;
  if (!csvPath || csvPath.startsWith('--')) {
    console.error('Falta la ruta del CSV.');
    process.exit(1);
  }
  const options = parseOptions(args);

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.error(
      'ADMIN_EMAIL no esta configurado: hace falta para saber de quien son los locales.',
    );
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin || admin.role !== 'ADMIN') {
      console.error(`No se encontro una cuenta ADMIN con el email ${adminEmail}.`);
      process.exit(1);
    }

    const importedNames = new Set(
      readVenueRows(csvPath)
        .filter((row) => row.nombre_local && !tieneWebPropia(row))
        .map((row) => row.nombre_local.toLowerCase()),
    );

    // Deliberately no deletedAt filter: a venue removed from the panel is still in the table.
    const adminVenues = await prisma.venue.findMany({
      where: { ownerId: admin.id },
      select: {
        id: true,
        name: true,
        status: true,
        address: true,
        district: true,
        capacityMax: true,
        description: true,
        shortDescription: true,
        photos: true,
        deletedAt: true,
        _count: {
          select: {
            bookings: true,
            reviews: true,
            media: true,
            rentalItems: true,
            customFeatures: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const photoCount = (venue: (typeof adminVenues)[number]) =>
      Array.isArray(venue.photos) ? venue.photos.length : 0;

    const isImported = (venue: (typeof adminVenues)[number]) =>
      importedNames.has(venue.name.toLowerCase()) ||
      (venue.address === PLACEHOLDER_ADDRESS && venue.district === PLACEHOLDER_DISTRICT);

    const isEdited = (venue: (typeof adminVenues)[number]) =>
      venue.address !== PLACEHOLDER_ADDRESS ||
      venue.district !== PLACEHOLDER_DISTRICT ||
      venue.capacityMax !== PLACEHOLDER_CAPACITY_MAX ||
      Boolean(venue.description) ||
      Boolean(venue.shortDescription) ||
      photoCount(venue) > 0 ||
      venue._count.media > 0 ||
      venue._count.rentalItems > 0 ||
      venue._count.customFeatures > 0;

    const reasonToKeep = (venue: (typeof adminVenues)[number]): string | null => {
      if (venue._count.bookings > 0) return `tiene ${venue._count.bookings} reserva(s)`;
      if (venue._count.reviews > 0) return `tiene ${venue._count.reviews} resena(s)`;
      if (!options.includePublished && PUBLISHED_STATUSES.includes(venue.status)) {
        return `estado ${venue.status}`;
      }
      if (options.keepEdited && isEdited(venue)) return 'tiene datos agregados';
      return null;
    };

    const imported = adminVenues.filter(isImported);
    const toDelete = imported.filter((venue) => !reasonToKeep(venue));
    const kept = imported.filter((venue) => reasonToKeep(venue));
    const notImported = adminVenues.filter((venue) => !isImported(venue));
    const edited = toDelete.filter(isEdited);
    const imagesLeft = toDelete.reduce(
      (total, venue) => total + venue._count.media + photoCount(venue),
      0,
    );

    console.log(`Base de datos: ${targetDatabase()}`);
    console.log(`Cuenta dueña:  ${adminEmail}\n`);

    console.log(`SE BORRARIAN (${toDelete.length}):`);
    toDelete.forEach((venue) => {
      const notes = [
        venue.status,
        venue.deletedAt ? 'ya eliminado del panel' : null,
        isEdited(venue) ? 'CON DATOS AGREGADOS' : null,
      ].filter(Boolean);
      console.log(`  ${venue.name} (${notes.join(', ')})`);
    });

    console.log(`\nSE CONSERVAN aunque parecen importados (${kept.length}):`);
    kept.forEach((venue) => console.log(`  ${venue.name}: ${reasonToKeep(venue)}`));

    console.log(`\nOtros locales de esa cuenta, no se tocan (${notImported.length}):`);
    notImported.forEach((venue) => console.log(`  ${venue.name}`));

    console.log('\nResumen:');
    console.log(`  A borrar:             ${toDelete.length}`);
    console.log(`  ...con datos agregados: ${edited.length}`);
    console.log(`  Conservados:          ${kept.length}`);
    console.log(`  Imagenes en Cloudinary que quedarian sin usar: ${imagesLeft}`);

    if (!options.execute) {
      console.log(
        `\nSimulacion: no se borro nada. Para borrar, agrega --execute --expected=${toDelete.length}`,
      );
      return;
    }

    if (options.expected !== toDelete.length) {
      console.error(
        `\nNo se borro nada: --expected=${options.expected ?? '(falta)'} pero hay ${toDelete.length} locales a borrar. Revisa la simulacion.`,
      );
      process.exitCode = 1;
      return;
    }

    const ids = toDelete.map((venue) => venue.id);
    const deleted = await prisma.$transaction(async (tx) => {
      // Rechecked here: a booking made since the listing above must keep its venue.
      const result = await tx.venue.deleteMany({
        where: {
          id: { in: ids },
          ownerId: admin.id,
          bookings: { none: {} },
          reviews: { none: {} },
        },
      });
      if (result.count !== ids.length) {
        throw new Error(
          `Se iban a borrar ${ids.length} locales pero solo ${result.count} siguen elegibles: no se borro nada.`,
        );
      }
      return result.count;
    });

    console.log(`\nBorrados definitivamente: ${deleted}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
