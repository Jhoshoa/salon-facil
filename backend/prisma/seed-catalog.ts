import { PrismaClient } from '@prisma/client';
import { spaceTypeSeed, useTypeSeed, amenitySeed } from './seed-data/catalogs';

// Safe to run in production — unlike seed.ts, this never wipes existing data and has no
// NODE_ENV guard. Only touches the three reference-data catalogs the venue-creation form and
// search filters need to have any options at all (space types, use types, amenities); never
// touches users, venues, bookings, or anything else. Idempotent: `skipDuplicates` means running
// this again after new catalog entries were added to seed-data/catalogs.ts only inserts the new
// ones, and running it with no changes at all is a harmless no-op.
//
// Run once against a fresh production database: `npx ts-node prisma/seed-catalog.ts`
// (or, in the prod docker-compose stack: `docker compose -f docker-compose.prod.yml exec backend
// npx ts-node prisma/seed-catalog.ts`).

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding catalogs...');

  const spaceTypes = await prisma.spaceType.createMany({
    data: spaceTypeSeed,
    skipDuplicates: true,
  });
  const useTypes = await prisma.useType.createMany({ data: useTypeSeed, skipDuplicates: true });
  const amenities = await prisma.amenity.createMany({ data: amenitySeed, skipDuplicates: true });

  console.log(
    `Done — inserted ${spaceTypes.count} space types, ${useTypes.count} use types, ${amenities.count} amenities (existing entries were skipped).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
