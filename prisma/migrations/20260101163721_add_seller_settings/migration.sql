-- CreateTable
CREATE TABLE "SellerSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "acceptsHomeDelivery" BOOLEAN NOT NULL DEFAULT true,
    "acceptsPickup" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SellerSettings_userId_key" ON "SellerSettings"("userId");

-- CreateIndex
CREATE INDEX "SellerSettings_userId_idx" ON "SellerSettings"("userId");

-- AddForeignKey
ALTER TABLE "SellerSettings" ADD CONSTRAINT "SellerSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
