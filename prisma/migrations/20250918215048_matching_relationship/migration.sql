-- CreateEnum
CREATE TYPE "public"."TransactionGroupPurpose" AS ENUM ('DONATION_MATCH');

-- CreateEnum
CREATE TYPE "public"."TransactionGroupRole" AS ENUM ('DONATION', 'MATCH_DEBIT', 'MATCH_CREDIT');

-- AlterTable
ALTER TABLE "public"."transactions" ADD COLUMN     "correlationId" TEXT,
ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "groupRole" "public"."TransactionGroupRole";

-- CreateTable
CREATE TABLE "public"."transaction_groups" (
    "id" TEXT NOT NULL,
    "purpose" "public"."TransactionGroupPurpose" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_groups_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."transaction_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
