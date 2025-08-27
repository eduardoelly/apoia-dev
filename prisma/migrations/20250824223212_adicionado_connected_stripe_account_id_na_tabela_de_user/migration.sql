/*
  Warnings:

  - A unique constraint covering the columns `[connectedStripeAccountId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "connectedStripeAccountId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_connectedStripeAccountId_key" ON "public"."User"("connectedStripeAccountId");
