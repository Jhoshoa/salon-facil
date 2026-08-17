-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'OWNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION');

-- CreateEnum
CREATE TYPE "VenueStatus" AS ENUM ('DRAFT', 'PENDING', 'ACTIVE', 'INACTIVE', 'REJECTED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'APPROVED', 'DEPOSIT_PAID', 'FULLY_PAID', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_OWNER', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('DEPOSIT', 'FULL', 'REMAINING');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('QR_BANK', 'BANK_TRANSFER', 'TIGO_MONEY', 'CARD', 'CASH');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "PriceType" AS ENUM ('BASE', 'WEEKEND', 'HOLIDAY', 'CUSTOM_DATE', 'SEASON_HIGH', 'EARLY_BIRD');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BOOKING_REQUEST', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'PAYMENT_RECEIVED', 'REMINDER_7_DAYS', 'REMINDER_3_DAYS', 'REMINDER_1_DAY', 'REVIEW_REQUEST', 'WELCOME');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('WHATSAPP', 'EMAIL', 'PUSH');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "avatar_url" TEXT,
    "city" TEXT,
    "district" TEXT,
    "email_verified_at" TIMESTAMP(3),
    "phone_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venues" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "short_description" VARCHAR(255),
    "address" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'El Alto',
    "state" TEXT NOT NULL DEFAULT 'La Paz',
    "country" TEXT NOT NULL DEFAULT 'Bolivia',
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "capacity_min" INTEGER NOT NULL DEFAULT 0,
    "capacity_max" INTEGER NOT NULL,
    "square_meters" INTEGER,
    "photos" JSONB NOT NULL DEFAULT '[]',
    "video_url" TEXT,
    "rules" TEXT,
    "cancellation_policy" TEXT,
    "status" "VenueStatus" NOT NULL DEFAULT 'DRAFT',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "verified_by_id" TEXT,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "featured_until" TIMESTAMP(3),
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "booking_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venue_services" (
    "id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "is_included" BOOLEAN NOT NULL DEFAULT true,
    "extra_cost" DECIMAL(12,2),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "venue_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venue_prices" (
    "id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,
    "price_type" "PriceType" NOT NULL,
    "day_of_week" INTEGER,
    "specific_date" DATE,
    "start_date" DATE,
    "end_date" DATE,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BOB',
    "discount_percent" DECIMAL(5,2),
    "discount_label" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "venue_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_date" DATE NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "guest_count" INTEGER NOT NULL,
    "base_price" DECIMAL(12,2) NOT NULL,
    "applied_price" DECIMAL(12,2) NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,
    "deposit_amount" DECIMAL(12,2) NOT NULL,
    "deposit_paid" BOOLEAN NOT NULL DEFAULT false,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "special_requests" TEXT,
    "contract_url" TEXT,
    "contract_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_type" "PaymentType" NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "comprobante_url" TEXT,
    "comprobante_uploaded_at" TIMESTAMP(3),
    "confirmed_by_owner_id" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "notes" TEXT,
    "stripe_payment_intent_id" TEXT,
    "stripe_charge_id" TEXT,
    "transaction_reference" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_blocks" (
    "id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "reason" TEXT,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurring_rule" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "calendar_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "users_phone_idx" ON "users"("phone");
CREATE INDEX "users_role_idx" ON "users"("role");
CREATE INDEX "users_status_idx" ON "users"("status");
CREATE UNIQUE INDEX "venues_slug_key" ON "venues"("slug");
CREATE INDEX "venues_owner_id_idx" ON "venues"("owner_id");
CREATE INDEX "venues_slug_idx" ON "venues"("slug");
CREATE INDEX "venues_city_idx" ON "venues"("city");
CREATE INDEX "venues_district_idx" ON "venues"("district");
CREATE INDEX "venues_status_idx" ON "venues"("status");
CREATE INDEX "venues_is_featured_idx" ON "venues"("is_featured");
CREATE INDEX "venues_latitude_longitude_idx" ON "venues"("latitude", "longitude");
CREATE INDEX "venue_services_venue_id_idx" ON "venue_services"("venue_id");
CREATE INDEX "venue_prices_venue_id_idx" ON "venue_prices"("venue_id");
CREATE INDEX "venue_prices_price_type_idx" ON "venue_prices"("price_type");
CREATE INDEX "venue_prices_specific_date_idx" ON "venue_prices"("specific_date");
CREATE INDEX "venue_prices_start_date_end_date_idx" ON "venue_prices"("start_date", "end_date");
CREATE INDEX "bookings_venue_id_idx" ON "bookings"("venue_id");
CREATE INDEX "bookings_client_id_idx" ON "bookings"("client_id");
CREATE INDEX "bookings_event_date_idx" ON "bookings"("event_date");
CREATE INDEX "bookings_status_idx" ON "bookings"("status");
CREATE INDEX "bookings_venue_id_event_date_idx" ON "bookings"("venue_id", "event_date");
CREATE INDEX "payments_booking_id_idx" ON "payments"("booking_id");
CREATE INDEX "payments_status_idx" ON "payments"("status");
CREATE INDEX "payments_method_idx" ON "payments"("method");
CREATE UNIQUE INDEX "calendar_blocks_venue_id_date_key" ON "calendar_blocks"("venue_id", "date");
CREATE INDEX "calendar_blocks_venue_id_idx" ON "calendar_blocks"("venue_id");
CREATE INDEX "calendar_blocks_date_idx" ON "calendar_blocks"("date");
CREATE UNIQUE INDEX "reviews_booking_id_key" ON "reviews"("booking_id");
CREATE INDEX "reviews_venue_id_idx" ON "reviews"("venue_id");
CREATE INDEX "reviews_client_id_idx" ON "reviews"("client_id");
CREATE INDEX "reviews_booking_id_idx" ON "reviews"("booking_id");
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");
CREATE INDEX "notifications_type_idx" ON "notifications"("type");
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- AddForeignKey
ALTER TABLE "venues" ADD CONSTRAINT "venues_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "venues" ADD CONSTRAINT "venues_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "venue_services" ADD CONSTRAINT "venue_services_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "venue_prices" ADD CONSTRAINT "venue_prices_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_confirmed_by_owner_id_fkey" FOREIGN KEY ("confirmed_by_owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "calendar_blocks" ADD CONSTRAINT "calendar_blocks_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
