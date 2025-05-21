-- AlterTable
ALTER TABLE "Address" ALTER COLUMN "country" SET DEFAULT 'Argentina';

-- CreateTable
CREATE TABLE "PickupAddress" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Argentina',
    "additionalInfo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PickupAddress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PickupAddress_userId_idx" ON "PickupAddress"("userId");

-- AddForeignKey
ALTER TABLE "PickupAddress" ADD CONSTRAINT "PickupAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
