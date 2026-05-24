-- Core schema: all Prisma models (runs after pgcrypto, before triggers migration).
-- Fixes P2021 "table does not exist" when only extension/trigger migrations were present.

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'SHOP', 'ADMIN');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('SI', 'EN');

-- CreateEnum
CREATE TYPE "IssueCategory" AS ENUM ('ENGINE_2_STROKE_REBUILD', 'ENGINE_4_STROKE_REBUILD', 'SUSPENSION_TUNING', 'BRAKE_REPAIR', 'ELECTRICAL_FAULT', 'DRIVE_ISSUE', 'TYRE_WORK', 'OTHER');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'INSPECTED', 'WAITING_FOR_PARTS', 'REPAIRED');

-- CreateEnum
CREATE TYPE "EngineType" AS ENUM ('TWO_STROKE', 'FOUR_STROKE', 'ELECTRIC');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('AVAILABLE', 'PENDING', 'SOLD');

-- CreateEnum
CREATE TYPE "ShopStatus" AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReviewTargetType" AS ENUM ('APPOINTMENT', 'PART');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "preferred_language" "Language" NOT NULL DEFAULT 'EN',
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "email_verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_bikes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "registration_plate" TEXT NOT NULL,
    "brand_id" UUID,
    "model" TEXT,
    "year" INTEGER,
    "engine_type" "EngineType",
    "owner_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_bikes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "service_bike_id" UUID NOT NULL,
    "issue_category" "IssueCategory" NOT NULL,
    "customer_message" TEXT,
    "pre_inspection_photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contact_phone" TEXT NOT NULL,
    "preferred_date" TIMESTAMPTZ(6) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "admin_notes" TEXT,
    "estimated_cost" DECIMAL(12,2),
    "final_cost" DECIMAL(12,2),
    "inspected_at" TIMESTAMPTZ(6),
    "repaired_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bikes_for_sale" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "seller_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "engine_type" "EngineType" NOT NULL,
    "mileage_km" INTEGER NOT NULL,
    "fuel_consumption" DECIMAL(6,2),
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'LKR',
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "whatsapp_number" TEXT,
    "phone_number" TEXT,
    "status" "ListingStatus" NOT NULL DEFAULT 'AVAILABLE',
    "is_mechanic_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bikes_for_sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mechanic_verifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "listing_id" UUID NOT NULL,
    "verified_by_admin_id" UUID NOT NULL,
    "inspection_notes" TEXT NOT NULL,
    "verified_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mechanic_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shops" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logo_url" TEXT,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "address" TEXT,
    "status" "ShopStatus" NOT NULL DEFAULT 'PENDING',
    "commission_rate" DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    "approved_at" TIMESTAMPTZ(6),
    "approved_by_admin_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "part_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spare_parts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shop_id" UUID NOT NULL,
    "brand_id" UUID,
    "category_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "compatible_bikes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'LKR',
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "spare_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'LKR',
    "payment_reference" TEXT,
    "shipping_address" JSONB,
    "placed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMPTZ(6),
    "refunded_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "part_id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "commission_rate" DECIMAL(5,2) NOT NULL,
    "commission_amount" DECIMAL(12,2) NOT NULL,
    "line_total" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "author_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "target_type" "ReviewTargetType" NOT NULL,
    "appointment_id" UUID,
    "part_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "brands_name_key" ON "brands"("name");

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "service_bikes_registration_plate_key" ON "service_bikes"("registration_plate");

-- CreateIndex
CREATE INDEX "service_bikes_owner_user_id_idx" ON "service_bikes"("owner_user_id");

-- CreateIndex
CREATE INDEX "service_bikes_brand_id_idx" ON "service_bikes"("brand_id");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE INDEX "appointments_customer_id_status_idx" ON "appointments"("customer_id", "status");

-- CreateIndex
CREATE INDEX "appointments_service_bike_id_idx" ON "appointments"("service_bike_id");

-- CreateIndex
CREATE INDEX "appointments_preferred_date_idx" ON "appointments"("preferred_date");

-- CreateIndex
CREATE INDEX "bikes_for_sale_status_idx" ON "bikes_for_sale"("status");

-- CreateIndex
CREATE INDEX "bikes_for_sale_brand_id_price_idx" ON "bikes_for_sale"("brand_id", "price");

-- CreateIndex
CREATE INDEX "bikes_for_sale_seller_id_idx" ON "bikes_for_sale"("seller_id");

-- CreateIndex
CREATE INDEX "bikes_for_sale_is_mechanic_verified_idx" ON "bikes_for_sale"("is_mechanic_verified");

-- CreateIndex
CREATE INDEX "bikes_for_sale_created_at_idx" ON "bikes_for_sale"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "mechanic_verifications_listing_id_key" ON "mechanic_verifications"("listing_id");

-- CreateIndex
CREATE INDEX "mechanic_verifications_verified_by_admin_id_idx" ON "mechanic_verifications"("verified_by_admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "shops_owner_user_id_key" ON "shops"("owner_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "shops_name_key" ON "shops"("name");

-- CreateIndex
CREATE UNIQUE INDEX "shops_slug_key" ON "shops"("slug");

-- CreateIndex
CREATE INDEX "shops_status_idx" ON "shops"("status");

-- CreateIndex
CREATE UNIQUE INDEX "part_categories_name_key" ON "part_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "part_categories_slug_key" ON "part_categories"("slug");

-- CreateIndex
CREATE INDEX "spare_parts_shop_id_is_active_idx" ON "spare_parts"("shop_id", "is_active");

-- CreateIndex
CREATE INDEX "spare_parts_brand_id_idx" ON "spare_parts"("brand_id");

-- CreateIndex
CREATE INDEX "spare_parts_category_id_idx" ON "spare_parts"("category_id");

-- CreateIndex
CREATE INDEX "spare_parts_is_active_price_idx" ON "spare_parts"("is_active", "price");

-- CreateIndex
CREATE UNIQUE INDEX "orders_payment_reference_key" ON "orders"("payment_reference");

-- CreateIndex
CREATE INDEX "orders_customer_id_created_at_idx" ON "orders"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_shop_id_created_at_idx" ON "order_items"("shop_id", "created_at");

-- CreateIndex
CREATE INDEX "reviews_appointment_id_idx" ON "reviews"("appointment_id");

-- CreateIndex
CREATE INDEX "reviews_part_id_idx" ON "reviews"("part_id");

-- CreateIndex
CREATE INDEX "reviews_rating_idx" ON "reviews"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_author_id_appointment_id_key" ON "reviews"("author_id", "appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_author_id_part_id_key" ON "reviews"("author_id", "part_id");

-- AddForeignKey
ALTER TABLE "service_bikes" ADD CONSTRAINT "service_bikes_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_bikes" ADD CONSTRAINT "service_bikes_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_bike_id_fkey" FOREIGN KEY ("service_bike_id") REFERENCES "service_bikes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bikes_for_sale" ADD CONSTRAINT "bikes_for_sale_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bikes_for_sale" ADD CONSTRAINT "bikes_for_sale_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mechanic_verifications" ADD CONSTRAINT "mechanic_verifications_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "bikes_for_sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mechanic_verifications" ADD CONSTRAINT "mechanic_verifications_verified_by_admin_id_fkey" FOREIGN KEY ("verified_by_admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shops" ADD CONSTRAINT "shops_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shops" ADD CONSTRAINT "shops_approved_by_admin_id_fkey" FOREIGN KEY ("approved_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spare_parts" ADD CONSTRAINT "spare_parts_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spare_parts" ADD CONSTRAINT "spare_parts_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spare_parts" ADD CONSTRAINT "spare_parts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "part_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "spare_parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "spare_parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

