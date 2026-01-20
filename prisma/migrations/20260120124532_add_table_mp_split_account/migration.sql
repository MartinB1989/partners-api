-- CreateTable
CREATE TABLE "MPSplitAccount" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scope" TEXT NOT NULL,
    "mpUserId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "liveMode" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MPSplitAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MPSplitAccount_userId_key" ON "MPSplitAccount"("userId");

-- CreateIndex
CREATE INDEX "MPSplitAccount_userId_idx" ON "MPSplitAccount"("userId");

-- CreateIndex
CREATE INDEX "MPSplitAccount_mpUserId_idx" ON "MPSplitAccount"("mpUserId");

-- AddForeignKey
ALTER TABLE "MPSplitAccount" ADD CONSTRAINT "MPSplitAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
