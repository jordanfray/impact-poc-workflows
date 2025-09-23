-- AlterTable
ALTER TABLE "public"."fundraising_settings" ADD COLUMN     "matchingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "matchingFromAccountId" TEXT,
ADD COLUMN     "matchingPercent" INTEGER;
