import {
  AmenityCategory,
  BookingStatus,
  NotificationChannel,
  NotificationType,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  PrismaClient,
  PriceUnit,
  PriceType,
  UserRole,
  UserStatus,
  VenueMediaType,
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
  await prisma.venueMedia.deleteMany();
  await prisma.venueOpeningHour.deleteMany();
  await prisma.venueUse.deleteMany();
  await prisma.venueAmenity.deleteMany();
  await prisma.amenity.deleteMany();
  await prisma.venuePrice.deleteMany();
  await prisma.venueService.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.spaceType.deleteMany();
  await prisma.useType.deleteMany();
  await prisma.user.deleteMany();
}

const time = (value: string) => new Date(`1970-01-01T${value}:00.000Z`);

const createWeeklyHours = (venueId: string, opensAt = '08:00', closesAt = '02:00') => {
  return Array.from({ length: 7 }).map((_, dayOfWeek) => ({
    venueId,
    dayOfWeek,
    opensAt: time(opensAt),
    closesAt: time(closesAt),
    isClosed: false,
  }));
};

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

  const spaceTypeSeed = [
    { key: 'EVENT_HALL', name: 'Salon de eventos', icon: 'Building2', sortOrder: 1 },
    { key: 'GARDEN', name: 'Jardin', icon: 'Trees', sortOrder: 2 },
    { key: 'TERRACE', name: 'Terraza', icon: 'Sun', sortOrder: 3 },
    { key: 'RESTAURANT', name: 'Restaurante', icon: 'UtensilsCrossed', sortOrder: 4 },
    { key: 'BAR', name: 'Bar', icon: 'Wine', sortOrder: 5 },
    { key: 'AUDITORIUM', name: 'Auditorio', icon: 'Presentation', sortOrder: 6 },
    { key: 'CONFERENCE_ROOM', name: 'Sala de reuniones', icon: 'Users', sortOrder: 7 },
    { key: 'PHOTO_STUDIO', name: 'Estudio fotografico', icon: 'Camera', sortOrder: 8 },
    { key: 'MULTIPURPOSE', name: 'Multiproposito', icon: 'LayoutGrid', sortOrder: 9 },
    { key: 'OUTDOOR_SPACE', name: 'Espacio exterior', icon: 'MapPin', sortOrder: 10 },
  ];

  await prisma.spaceType.createMany({ data: spaceTypeSeed });
  const spaceTypes = await prisma.spaceType.findMany();
  const spaceTypeByKey = new Map(spaceTypes.map((item) => [item.key, item.id]));
  const getSpaceTypeId = (key: string) => {
    const id = spaceTypeByKey.get(key);
    if (!id) throw new Error(`Missing space type '${key}'`);
    return id;
  };

  const useTypeSeed = [
    { key: 'WEDDING', name: 'Boda', icon: 'Heart', sortOrder: 1 },
    { key: 'BIRTHDAY', name: 'Cumpleanos', icon: 'PartyPopper', sortOrder: 2 },
    { key: 'CORPORATE_EVENT', name: 'Corporativo', icon: 'Briefcase', sortOrder: 3 },
    { key: 'PRIVATE_PARTY', name: 'Fiesta privada', icon: 'Sparkles', sortOrder: 4 },
    { key: 'GRADUATION', name: 'Graduacion', icon: 'GraduationCap', sortOrder: 5 },
    { key: 'CONFERENCE', name: 'Conferencia', icon: 'Presentation', sortOrder: 6 },
    { key: 'WORKSHOP', name: 'Workshop', icon: 'Wrench', sortOrder: 7 },
    { key: 'PHOTO_SHOOT', name: 'Sesion de fotos', icon: 'Camera', sortOrder: 8 },
    { key: 'FILMING', name: 'Rodaje', icon: 'Video', sortOrder: 9 },
    { key: 'POP_UP', name: 'Pop up', icon: 'Store', sortOrder: 10 },
    { key: 'TEAM_BUILDING', name: 'Team building', icon: 'Users', sortOrder: 11 },
  ];

  await prisma.useType.createMany({ data: useTypeSeed });
  const useTypes = await prisma.useType.findMany();
  const useTypeByKey = new Map(useTypes.map((item) => [item.key, item.id]));
  const getUseTypeId = (key: string) => {
    const id = useTypeByKey.get(key);
    if (!id) throw new Error(`Missing use type '${key}'`);
    return id;
  };

  console.log('Created space type and use type catalogs');

  const amenitySeed = [
    {
      key: 'kitchen',
      name: 'Cocina equipada',
      category: AmenityCategory.FACILITY,
      icon: 'ChefHat',
      sortOrder: 1,
    },
    {
      key: 'bathrooms',
      name: 'Banos',
      category: AmenityCategory.FACILITY,
      icon: 'Bath',
      sortOrder: 2,
    },
    {
      key: 'stage',
      name: 'Escenario',
      category: AmenityCategory.FACILITY,
      icon: 'Mic2',
      sortOrder: 3,
    },
    {
      key: 'garden',
      name: 'Jardin',
      category: AmenityCategory.FACILITY,
      icon: 'Trees',
      sortOrder: 4,
    },
    {
      key: 'terrace',
      name: 'Terraza',
      category: AmenityCategory.FACILITY,
      icon: 'Sun',
      sortOrder: 5,
    },
    { key: 'wifi', name: 'Wi-Fi', category: AmenityCategory.COMFORT, icon: 'Wifi', sortOrder: 10 },
    {
      key: 'air-conditioning',
      name: 'Aire acondicionado',
      category: AmenityCategory.COMFORT,
      icon: 'Snowflake',
      sortOrder: 11,
    },
    {
      key: 'furniture',
      name: 'Mobiliario',
      category: AmenityCategory.COMFORT,
      icon: 'Armchair',
      sortOrder: 12,
    },
    {
      key: 'natural-light',
      name: 'Luz natural',
      category: AmenityCategory.COMFORT,
      icon: 'SunMedium',
      sortOrder: 13,
    },
    {
      key: 'sound-system',
      name: 'Equipo de sonido',
      category: AmenityCategory.AUDIO_VISUAL,
      icon: 'Speaker',
      sortOrder: 20,
    },
    {
      key: 'microphones',
      name: 'Microfonos',
      category: AmenityCategory.AUDIO_VISUAL,
      icon: 'Mic',
      sortOrder: 21,
    },
    {
      key: 'projector',
      name: 'Proyector',
      category: AmenityCategory.AUDIO_VISUAL,
      icon: 'Projector',
      sortOrder: 22,
    },
    {
      key: 'professional-lighting',
      name: 'Iluminacion profesional',
      category: AmenityCategory.AUDIO_VISUAL,
      icon: 'Lightbulb',
      sortOrder: 23,
    },
    {
      key: 'in-house-catering',
      name: 'Catering propio',
      category: AmenityCategory.CATERING_DRINKS,
      icon: 'Utensils',
      sortOrder: 30,
    },
    {
      key: 'external-catering',
      name: 'Permite catering externo',
      category: AmenityCategory.CATERING_DRINKS,
      icon: 'Truck',
      sortOrder: 31,
    },
    {
      key: 'alcohol-allowed',
      name: 'Permite bebidas alcoholicas',
      category: AmenityCategory.CATERING_DRINKS,
      icon: 'Wine',
      sortOrder: 32,
    },
    {
      key: 'bar',
      name: 'Barra incluida',
      category: AmenityCategory.CATERING_DRINKS,
      icon: 'Wine',
      sortOrder: 33,
    },
    {
      key: 'private-parking',
      name: 'Parqueo privado',
      category: AmenityCategory.PARKING,
      icon: 'Car',
      sortOrder: 40,
    },
    {
      key: 'car-parking',
      name: 'Parqueo para autos',
      category: AmenityCategory.PARKING,
      icon: 'ParkingCircle',
      sortOrder: 41,
    },
    {
      key: 'wheelchair-access',
      name: 'Acceso silla de ruedas',
      category: AmenityCategory.ACCESSIBILITY,
      icon: 'Accessibility',
      sortOrder: 50,
    },
    {
      key: 'independent-entry',
      name: 'Entrada independiente',
      category: AmenityCategory.ACCESSIBILITY,
      icon: 'DoorOpen',
      sortOrder: 51,
    },
    {
      key: 'security',
      name: 'Seguridad',
      category: AmenityCategory.SAFETY,
      icon: 'ShieldCheck',
      sortOrder: 60,
    },
  ];

  await prisma.amenity.createMany({ data: amenitySeed });
  const amenities = await prisma.amenity.findMany();
  const amenityByKey = new Map(amenities.map((amenity) => [amenity.key, amenity.id]));

  console.log('Created amenity catalog');

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
      spaceTypeId: getSpaceTypeId('EVENT_HALL'),
      minimumHours: 6,
      priceUnit: PriceUnit.EVENT,
      instantBooking: false,
      allowsMultipleDays: false,
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
      spaceTypeId: getSpaceTypeId('MULTIPURPOSE'),
      minimumHours: 4,
      priceUnit: PriceUnit.EVENT,
      instantBooking: false,
      allowsMultipleDays: false,
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
      spaceTypeId: getSpaceTypeId('GARDEN'),
      minimumHours: 8,
      priceUnit: PriceUnit.EVENT,
      instantBooking: false,
      allowsMultipleDays: true,
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

  const venueMirador = await prisma.venue.create({
    data: {
      ownerId: ownerLuis.id,
      name: 'Terraza Mirador Andino',
      slug: 'terraza-mirador-andino-sopocachi',
      description:
        'Terraza panoramica para cocteles, eventos corporativos, lanzamientos de marca y celebraciones privadas con vista a la ciudad.',
      shortDescription: 'Terraza panoramica para eventos sociales y corporativos.',
      address: 'Av. 20 de Octubre 2040',
      district: 'Sopocachi',
      city: 'La Paz',
      latitude: -16.508154,
      longitude: -68.126745,
      capacityMin: 30,
      capacityMax: 140,
      squareMeters: 320,
      spaceTypeId: getSpaceTypeId('TERRACE'),
      minimumHours: 4,
      priceUnit: PriceUnit.HOUR,
      instantBooking: true,
      allowsMultipleDays: false,
      photos: [
        'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/mirador-1.jpg',
        'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/mirador-2.jpg',
        'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/mirador-3.jpg',
      ],
      rules: 'Volumen moderado desde las 23:00. No se permite pirotecnia ni humo artificial.',
      cancellationPolicy: 'Cancelacion sin penalidad hasta 10 dias antes del evento.',
      status: VenueStatus.ACTIVE,
      isVerified: true,
      verifiedAt: new Date(),
      verifiedById: admin.id,
      isFeatured: true,
      featuredUntil: new Date('2026-11-30'),
      viewCount: 285,
      bookingCount: 9,
    },
  });

  const venueEstudio = await prisma.venue.create({
    data: {
      ownerId: ownerMario.id,
      name: 'Estudio Creativo Calacoto',
      slug: 'estudio-creativo-calacoto',
      description:
        'Estudio luminoso para sesiones de fotos, workshops, pop ups, grabaciones y reuniones creativas con luz natural y mobiliario flexible.',
      shortDescription: 'Estudio luminoso para producciones y workshops.',
      address: 'Calle 21 de Calacoto 812',
      district: 'Calacoto',
      city: 'La Paz',
      latitude: -16.541204,
      longitude: -68.081982,
      capacityMin: 10,
      capacityMax: 70,
      squareMeters: 180,
      spaceTypeId: getSpaceTypeId('PHOTO_STUDIO'),
      minimumHours: 3,
      priceUnit: PriceUnit.HOUR,
      instantBooking: true,
      allowsMultipleDays: true,
      photos: [
        'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/estudio-1.jpg',
        'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/estudio-2.jpg',
        'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/estudio-3.jpg',
      ],
      rules:
        'Se permite mover mobiliario con supervision. No se permite pintar paredes sin autorizacion.',
      cancellationPolicy: 'Reprogramacion gratuita con 72 horas de anticipacion.',
      status: VenueStatus.ACTIVE,
      isVerified: true,
      verifiedAt: new Date(),
      verifiedById: admin.id,
      viewCount: 198,
      bookingCount: 7,
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
      { venueId: venueMirador.id, name: 'Terraza panoramica', icon: 'Sun', sortOrder: 1 },
      { venueId: venueMirador.id, name: 'Barra movil', icon: 'Wine', sortOrder: 2 },
      { venueId: venueMirador.id, name: 'Iluminacion ambiental', icon: 'Lightbulb', sortOrder: 3 },
      { venueId: venueMirador.id, name: 'Parqueo cercano', icon: 'Car', sortOrder: 4 },
      { venueId: venueEstudio.id, name: 'Luz natural', icon: 'SunMedium', sortOrder: 1 },
      { venueId: venueEstudio.id, name: 'Mobiliario flexible', icon: 'Armchair', sortOrder: 2 },
      { venueId: venueEstudio.id, name: 'Wifi', icon: 'Wifi', sortOrder: 3 },
      { venueId: venueEstudio.id, name: 'Equipo de sonido', icon: 'Speaker', sortOrder: 4 },
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
      { venueId: venueMirador.id, priceType: PriceType.BASE, price: 450 },
      { venueId: venueMirador.id, priceType: PriceType.WEEKEND, dayOfWeek: 5, price: 560 },
      { venueId: venueMirador.id, priceType: PriceType.WEEKEND, dayOfWeek: 6, price: 560 },
      { venueId: venueEstudio.id, priceType: PriceType.BASE, price: 280 },
      { venueId: venueEstudio.id, priceType: PriceType.WEEKEND, dayOfWeek: 6, price: 350 },
    ],
  });

  console.log('Created services and prices');

  const getAmenityId = (key: string) => {
    const id = amenityByKey.get(key);
    if (!id) throw new Error(`Missing amenity '${key}'`);
    return id;
  };

  await prisma.venueAmenity.createMany({
    data: [
      ...[
        'kitchen',
        'bathrooms',
        'stage',
        'furniture',
        'sound-system',
        'private-parking',
        'security',
      ].map((key) => ({
        venueId: venueImperial.id,
        amenityId: getAmenityId(key),
      })),
      {
        venueId: venueImperial.id,
        amenityId: getAmenityId('professional-lighting'),
        isIncluded: false,
        extraCost: 250,
      },
      ...['kitchen', 'bathrooms', 'wifi', 'furniture', 'external-catering'].map((key) => ({
        venueId: venueFiesta.id,
        amenityId: getAmenityId(key),
      })),
      ...[
        'kitchen',
        'bathrooms',
        'garden',
        'bar',
        'sound-system',
        'microphones',
        'private-parking',
        'alcohol-allowed',
        'security',
      ].map((key) => ({
        venueId: venuePinos.id,
        amenityId: getAmenityId(key),
      })),
      ...[
        'terrace',
        'bar',
        'professional-lighting',
        'sound-system',
        'external-catering',
        'alcohol-allowed',
      ].map((key) => ({
        venueId: venueMirador.id,
        amenityId: getAmenityId(key),
      })),
      ...[
        'natural-light',
        'wifi',
        'furniture',
        'projector',
        'sound-system',
        'independent-entry',
      ].map((key) => ({
        venueId: venueEstudio.id,
        amenityId: getAmenityId(key),
      })),
    ],
  });

  await prisma.venueUse.createMany({
    data: [
      { venueId: venueImperial.id, useTypeId: getUseTypeId('WEDDING'), isPrimary: true },
      { venueId: venueImperial.id, useTypeId: getUseTypeId('BIRTHDAY') },
      { venueId: venueImperial.id, useTypeId: getUseTypeId('GRADUATION') },
      { venueId: venueFiesta.id, useTypeId: getUseTypeId('BIRTHDAY'), isPrimary: true },
      { venueId: venueFiesta.id, useTypeId: getUseTypeId('PRIVATE_PARTY') },
      { venueId: venuePinos.id, useTypeId: getUseTypeId('WEDDING'), isPrimary: true },
      { venueId: venuePinos.id, useTypeId: getUseTypeId('CORPORATE_EVENT') },
      { venueId: venuePinos.id, useTypeId: getUseTypeId('PRIVATE_PARTY') },
      { venueId: venueMirador.id, useTypeId: getUseTypeId('CORPORATE_EVENT'), isPrimary: true },
      { venueId: venueMirador.id, useTypeId: getUseTypeId('PRIVATE_PARTY') },
      { venueId: venueMirador.id, useTypeId: getUseTypeId('POP_UP') },
      { venueId: venueEstudio.id, useTypeId: getUseTypeId('PHOTO_SHOOT'), isPrimary: true },
      { venueId: venueEstudio.id, useTypeId: getUseTypeId('FILMING') },
      { venueId: venueEstudio.id, useTypeId: getUseTypeId('WORKSHOP') },
      { venueId: venueEstudio.id, useTypeId: getUseTypeId('POP_UP') },
    ],
  });

  await prisma.venueOpeningHour.createMany({
    data: [
      ...createWeeklyHours(venueImperial.id, '09:00', '02:00'),
      ...createWeeklyHours(venueFiesta.id, '10:00', '01:00'),
      ...createWeeklyHours(venuePinos.id, '08:00', '03:00'),
      ...createWeeklyHours(venueMirador.id, '10:00', '00:00'),
      ...createWeeklyHours(venueEstudio.id, '08:00', '22:00'),
    ],
  });

  await prisma.venueMedia.createMany({
    data: [
      ...[
        [
          'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/imperial-1.jpg',
          'Salon Imperial principal',
        ],
        [
          'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/imperial-2.jpg',
          'Salon Imperial escenario',
        ],
        [
          'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/imperial-3.jpg',
          'Salon Imperial montaje',
        ],
      ].map(([url, alt], index) => ({
        venueId: venueImperial.id,
        type: VenueMediaType.IMAGE,
        url,
        alt,
        sortOrder: index,
        isCover: index === 0,
      })),
      ...[
        [
          'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/fiesta-1.jpg',
          'Espacio Fiesta salon',
        ],
        [
          'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/fiesta-2.jpg',
          'Espacio Fiesta mesas',
        ],
      ].map(([url, alt], index) => ({
        venueId: venueFiesta.id,
        type: VenueMediaType.IMAGE,
        url,
        alt,
        sortOrder: index,
        isCover: index === 0,
      })),
      ...[
        [
          'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/pinos-1.jpg',
          'Jardin Los Pinos exterior',
        ],
        [
          'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/pinos-2.jpg',
          'Jardin Los Pinos salon',
        ],
        [
          'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/pinos-3.jpg',
          'Jardin Los Pinos barra',
        ],
        [
          'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/pinos-4.jpg',
          'Jardin Los Pinos montaje',
        ],
      ].map(([url, alt], index) => ({
        venueId: venuePinos.id,
        type: VenueMediaType.IMAGE,
        url,
        alt,
        sortOrder: index,
        isCover: index === 0,
      })),
      ...[
        [
          'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/mirador-1.jpg',
          'Terraza Mirador vista',
        ],
        [
          'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/mirador-2.jpg',
          'Terraza Mirador barra',
        ],
        [
          'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/mirador-3.jpg',
          'Terraza Mirador evento',
        ],
      ].map(([url, alt], index) => ({
        venueId: venueMirador.id,
        type: VenueMediaType.IMAGE,
        url,
        alt,
        sortOrder: index,
        isCover: index === 0,
      })),
      ...[
        [
          'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/estudio-1.jpg',
          'Estudio Creativo luz natural',
        ],
        [
          'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/estudio-2.jpg',
          'Estudio Creativo workshop',
        ],
        [
          'https://res.cloudinary.com/demo/image/upload/v1/salonfacil/estudio-3.jpg',
          'Estudio Creativo montaje',
        ],
      ].map(([url, alt], index) => ({
        venueId: venueEstudio.id,
        type: VenueMediaType.IMAGE,
        url,
        alt,
        sortOrder: index,
        isCover: index === 0,
      })),
    ],
  });

  console.log('Created advanced catalog data');

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
