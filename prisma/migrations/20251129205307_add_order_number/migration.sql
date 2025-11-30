-- AlterTable
ALTER TABLE "Order" ADD COLUMN "orderNumber" TEXT;

-- Generate unique orderNumbers for existing orders
-- Using a window function to create unique values based on ID
UPDATE "Order"
SET "orderNumber" = UPPER(
  SUBSTRING(
    MD5(CAST(id AS TEXT) || CAST(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) AS TEXT)),
    1,
    8
  )
)
WHERE "orderNumber" IS NULL;

-- Make orderNumber NOT NULL and add unique constraint
ALTER TABLE "Order"
ALTER COLUMN "orderNumber" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_orderNumber_idx" ON "Order"("orderNumber");
