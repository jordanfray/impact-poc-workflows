-- AlterEnum
ALTER TYPE "public"."TransactionType" ADD VALUE 'TRANSFER';

-- AlterTable
ALTER TABLE "public"."transactions" ADD COLUMN     "transferFromAccountId" TEXT,
ADD COLUMN     "transferToAccountId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_transferFromAccountId_fkey" FOREIGN KEY ("transferFromAccountId") REFERENCES "public"."accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_transferToAccountId_fkey" FOREIGN KEY ("transferToAccountId") REFERENCES "public"."accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
