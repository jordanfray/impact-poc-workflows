-- AlterEnum
ALTER TYPE "public"."TransactionType" ADD VALUE 'ACH_PAYMENT';

-- AlterTable
ALTER TABLE "public"."transactions" ADD COLUMN     "payeeId" TEXT;

-- CreateTable
CREATE TABLE "public"."payees" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT DEFAULT 'US',
    "achAccountNumber" TEXT,
    "achRoutingNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payees_userId_idx" ON "public"."payees"("userId");

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_payeeId_fkey" FOREIGN KEY ("payeeId") REFERENCES "public"."payees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
