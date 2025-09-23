-- CreateEnum
CREATE TYPE "public"."PublishStatus" AS ENUM ('UNLISTED', 'PUBLIC');

-- CreateTable
CREATE TABLE "public"."fundraising_settings" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "goal" DECIMAL(12,2),
    "publishStatus" "public"."PublishStatus" NOT NULL DEFAULT 'UNLISTED',
    "thankYouMessage" TEXT DEFAULT 'Thank you for your donation to our campaign! Your support makes a difference.',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fundraising_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."fundraising_widgets" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "embedId" TEXT NOT NULL,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fundraising_widgets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fundraising_settings_accountId_key" ON "public"."fundraising_settings"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "fundraising_widgets_embedId_key" ON "public"."fundraising_widgets"("embedId");

-- AddForeignKey
ALTER TABLE "public"."fundraising_settings" ADD CONSTRAINT "fundraising_settings_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."fundraising_widgets" ADD CONSTRAINT "fundraising_widgets_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
