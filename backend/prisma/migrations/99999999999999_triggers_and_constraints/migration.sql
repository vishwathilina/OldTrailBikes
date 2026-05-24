-- ─────────────────────────────────────────────────────────────────────────────
-- Post-init migration: triggers and DB-level constraints
--
-- 1. touch_updated_at()             — generic updated_at maintenance function
--    Applied to: appointments, bikes_for_sale, spare_parts
--
-- 2. set_mechanic_verified()        — flips bikes_for_sale.is_mechanic_verified
--    to TRUE when a mechanic_verifications row is INSERTed.
--    Makes the verified badge tamper-proof at the DB level regardless of how
--    data is accessed.
--
-- 3. CHECK constraints
--    • reviews: exactly one of (appointment_id, part_id) must be set, and the
--      target_type must agree with which column is populated.
--    • reviews: rating must be between 1 and 5 inclusive.
--    • spare_parts: stock_quantity must be >= 0.
--    • order_items: quantity must be >= 1.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Generic touch_updated_at trigger function ────────────────────────────

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and (re)create per-table triggers idempotently
DROP TRIGGER IF EXISTS trg_appointments_touch_updated_at ON appointments;
CREATE TRIGGER trg_appointments_touch_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_bikes_for_sale_touch_updated_at ON bikes_for_sale;
CREATE TRIGGER trg_bikes_for_sale_touch_updated_at
  BEFORE UPDATE ON bikes_for_sale
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_spare_parts_touch_updated_at ON spare_parts;
CREATE TRIGGER trg_spare_parts_touch_updated_at
  BEFORE UPDATE ON spare_parts
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

-- ─── 2. set_mechanic_verified — tamper-proof badge enforcement ───────────────

CREATE OR REPLACE FUNCTION set_mechanic_verified()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE bikes_for_sale
     SET is_mechanic_verified = TRUE,
         updated_at           = NOW()
   WHERE id = NEW.listing_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_mechanic_verified ON mechanic_verifications;
CREATE TRIGGER trg_set_mechanic_verified
  AFTER INSERT ON mechanic_verifications
  FOR EACH ROW
  EXECUTE FUNCTION set_mechanic_verified();

-- Symmetric guard: if a verification record is deleted, clear the flag too.
CREATE OR REPLACE FUNCTION clear_mechanic_verified()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE bikes_for_sale
     SET is_mechanic_verified = FALSE,
         updated_at           = NOW()
   WHERE id = OLD.listing_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clear_mechanic_verified ON mechanic_verifications;
CREATE TRIGGER trg_clear_mechanic_verified
  AFTER DELETE ON mechanic_verifications
  FOR EACH ROW
  EXECUTE FUNCTION clear_mechanic_verified();

-- ─── 3. DB-level integrity constraints ───────────────────────────────────────

-- Review must point to exactly one target, consistent with target_type.
ALTER TABLE reviews
  DROP CONSTRAINT IF EXISTS reviews_xor_target_check;
ALTER TABLE reviews
  ADD CONSTRAINT reviews_xor_target_check
  CHECK (
    (target_type = 'APPOINTMENT' AND appointment_id IS NOT NULL AND part_id IS NULL)
    OR
    (target_type = 'PART' AND part_id IS NOT NULL AND appointment_id IS NULL)
  );

-- Rating range 1..5
ALTER TABLE reviews
  DROP CONSTRAINT IF EXISTS reviews_rating_range_check;
ALTER TABLE reviews
  ADD CONSTRAINT reviews_rating_range_check
  CHECK (rating BETWEEN 1 AND 5);

-- Stock quantity must be non-negative
ALTER TABLE spare_parts
  DROP CONSTRAINT IF EXISTS spare_parts_stock_nonneg_check;
ALTER TABLE spare_parts
  ADD CONSTRAINT spare_parts_stock_nonneg_check
  CHECK (stock_quantity >= 0);

-- Order item quantity must be >= 1
ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_qty_pos_check;
ALTER TABLE order_items
  ADD CONSTRAINT order_items_qty_pos_check
  CHECK (quantity >= 1);

-- Commission rate must be 0..100
ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_commission_rate_range_check;
ALTER TABLE order_items
  ADD CONSTRAINT order_items_commission_rate_range_check
  CHECK (commission_rate >= 0 AND commission_rate <= 100);

ALTER TABLE shops
  DROP CONSTRAINT IF EXISTS shops_commission_rate_range_check;
ALTER TABLE shops
  ADD CONSTRAINT shops_commission_rate_range_check
  CHECK (commission_rate >= 0 AND commission_rate <= 100);
