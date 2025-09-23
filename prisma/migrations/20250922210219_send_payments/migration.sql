/*
  Warnings:

  - You are about to drop the column `recipientId` on the `checks` table. All the data in the column will be lost.
  - You are about to drop the `recipients` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `payeeId` to the `checks` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."checks" DROP CONSTRAINT "checks_recipientId_fkey";

-- AlterTable
ALTER TABLE "public"."checks" DROP COLUMN "recipientId",
ADD COLUMN     "payeeId" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."recipients";

-- AddForeignKey
ALTER TABLE "public"."checks" ADD CONSTRAINT "checks_payeeId_fkey" FOREIGN KEY ("payeeId") REFERENCES "public"."payees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
