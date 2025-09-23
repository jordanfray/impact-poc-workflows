-- AlterTable
ALTER TABLE "public"."cards" ADD COLUMN     "allowedCategories" TEXT[],
ADD COLUMN     "dailyLimit" DECIMAL(12,2),
ADD COLUMN     "monthlyLimit" DECIMAL(12,2);
