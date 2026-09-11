import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

// Safe to run in production — unlike seed.ts, this never wipes anything and only ever touches
// one row. The admin's credentials live in ADMIN_EMAIL/ADMIN_PASSWORD/ADMIN_PHONE, read from
// the environment (the gitignored .env), the same way POSTGRES_PASSWORD/JWT_SECRET already do —
// never hardcoded here, so this file is safe to commit and the real password never touches git.
//
// Idempotent by design, not by accident: if ADMIN_EMAIL already exists, this exits without
// touching it — re-running the script (e.g. as part of a redeploy) can never silently reset an
// admin's password back to whatever the env var currently says.
//
// None of the three vars set at all is treated as "not configured this run, on purpose" and
// exits quietly (0) rather than erroring — lets this be folded into an unattended deploy step
// later without failing the whole deploy just because nobody filled in ADMIN_* this time. Only
// a partial/invalid set of vars is treated as a real mistake and fails loud (1).
//
// Run once against a fresh production database:
//   docker compose -f docker-compose.prod.yml exec backend npm run prisma:seed:admin

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#=])[A-Za-z\d@$!%*?&#=]+$/;
const MIN_ADMIN_PASSWORD_LENGTH = 12;
const PHONE_REGEX = /^\+591\d{8}$/;

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const phone = process.env.ADMIN_PHONE;
  const fullName = process.env.ADMIN_FULL_NAME || 'Administrador SalonFacil';

  const providedCount = [email, password, phone].filter(Boolean).length;

  // None set at all: treated as "not configured yet, on purpose" rather than an error — lets
  // this run unattended as part of a bigger deploy step without failing a redeploy just because
  // nobody filled in ADMIN_* this time (e.g. the admin account already exists from before).
  if (providedCount === 0) {
    console.log('ADMIN_EMAIL/ADMIN_PASSWORD/ADMIN_PHONE no estan configurados — se omite la creacion de la cuenta admin.');
    return;
  }

  // Some but not all: that's not "not configured", that's a mistake (typo'd a var name, forgot
  // one) — this should fail loud, same as an invalid password/phone below.
  if (providedCount < 3 || !email || !password || !phone) {
    console.error(
      'Configuraste solo parte de ADMIN_EMAIL/ADMIN_PASSWORD/ADMIN_PHONE — hacen falta las 3 juntas (o ninguna).',
    );
    process.exit(1);
  }

  if (password.length < MIN_ADMIN_PASSWORD_LENGTH || !PASSWORD_REGEX.test(password)) {
    console.error(
      `ADMIN_PASSWORD debe tener al menos ${MIN_ADMIN_PASSWORD_LENGTH} caracteres e incluir ` +
        'mayuscula, minuscula, numero y un caracter especial (@$!%*?&#=).',
    );
    process.exit(1);
  }

  if (!PHONE_REGEX.test(phone)) {
    console.error('ADMIN_PHONE debe ser un telefono boliviano valido (+591XXXXXXXX).');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Ya existe una cuenta para ${email} (rol actual: ${existing.role}) — no se toca.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.create({
    data: {
      email,
      phone,
      passwordHash,
      fullName,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
    },
  });

  console.log(`Cuenta admin creada: ${admin.email} (id: ${admin.id}).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
