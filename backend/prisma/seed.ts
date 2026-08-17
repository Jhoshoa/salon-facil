import {
  BookingStatus,
  NotificationChannel,
  NotificationType,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  PrismaClient,
  PriceType,
  UserRole,
  UserStatus,
  VenueStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function cleanDatabase(): Promise<void> {
  await prisma.refreshToken.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.calendarBlock.deleteMany();
  await prisma.venuePrice.deleteMany();
  await prisma.venueService.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.user.deleteMany();
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed data must not run in production');
  }

  console.log('Starting seed...');
  await cleanDatabase();
  console.log('Database cleaned');

  const passwordHash = await bcrypt.hash('Password123!', 12);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@salonfacil.bo',
      phone: '+59177777777',
      passwordHash,
      fullName: 'Administrador SalonFacil',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      city: 'El Alto',
      district: 'Ciudad Satelite',
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
    },
  });

  const ownerMario = await prisma.user.create({
    data: {
      email: 'mario.quispe@email.com',
      phone: '+59171234567',
      passwordHash,
      fullName: 'Mario Quispe Mamani',
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
      city: 'El Alto',
      district: 'Villa Adela',
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
    },
  });

  const ownerRosa = await prisma.user.create({
    data: {
      email: 'rosa.choque@email.com',
      phone: '+59172345678',
      passwordHash,
      fullName: 'Rosa Choque Flores',
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
      city: 'El Alto',
      district: 'Rio Seco',
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
    },
  });

  const ownerLuis = await prisma.user.create({
    data: {
      email: 'luis.condori@email.com',
      phone: '+59173456789',
      passwordHash,
      fullName: 'Luis Condori Apaza',
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
      city: 'La Paz',
      district: 'Achumani',
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
    },
  });

  const clientAna = await prisma.user.create({
    data: {
      email: 'cliente1@email.com',
      phone: '+59174567890',
      passwordHash,
      fullName: 'Ana Laura Mendoza',
      role: UserRole.CLIENT,
      status: UserStatus.ACTIVE,
      city: 'El Alto',
      district: 'Senkata',
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
    },
  });

  const clientPedro = await prisma.user.create({
    data: {
      email: 'cliente2@email.com',
      phone: '+59175678901',
      passwordHash,
      fullName: 'Pedro Vargas Lima',
      role: UserRole.CLIENT,
      status: UserStatus.ACTIVE,
      city: 'La Paz',
      district: 'Miraflores',
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
    },
  });

  console.log('Created users');

  const venueImperial = await prisma.venue.create({
    data: {
      ownerId: ownerMario.id,
      name: 'Salon Imperial',
      slug: 'salon-imperial-villa-adela',
      description:
        'Salon amplio para bodas, quinceaneras y promociones, con escenario, cocina equipada y parqueo propio.',
      shortDescription: 'Salon elegante con escenario y parqueo.',
      address: 'Av. Bolivia 1234',
      district: 'Villa Adela',
      latitude: -16.518391,
      longitude: -68.167649,
      capacityMin: 80,
      capacityMax: 250,
      squareMeters: 480,
      photos: [
        'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/imperial-1.jpg',
        'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/imperial-2.jpg',
        'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/imperial-3.jpg',
      ],
      rules: 'Musica hasta las 2:00 AM. No se permite pirotecnia dentro del salon.',
      cancellationPolicy: 'Reserva reembolsable hasta 30 dias antes del evento.',
      status: VenueStatus.ACTIVE,
      isVerified: true,
      verifiedAt: new Date(),
      verifiedById: admin.id,
      isFeatured: true,
      featuredUntil: new Date('2026-10-31'),
      viewCount: 420,
      bookingCount: 32,
    },
  });

  const venueFiesta = await prisma.venue.create({
    data: {
      ownerId: ownerRosa.id,
      name: 'Espacio Fiesta',
      slug: 'espacio-fiesta-rio-seco',
      description:
        'Local practico para cumpleanos, bautizos y reuniones familiares. Ubicado cerca de transporte publico.',
      shortDescription: 'Local familiar y accesible.',
      address: 'Calle 8 de Rio Seco 456',
      district: 'Rio Seco',
      latitude: -16.477215,
      longitude: -68.195423,
      capacityMin: 40,
      capacityMax: 120,
      squareMeters: 260,
      photos: [
        'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/fiesta-1.jpg',
        'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/fiesta-2.jpg',
      ],
      rules: 'Musica hasta la 1:00 AM. Se entrega inventario al inicio y cierre.',
      cancellationPolicy: 'Cambio de fecha sujeto a disponibilidad con 15 dias de aviso.',
      status: VenueStatus.ACTIVE,
      isVerified: true,
      verifiedAt: new Date(),
      verifiedById: admin.id,
      viewCount: 175,
      bookingCount: 14,
    },
  });

  const venuePinos = await prisma.venue.create({
    data: {
      ownerId: ownerLuis.id,
      name: 'Jardin Los Pinos',
      slug: 'jardin-los-pinos-achumani',
      description:
        'Salon premium con jardin exterior, barra, cocina industrial y ambientes separados para ceremonia y recepcion.',
      shortDescription: 'Salon premium con jardin exterior.',
      address: 'Calle Los Pinos 88',
      district: 'Achumani',
      city: 'La Paz',
      latitude: -16.54081,
      longitude: -68.07421,
      capacityMin: 100,
      capacityMax: 300,
      squareMeters: 720,
      photos: [
        'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/pinos-1.jpg',
        'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/pinos-2.jpg',
        'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/pinos-3.jpg',
        'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/pinos-4.jpg',
      ],
      rules: 'Musica hasta las 3:00 AM. No se permite ingreso de bebidas sin coordinacion previa.',
      cancellationPolicy: 'Anticipo no reembolsable. Reprogramacion con 45 dias de anticipacion.',
      status: VenueStatus.ACTIVE,
      isVerified: true,
      verifiedAt: new Date(),
      verifiedById: admin.id,
      viewCount: 610,
      bookingCount: 21,
    },
  });

  console.log('Created venues');

  await prisma.venueService.createMany({
    data: [
      { venueId: venueImperial.id, name: 'Sillas', icon: 'Armchair', sortOrder: 1 },
      { venueId: venueImperial.id, name: 'Mesas redondas', icon: 'Table', sortOrder: 2 },
      { venueId: venueImperial.id, name: 'Cocina equipada', icon: 'ChefHat', sortOrder: 3 },
      { venueId: venueImperial.id, name: 'Estacionamiento', icon: 'Car', sortOrder: 4 },
      { venueId: venueImperial.id, name: 'Sonido profesional', icon: 'Speaker', sortOrder: 5 },
      {
        venueId: venueImperial.id,
        name: 'Decoracion basica',
        icon: 'Palette',
        isIncluded: false,
        extraCost: 350,
        sortOrder: 6,
      },
      { venueId: venueFiesta.id, name: 'Sillas', icon: 'Armchair', sortOrder: 1 },
      { venueId: venueFiesta.id, name: 'Mesas', icon: 'Table', sortOrder: 2 },
      { venueId: venueFiesta.id, name: 'Cocina', icon: 'ChefHat', sortOrder: 3 },
      { venueId: venueFiesta.id, name: 'Wifi', icon: 'Wifi', sortOrder: 4 },
      { venueId: venuePinos.id, name: 'Sillas', icon: 'Armchair', sortOrder: 1 },
      { venueId: venuePinos.id, name: 'Mesas redondas', icon: 'Table', sortOrder: 2 },
      { venueId: venuePinos.id, name: 'Cocina industrial', icon: 'ChefHat', sortOrder: 3 },
      { venueId: venuePinos.id, name: 'Jardin exterior', icon: 'TreePine', sortOrder: 4 },
      { venueId: venuePinos.id, name: 'Barra de bar', icon: 'Wine', sortOrder: 5 },
      {
        venueId: venuePinos.id,
        name: 'Sonido y DJ',
        icon: 'Music',
        isIncluded: false,
        extraCost: 500,
        sortOrder: 6,
      },
    ],
  });

  await prisma.venuePrice.createMany({
    data: [
      { venueId: venueImperial.id, priceType: PriceType.BASE, price: 1200 },
      { venueId: venueImperial.id, priceType: PriceType.WEEKEND, dayOfWeek: 5, price: 1560 },
      { venueId: venueImperial.id, priceType: PriceType.WEEKEND, dayOfWeek: 6, price: 1560 },
      { venueId: venueImperial.id, priceType: PriceType.WEEKEND, dayOfWeek: 0, price: 1560 },
      {
        venueId: venueImperial.id,
        priceType: PriceType.SEASON_HIGH,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-10-15'),
        price: 1800,
      },
      {
        venueId: venueImperial.id,
        priceType: PriceType.EARLY_BIRD,
        price: 1080,
        discountPercent: 10,
        discountLabel: 'Reserva anticipada',
      },
      { venueId: venueFiesta.id, priceType: PriceType.BASE, price: 800 },
      { venueId: venueFiesta.id, priceType: PriceType.WEEKEND, dayOfWeek: 5, price: 1000 },
      { venueId: venueFiesta.id, priceType: PriceType.WEEKEND, dayOfWeek: 6, price: 1000 },
      {
        venueId: venueFiesta.id,
        priceType: PriceType.SEASON_HIGH,
        startDate: new Date('2026-12-15'),
        endDate: new Date('2027-01-05'),
        price: 1280,
      },
      { venueId: venuePinos.id, priceType: PriceType.BASE, price: 2000 },
      { venueId: venuePinos.id, priceType: PriceType.WEEKEND, dayOfWeek: 5, price: 2600 },
      { venueId: venuePinos.id, priceType: PriceType.WEEKEND, dayOfWeek: 6, price: 2600 },
      {
        venueId: venuePinos.id,
        priceType: PriceType.SEASON_HIGH,
        startDate: new Date('2026-12-15'),
        endDate: new Date('2027-01-05'),
        price: 3200,
      },
    ],
  });

  console.log('Created services and prices');

  const bookingQuince = await prisma.booking.create({
    data: {
      venueId: venueImperial.id,
      clientId: clientAna.id,
      eventType: 'Quinceanera',
      eventDate: new Date('2026-09-15'),
      startTime: new Date('1970-01-01T18:00:00.000Z'),
      endTime: new Date('1970-01-01T02:00:00.000Z'),
      guestCount: 200,
      basePrice: 1800,
      appliedPrice: 1800,
      totalPrice: 1800,
      depositAmount: 540,
      depositPaid: true,
      status: BookingStatus.DEPOSIT_PAID,
      specialRequests: 'Espacio para ceremonia de coronacion y mesa para padrinos.',
    },
  });

  const bookingBirthday = await prisma.booking.create({
    data: {
      venueId: venueFiesta.id,
      clientId: clientPedro.id,
      eventType: 'Cumpleanos',
      eventDate: new Date('2026-08-20'),
      startTime: new Date('1970-01-01T19:00:00.000Z'),
      endTime: new Date('1970-01-01T01:00:00.000Z'),
      guestCount: 80,
      basePrice: 800,
      appliedPrice: 800,
      totalPrice: 800,
      depositAmount: 240,
      depositPaid: true,
      status: BookingStatus.COMPLETED,
      specialRequests: 'Decoracion tematica para nino de 8 anos.',
    },
  });

  const bookingWedding = await prisma.booking.create({
    data: {
      venueId: venuePinos.id,
      clientId: clientAna.id,
      eventType: 'Boda',
      eventDate: new Date('2026-12-20'),
      startTime: new Date('1970-01-01T17:00:00.000Z'),
      endTime: new Date('1970-01-01T03:00:00.000Z'),
      guestCount: 250,
      basePrice: 3200,
      appliedPrice: 3200,
      totalPrice: 3200,
      depositAmount: 960,
      depositPaid: false,
      status: BookingStatus.PENDING,
      specialRequests: 'Ceremonia civil en jardin y recepcion en salon principal.',
    },
  });

  await prisma.payment.createMany({
    data: [
      {
        bookingId: bookingQuince.id,
        amount: 540,
        paymentType: PaymentType.DEPOSIT,
        method: PaymentMethod.BANK_TRANSFER,
        status: PaymentStatus.COMPLETED,
        comprobanteUrl: 'https://res.cloudinary.com/demo/image/upload/v1/comprobantes/comp-001.jpg',
        comprobanteUploadedAt: new Date(),
        confirmedByOwnerId: ownerMario.id,
        confirmedAt: new Date(),
        transactionReference: 'TRX-2026-0001',
        paidAt: new Date(),
      },
      {
        bookingId: bookingBirthday.id,
        amount: 240,
        paymentType: PaymentType.DEPOSIT,
        method: PaymentMethod.QR_BANK,
        status: PaymentStatus.COMPLETED,
        comprobanteUrl: 'https://res.cloudinary.com/demo/image/upload/v1/comprobantes/comp-002.jpg',
        comprobanteUploadedAt: new Date(),
        confirmedByOwnerId: ownerRosa.id,
        confirmedAt: new Date(),
        transactionReference: 'QR-2026-0002',
        paidAt: new Date(),
      },
      {
        bookingId: bookingBirthday.id,
        amount: 560,
        paymentType: PaymentType.REMAINING,
        method: PaymentMethod.CASH,
        status: PaymentStatus.COMPLETED,
        confirmedByOwnerId: ownerRosa.id,
        confirmedAt: new Date(),
        paidAt: new Date(),
      },
    ],
  });

  await prisma.review.create({
    data: {
      venueId: venueFiesta.id,
      clientId: clientPedro.id,
      bookingId: bookingBirthday.id,
      rating: 5,
      comment: 'Local limpio, buena atencion y entrega puntual.',
      isVerified: true,
    },
  });

  await prisma.calendarBlock.createMany({
    data: [
      { venueId: venueImperial.id, date: new Date('2026-09-15'), reason: 'Reserva: Quinceanera' },
      { venueId: venueFiesta.id, date: new Date('2026-08-20'), reason: 'Reserva: Cumpleanos' },
      { venueId: venuePinos.id, date: new Date('2026-12-20'), reason: 'Reserva: Boda pendiente' },
      { venueId: venueImperial.id, date: new Date('2026-10-01'), reason: 'Mantenimiento general' },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: clientAna.id,
        type: NotificationType.BOOKING_CONFIRMED,
        channel: NotificationChannel.EMAIL,
        title: 'Reserva confirmada',
        content: 'Tu reserva en Salon Imperial fue confirmada.',
        sentAt: new Date(),
        deliveredAt: new Date(),
      },
      {
        userId: ownerLuis.id,
        type: NotificationType.BOOKING_REQUEST,
        channel: NotificationChannel.WHATSAPP,
        title: 'Nueva solicitud de reserva',
        content: 'Tienes una nueva solicitud para Jardin Los Pinos.',
        metadata: { bookingId: bookingWedding.id },
      },
    ],
  });

  console.log('Seed completed successfully');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
